/* -------------------------------------------------------------------------- */
/*          2d Physics world that meshes are bound to, using Rapier2d         */
/* -------------------------------------------------------------------------- */

import * as THREE from "three";
import Experience from "./experience";
import RAPIER from "@dimforge/rapier2d";
import UserData from "./utils/types/userData";
import Player from "./world/player/player";

export default class Physics {
  private experience!: Experience;
  private scene!: THREE.Scene;

  private mesh?: THREE.LineSegments<
    THREE.BufferGeometry<THREE.NormalBufferAttributes>,
    THREE.LineBasicMaterial,
    THREE.Object3DEventMap
  >;

  private eventQueue: RAPIER.EventQueue = new RAPIER.EventQueue(true);
  public player!: Player;

  public world!: RAPIER.World;
  public isPaused!: boolean;

  // Replacement constructor to accomodate async
  public async configure() {
    this.experience = Experience.getInstance();
    this.scene = this.experience.scene;

    const rapier = await import("@dimforge/rapier2d");
    this.world = new rapier.World({ x: 0.0, y: -9.81 });
    this.isPaused = false;

    // Set debug mesh if nessasary
    if (this.experience.debug.isActive) {
      this.mesh = new THREE.LineSegments(
        new THREE.BufferGeometry(),
        new THREE.LineBasicMaterial({ color: "lime" })
      );
      this.mesh.frustumCulled = false;
      this.scene.add(this.mesh);
    }
  }

  public update() {
    if (this.isPaused) {
      return;
    }

    // Set the physics simulation timestep, advance the simulation one step
    this.world.timestep = Math.min(this.experience.time.delta, 0.1);
    this.world.step(this.eventQueue);

    // Experimentation

    // // Drain the eventQueue
    // this.eventQueue.drainCollisionEvents(
    //   (
    //     handle1: RAPIER.ColliderHandle,
    //     handle2: RAPIER.ColliderHandle,
    //     started: boolean
    //   ) => {
    //     const physicsBody1 = (
    //       this.world.getCollider(handle1).parent()?.userData as UserData
    //     ).name;
    //     const physicsBody2 = (
    //       this.world.getCollider(handle2).parent()?.userData as UserData
    //     ).name;

    //     console.log("physicsBody1: ", physicsBody1);
    //     console.log("physicsBody2: ", physicsBody2);
    //     console.log("started: ", started);
    //     console.log(" ");

    //     if (
    //       this.player &&
    //       (physicsBody1 == "Player" || physicsBody2 == "Player") &&
    //       started == true
    //     ) {
    //       this.player.isTouching.ground = true;
    //     }

    //     if (
    //       this.player &&
    //       (physicsBody1 == "Player" || physicsBody2 == "Player") &&
    //       started == false
    //     ) {
    //       this.player.isTouching.ground = false;
    //     }
    //   }
    // );

    // this.eventQueue.drainContactForceEvents((event) => {
    //   const physicsBody1 = (
    //     this.world.getCollider(event.collider1()).parent()?.userData as UserData
    //   ).name;
    //   const physicsBody2 = (
    //     this.world.getCollider(event.collider2()).parent()?.userData as UserData
    //   ).name;

    //   console.log("physicsBody1: ", physicsBody1);
    //   console.log("physicsBody2: ", physicsBody2);
    // });

    if (this.experience.debug.isActive) {
      // Extracts just the verticies out of the physics debug render
      const { vertices } = this.world.debugRender();

      // Sends those verticies to the vertex shader's position attribute
      this.mesh!.geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(vertices, 2)
      );
      this.mesh!.visible = true;
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

    // Nullify all properties to release references
    this.experience = null as any;
    this.scene = null as any;
    this.mesh = null as any;
    this.world = null as any;

    this.isPaused = null as any;
  }
}
