import * as THREE from "three";
import Physics from "../../physics";
import Debug from "../debug";

export const debugPhysics = (physics: Physics, debug: Debug) => {
  // Initialize debug variables
  physics.renderObjectCount = 0;
  physics.phyiscsObjectCount = 0;

  // Set debug mesh, add to scene
  physics.mesh = new THREE.LineSegments(
    new THREE.BufferGeometry(),
    new THREE.LineBasicMaterial({ color: "lime" })
  );
  physics.mesh.frustumCulled = false;
  physics.scene.add(physics.mesh);

  // Debug gui
  const worldDebug = debug.ui?.addFolder("worldDebug");
  // worldDebug?.open();
  worldDebug
    ?.add(physics, "renderObjectCount")
    .name("# of render entities")
    .listen();
  worldDebug
    ?.add(physics, "phyiscsObjectCount")
    .name("# of physics entities")
    .listen();
};

export const debugPhysicsUpdate = (physics: Physics) => {
  // Update render object count
  let entityCount = 0;

  physics.scene.traverse(() => {
    entityCount++;
  });

  physics.renderObjectCount = entityCount;

  // Update physics object count
  physics.phyiscsObjectCount = physics.world.colliders.len();

  // Extracts just the verticies out of the physics debug render
  const { vertices } = physics.world.debugRender();

  // Sends those verticies to the vertex shader's position attribute
  physics.mesh!.geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(vertices, 2)
  );
  physics.mesh!.visible = true;
};
