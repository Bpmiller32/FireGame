import * as THREE from "three";
import dat from "dat.gui";

// Read-only view of Physics this module needs — the scene it draws into and the
// Rapier world it reads collider counts + debug-render buffers from. PhysicsDebug
// owns its own wireframe mesh; Physics carries no debug fields.
type Physics = {
  scene: THREE.Scene;
  world: {
    colliders: { len: () => number };
    debugRender: () => { vertices: Float32Array };
  };
};

/**
 * Renders Rapier physics collision shapes as green wireframes and tracks
 * render/physics object counts in the debug GUI. Owns its own LineSegments mesh,
 * adds/removes it from the scene, and disposes it.
 */
export default class PhysicsDebug {
  private mesh?: THREE.LineSegments<
    THREE.BufferGeometry,
    THREE.LineBasicMaterial
  >;
  private scene?: THREE.Scene;

  // Counters surfaced in the dat.GUI folder (bound by reference so .listen() updates).
  private counts = { renderObjectCount: 0, physicsObjectCount: 0 };

  public init(ui: dat.GUI, physics: Physics) {
    this.counts.renderObjectCount = 0;
    this.counts.physicsObjectCount = 0;

    this.scene = physics.scene;

    this.mesh = new THREE.LineSegments(
      new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({ color: "lime" })
    );
    this.mesh.frustumCulled = false;
    this.scene.add(this.mesh);

    const folder = ui.addFolder("🌍 World Debug");
    folder.open();
    folder.add(this.counts, "renderObjectCount").name("Render Objects").listen();
    folder.add(this.counts, "physicsObjectCount").name("Physics Objects").listen();
  }

  public update(physics: Physics) {
    let entityCount = 0;
    physics.scene.traverse(() => entityCount++);
    this.counts.renderObjectCount = entityCount;
    this.counts.physicsObjectCount = physics.world.colliders.len();

    const { vertices } = physics.world.debugRender();
    this.mesh!.geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(vertices, 2)
    );
    this.mesh!.visible = true;
  }

  public destroy() {
    if (this.mesh) {
      this.scene?.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
      this.mesh = undefined;
    }
  }
}
