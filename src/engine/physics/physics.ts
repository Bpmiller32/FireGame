// 2d Physics world that meshes are bound to, using Rapier2d

import * as THREE from "three";
import Experience from "../core/experience";
import RAPIER from "@dimforge/rapier2d-compat";
import Debug from "../debug/debug";
import GameObject from "../entities/gameObject";
import ContactRegistry from "../entities/contactRegistry";

export default class Physics {
  private experience!: Experience; // engine singleton back-reference
  private debug?: Debug; // optional debug overlay helper
  public Scene!: THREE.Scene; // Three.js scene physics meshes bind to

  public World!: RAPIER.World; // Rapier 2d physics world
  public EventQueue!: RAPIER.EventQueue; // per-step collision event buffer
  public IsPaused!: boolean; // when true, Update() skips the step

  // Declarative "when an A contacts a B, run this" table. The game fills it; the
  // engine just dispatches contact events into it (see handleCollisionEvents).
  public Contacts!: ContactRegistry;

  // GameObject registration system - maps collider handles to GameObjects
  private gameObjectRegistry!: Map<number, GameObject>;

  // --- Setup ---

  // Replacement constructor to accommodate async
  public async Configure() {
    this.experience = Experience.GetInstance();
    this.Scene = this.experience.Scene;

    await RAPIER.init();
    this.World = new RAPIER.World({ x: 0.0, y: -9.81 });
    this.EventQueue = new RAPIER.EventQueue(true);
    this.IsPaused = false;

    // Initialize the declarative contact-rule table (game fills it at startup)
    this.Contacts = new ContactRegistry();

    // Initialize GameObject registry for collision event mapping
    this.gameObjectRegistry = new Map<number, GameObject>();

    // Debug
    if (this.experience.Debug.IsActive) {
      this.debug = this.experience.Debug;
      this.debug.InitPhysicsDebug(this);
    }
  }

  // --- Commands ---

  // Register a GameObject so it can receive collision/sensor callbacks
  // Call this when a GameObject's physics body is created
  public RegisterGameObject(gameObject: GameObject) {
    if (!gameObject.PhysicsBody) {
      console.warn("Cannot register GameObject without a physics body");
      return;
    }

    // Register all colliders for this rigid body
    const numColliders = gameObject.PhysicsBody.numColliders();
    for (let i = 0; i < numColliders; i++) {
      const collider = gameObject.PhysicsBody.collider(i);
      this.gameObjectRegistry.set(collider.handle, gameObject);
    }
  }

  // Unregister a GameObject when it's destroyed
  // Call this during GameObject destruction
  public UnregisterGameObject(gameObject: GameObject) {
    if (!gameObject.PhysicsBody) {
      return;
    }

    // Remove all colliders for this rigid body from registry
    const numColliders = gameObject.PhysicsBody.numColliders();
    for (let i = 0; i < numColliders; i++) {
      const collider = gameObject.PhysicsBody.collider(i);
      this.gameObjectRegistry.delete(collider.handle);
    }
  }

  // Resolve a collider to its owning GameObject (or undefined if unregistered).
  // Lets a kinematic character controller feed its OWN contacts into the contact
  // registry: a kinematic body keeps a skin gap from solids it moves into, so
  // Rapier emits no collision event for it as the mover — but the controller's
  // computed collisions still report what it touched. The game can resolve those
  // to GameObjects and Dispatch them, so the same contact rules fire either way.
  public GetGameObjectFromCollider(
    collider: RAPIER.Collider
  ): GameObject | undefined {
    return this.gameObjectRegistry.get(collider.handle);
  }

  // Pause or resume the physics simulation. The game decides WHEN to call this
  // (e.g. on game over / reset); the engine just obeys — it names no game events.
  public SetPaused(paused: boolean): void {
    this.IsPaused = paused;
  }

  // --- Per-frame ---

  // Process collision events (handles both solid collisions and sensor intersections)
  // In Rapier, sensors trigger collision events - we check the sensor flag to route appropriately
  // Called automatically during physics update
  private handleCollisionEvents() {
    this.EventQueue.drainCollisionEvents((handle1, handle2, started) => {
      const collider1 = this.World.getCollider(handle1);
      const collider2 = this.World.getCollider(handle2);

      // Skip if colliders don't exist
      if (!collider1 || !collider2) {
        return;
      }

      const gameObject1 = this.GetGameObjectFromCollider(collider1);
      const gameObject2 = this.GetGameObjectFromCollider(collider2);

      // Skip if either GameObject is not registered or is being destroyed
      if (
        !gameObject1 ||
        !gameObject2 ||
        gameObject1.IsBeingDestroyed ||
        gameObject2.IsBeingDestroyed
      ) {
        return;
      }

      // Check if either collider is a sensor to route to appropriate callbacks
      const isSensor1 = collider1.isSensor();
      const isSensor2 = collider2.isSensor();
      const isSensorEvent = isSensor1 || isSensor2;

      if (isSensorEvent) {
        // This is a sensor intersection event
        if (started) {
          // Sensor intersection started - call onSensorEnter callbacks
          if (isSensor1 && gameObject1.OnSensorEnter) {
            gameObject1.OnSensorEnter(gameObject2);
          }
          if (isSensor2 && gameObject2.OnSensorEnter) {
            gameObject2.OnSensorEnter(gameObject1);
          }

          // Fire any matching declarative contact rules (two-sided internally)
          this.Contacts.Dispatch("sensorEnter", gameObject1, gameObject2);

          // Log sensor event if debug is enabled
          if (this.debug && this.debug.LogSensors) {
            this.debug.LogSensorEvent(gameObject1, gameObject2, "enter");
          }
        } else {
          // Sensor intersection ended - call onSensorExit callbacks
          if (isSensor1 && gameObject1.OnSensorExit) {
            gameObject1.OnSensorExit(gameObject2);
          }
          if (isSensor2 && gameObject2.OnSensorExit) {
            gameObject2.OnSensorExit(gameObject1);
          }

          // Fire any matching declarative contact rules (two-sided internally)
          this.Contacts.Dispatch("sensorExit", gameObject1, gameObject2);

          // Log sensor event if debug is enabled
          if (this.debug && this.debug.LogSensors) {
            this.debug.LogSensorEvent(gameObject1, gameObject2, "exit");
          }
        }
      } else {
        // This is a solid collision event
        if (started) {
          // Collision started - call onCollisionEnter callbacks
          if (gameObject1.OnCollisionEnter) {
            gameObject1.OnCollisionEnter(gameObject2);
          }
          if (gameObject2.OnCollisionEnter) {
            gameObject2.OnCollisionEnter(gameObject1);
          }

          // Fire any matching declarative contact rules (two-sided internally)
          this.Contacts.Dispatch("enter", gameObject1, gameObject2);

          // Log collision event if debug is enabled
          if (this.debug && this.debug.LogCollisions) {
            this.debug.LogCollisionEvent(gameObject1, gameObject2, "enter");
          }
        } else {
          // Collision ended - call onCollisionExit callbacks
          if (gameObject1.OnCollisionExit) {
            gameObject1.OnCollisionExit(gameObject2);
          }
          if (gameObject2.OnCollisionExit) {
            gameObject2.OnCollisionExit(gameObject1);
          }

          // Fire any matching declarative contact rules (two-sided internally)
          this.Contacts.Dispatch("exit", gameObject1, gameObject2);

          // Log collision event if debug is enabled
          if (this.debug && this.debug.LogCollisions) {
            this.debug.LogCollisionEvent(gameObject1, gameObject2, "exit");
          }
        }
      }
    });
  }

  public Update() {
    if (this.IsPaused) {
      return;
    }

    // Time.Delta is the FIXED simulation timestep (set by the frame loop), so each
    // physics step is constant and reproducible. No clamp needed — the frame loop
    // bounds how often we step (the old Math.min(..., 0.1) was dead code anyway,
    // since Time.Delta was already capped well below 0.1).
    this.World.timestep = this.experience.Time.Delta;
    this.World.step(this.EventQueue);

    // Process collision and sensor events
    // Sensors are routed through collision events by checking the sensor flag
    this.handleCollisionEvents();

    // Run debug physics logic if needed
    if (this.debug) {
      this.debug.UpdatePhysicsDebug(this);
    }
  }

  // --- Teardown ---

  public Destroy() {
    // Dispose of the Rapier world (guarded so a Destroy after a half-failed
    // Configure — e.g. RAPIER.init() threw before World was built — doesn't cascade).
    this.World?.free();

    // Tear down the debug wireframe (PhysicsDebug owns its own mesh)
    if (this.debug) {
      this.debug.DestroyPhysicsDebug();
    }
  }
}
