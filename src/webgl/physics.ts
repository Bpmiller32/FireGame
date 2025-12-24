/* -------------------------------------------------------------------------- */
/*          2d Physics world that meshes are bound to, using Rapier2d         */
/* -------------------------------------------------------------------------- */

import * as THREE from "three";
import Experience from "./experience";
import RAPIER from "@dimforge/rapier2d-compat";
import Debug from "./utils/debug";
import { debugPhysics, debugPhysicsUpdate } from "./utils/debug/debugPhysics";
import Emitter from "./utils/eventEmitter";
import GameObject from "./world/gameComponents/gameObject";

export default class Physics {
  private experience!: Experience;
  private debug?: Debug;
  public scene!: THREE.Scene;

  public mesh?: THREE.LineSegments<
    THREE.BufferGeometry<THREE.NormalBufferAttributes>,
    THREE.LineBasicMaterial,
    THREE.Object3DEventMap
  >;

  public world!: RAPIER.World;
  public eventQueue!: RAPIER.EventQueue;
  public isPaused!: boolean;

  // GameObject registration system - maps collider handles to GameObjects
  private gameObjectRegistry: Map<number, GameObject>;

  public renderObjectCount!: number;
  public phyiscsObjectCount!: number;
  public activeCollisionCount!: number;
  public activeSensorCount!: number;

  // Replacement constructor to accomodate async
  public async configure() {
    this.experience = Experience.getInstance();
    this.scene = this.experience.scene;

    await RAPIER.init();
    this.world = new RAPIER.World({ x: 0.0, y: -9.81 });
    this.eventQueue = new RAPIER.EventQueue(true);
    this.isPaused = false;

    // Initialize GameObject registry for collision event mapping
    this.gameObjectRegistry = new Map<number, GameObject>();

    // Initialize debug counters
    this.activeCollisionCount = 0;
    this.activeSensorCount = 0;

    // Events
    Emitter.on("gameStart", () => {
      this.isPaused = false;
    });
    Emitter.on("gameOver", () => {
      this.isPaused = true;
    });
    Emitter.on("gameReset", () => {
      this.isPaused = false;
    });

    // Debug
    if (this.experience.debug.isActive) {
      this.debug = this.experience.debug;
      debugPhysics(this, this.debug);
    }
  }

  /**
   * Register a GameObject so it can receive collision/sensor callbacks
   * Call this when a GameObject's physics body is created
   */
  public registerGameObject(gameObject: GameObject) {
    if (!gameObject.physicsBody) {
      console.warn("Cannot register GameObject without a physics body");
      return;
    }

    // Register all colliders for this rigid body
    const numColliders = gameObject.physicsBody.numColliders();
    for (let i = 0; i < numColliders; i++) {
      const collider = gameObject.physicsBody.collider(i);
      this.gameObjectRegistry.set(collider.handle, gameObject);
    }
  }

  /**
   * Unregister a GameObject when it's destroyed
   * Call this during GameObject destruction
   */
  public unregisterGameObject(gameObject: GameObject) {
    if (!gameObject.physicsBody) {
      return;
    }

    // Remove all colliders for this rigid body from registry
    const numColliders = gameObject.physicsBody.numColliders();
    for (let i = 0; i < numColliders; i++) {
      const collider = gameObject.physicsBody.collider(i);
      this.gameObjectRegistry.delete(collider.handle);
    }
  }

  /**
   * Get the GameObject associated with a collider handle
   * Returns undefined if not found
   */
  private getGameObject(colliderHandle: number): GameObject | undefined {
    return this.gameObjectRegistry.get(colliderHandle);
  }

  /**
   * Process collision events (handles both solid collisions and sensor intersections)
   * In Rapier, sensors trigger collision events - we check the sensor flag to route appropriately
   * Called automatically during physics update
   */
  private handleCollisionEvents() {
    this.activeCollisionCount = 0;
    this.activeSensorCount = 0;

    this.eventQueue.drainCollisionEvents((handle1, handle2, started) => {
      const collider1 = this.world.getCollider(handle1);
      const collider2 = this.world.getCollider(handle2);

      // Skip if colliders don't exist
      if (!collider1 || !collider2) {
        return;
      }

      const gameObject1 = this.getGameObject(handle1);
      const gameObject2 = this.getGameObject(handle2);

      // Skip if either GameObject is not registered or is being destroyed
      if (
        !gameObject1 ||
        !gameObject2 ||
        gameObject1.isBeingDestroyed ||
        gameObject2.isBeingDestroyed
      ) {
        return;
      }

      // Check if either collider is a sensor to route to appropriate callbacks
      const isSensor1 = collider1.isSensor();
      const isSensor2 = collider2.isSensor();
      const isSensorEvent = isSensor1 || isSensor2;

      if (isSensorEvent) {
        // This is a sensor intersection event
        this.activeSensorCount++;

        if (started) {
          // Sensor intersection started - call onSensorEnter callbacks
          if (isSensor1 && gameObject1.onSensorEnter) {
            gameObject1.onSensorEnter(gameObject2);
          }
          if (isSensor2 && gameObject2.onSensorEnter) {
            gameObject2.onSensorEnter(gameObject1);
          }

          // Log sensor event if debug is enabled
          if (this.debug && this.debug.logSensors) {
            this.debug.logSensorEvent(gameObject1, gameObject2, "enter");
          }
        } else {
          // Sensor intersection ended - call onSensorExit callbacks
          if (isSensor1 && gameObject1.onSensorExit) {
            gameObject1.onSensorExit(gameObject2);
          }
          if (isSensor2 && gameObject2.onSensorExit) {
            gameObject2.onSensorExit(gameObject1);
          }

          // Log sensor event if debug is enabled
          if (this.debug && this.debug.logSensors) {
            this.debug.logSensorEvent(gameObject1, gameObject2, "exit");
          }
        }
      } else {
        // This is a solid collision event
        this.activeCollisionCount++;

        if (started) {
          // Collision started - call onCollisionEnter callbacks
          if (gameObject1.onCollisionEnter) {
            gameObject1.onCollisionEnter(gameObject2);
          }
          if (gameObject2.onCollisionEnter) {
            gameObject2.onCollisionEnter(gameObject1);
          }

          // Log collision event if debug is enabled
          if (this.debug && this.debug.logCollisions) {
            this.debug.logCollisionEvent(gameObject1, gameObject2, "enter");
          }
        } else {
          // Collision ended - call onCollisionExit callbacks
          if (gameObject1.onCollisionExit) {
            gameObject1.onCollisionExit(gameObject2);
          }
          if (gameObject2.onCollisionExit) {
            gameObject2.onCollisionExit(gameObject1);
          }

          // Log collision event if debug is enabled
          if (this.debug && this.debug.logCollisions) {
            this.debug.logCollisionEvent(gameObject1, gameObject2, "exit");
          }
        }
      }
    });
  }

  /**
   * Process sensor/trigger events (sensor zone intersections)
   * Called automatically during physics update
   * Note: In Rapier, sensors are detected through collision events by checking the sensor flag
   */
  private handleIntersectionEvents() {
    this.activeSensorCount = 0;

    // In Rapier, sensor intersections are handled in the collision events
    // We check if either collider is a sensor and route to the appropriate callbacks
    // This method is kept for consistency but the actual logic is in handleCollisionEvents
  }

  public update() {
    if (this.isPaused) {
      return;
    }

    // Set the physics simulation timestep, advance the simulation one step
    this.world.timestep = Math.min(this.experience.time.delta, 0.1);
    this.world.step(this.eventQueue);

    // Process collision and sensor events
    this.handleCollisionEvents();
    this.handleIntersectionEvents();

    // Run debug physics logic if needed
    if (this.debug) {
      debugPhysicsUpdate(this);
    }
  }

  public destroy() {
    // Dispose of the Rapier world
    this.world.free();

    // Dispose of the debug mesh if it exists
    if (this.mesh) {
      // Remove the mesh from the scene
      this.scene.remove(this.mesh);

      // Dispose of the geometry and material
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
    }
  }
}
