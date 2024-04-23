import * as THREE from "three";
import * as CANNON from "cannon-es";
import CannonDebugger from "cannon-es-debugger";
import Experience from "../experience";

export default class Physics {
  experience: Experience;
  scene?: THREE.Scene;

  world: CANNON.World;
  worldDebug?: { update: () => void };

  constructor() {
    this.experience = Experience.getInstance();
    this.scene = this.experience.scene;

    this.world = new CANNON.World();

    // Sweep and prune broadphase, enable sleeping bodies
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    // this.world.allowSleep = true;
    this.world.gravity.set(0, -9.82, 0);

    // Debugger
    if (this.experience.debug?.isActive) {
      this.worldDebug = CannonDebugger(this.scene!, this.world!);
    }

    // Contact material
    const defaultMaterial = new CANNON.Material("default");
    const defaultContactMaterial = new CANNON.ContactMaterial(
      defaultMaterial,
      defaultMaterial,
      {
        friction: 0,
        restitution: 0.7,
      }
    );
    this.world.defaultContactMaterial = defaultContactMaterial;
  }

  update() {
    this.world.step(1 / 60, this.experience.time?.delta, 3);

    if (this.experience.debug?.isActive) {
      this.worldDebug?.update();
    }
  }
}
