import * as THREE from "three";
import dat from "dat.gui";

// Forward type — Physics imports Debug which imports PhysicsDebug, creating a cycle.
// Using a structural type here avoids the circular import while preserving safety.
type Physics = {
  scene: THREE.Scene;
  world: {
    colliders: { len: () => number };
    debugRender: () => { vertices: Float32Array };
  };
  mesh?: THREE.LineSegments;
  renderObjectCount: number;
  physicsObjectCount: number;
};

/**
 * Renders Rapier physics collision shapes as green wireframes and tracks
 * render/physics object counts in the debug GUI.
 */
export default class PhysicsDebug {
  public init(ui: dat.GUI, physics: Physics) {
    physics.renderObjectCount = 0;
    physics.physicsObjectCount = 0;

    physics.mesh = new THREE.LineSegments(
      new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({ color: "lime" })
    );
    physics.mesh.frustumCulled = false;
    physics.scene.add(physics.mesh);

    const folder = ui.addFolder("🌍 World Debug");
    folder.open();
    folder.add(physics, "renderObjectCount").name("Render Objects").listen();
    folder.add(physics, "physicsObjectCount").name("Physics Objects").listen();
  }

  public update(physics: Physics) {
    let entityCount = 0;
    physics.scene.traverse(() => entityCount++);
    physics.renderObjectCount = entityCount;
    physics.physicsObjectCount = physics.world.colliders.len();

    const { vertices } = physics.world.debugRender();
    physics.mesh!.geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(vertices, 2)
    );
    physics.mesh!.visible = true;
  }
}
