import * as THREE from "three";
import dat from "dat.gui";

// Read-only view of Physics this module needs — the scene it draws into and the
// Rapier world it reads collider counts + debug-render buffers from. PhysicsDebug
// owns its own wireframe mesh; Physics carries no debug fields.
type Physics = {
  Scene: THREE.Scene;
  World: {
    colliders: { len: () => number };
    debugRender: () => { vertices: Float32Array; colors: Float32Array };
  };
};

/**
 * Renders Rapier physics collision shapes as color-coded wireframes (using
 * Rapier's own per-collider debug colors — sensors vs solids differ) and tracks
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

  public Init(ui: dat.GUI, physics: Physics) {
    this.counts.renderObjectCount = 0;
    this.counts.physicsObjectCount = 0;

    this.scene = physics.Scene;

    this.mesh = new THREE.LineSegments(
      new THREE.BufferGeometry(),
      // vertexColors draws each segment with the per-vertex RGBA Rapier hands us
      // in debugRender().colors, so colliders show in Rapier's own debug colors.
      new THREE.LineBasicMaterial({ vertexColors: true })
    );
    this.mesh.frustumCulled = false;
    this.scene.add(this.mesh);

    const folder = ui.addFolder("🌍 World Debug");
    folder.open();
    folder.add(this.counts, "renderObjectCount").name("Render Objects").listen();
    folder.add(this.counts, "physicsObjectCount").name("Physics Objects").listen();
  }

  public Update(physics: Physics) {
    let entityCount = 0;
    physics.Scene.traverse(() => entityCount++);
    this.counts.renderObjectCount = entityCount;
    this.counts.physicsObjectCount = physics.World.colliders.len();

    const { vertices, colors } = physics.World.debugRender();
    this.mesh!.geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(vertices, 2)
    );
    this.mesh!.geometry.setAttribute(
      "color",
      new THREE.BufferAttribute(colors, 4)
    );
    this.mesh!.visible = true;
  }

  public Destroy() {
    if (this.mesh) {
      this.scene?.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
      this.mesh = undefined;
    }
  }
}
