import * as THREE from "three";
import RAPIER from "@dimforge/rapier2d-compat";
import dat from "dat.gui";

// Read-only view of Physics this module needs — the scene it draws into and the
// Rapier world it walks colliders from. PhysicsDebug owns its own wireframe mesh;
// Physics carries no debug fields.
type Physics = {
  Scene: THREE.Scene;
  World: {
    colliders: { len: () => number };
    forEachCollider: (cb: (collider: RAPIER.Collider) => void) => void;
  };
};

// Renders Rapier collider shapes as wireframes, colored by entity type via the
// game-injected palette (SetTypeColors); engine stays type-blind, unmapped = gray.
// Owns its LineSegments mesh: adds/removes it from the scene and disposes it.
export default class PhysicsDebug {
  private static readonly DEFAULT_COLOR = new THREE.Color("#777777"); // gray fallback for unmapped entity types
  private static readonly CIRCLE_SEGMENTS = 20; // arc segments per ball/capsule outline

  private mesh?: THREE.LineSegments<
    THREE.BufferGeometry,
    THREE.LineBasicMaterial
  >;
  private scene?: THREE.Scene;

  // EntityType string -> color, injected by the game (D3: engine stays type-blind).
  private typeColors = new Map<string, THREE.Color>();

  // Counters surfaced in the dat.GUI folder (bound by reference so .listen() updates).
  private counts = { renderObjectCount: 0, physicsObjectCount: 0 };

  // --- Setup ---

  // Inject the game's entity-type -> color palette (see game/config/debugColors).
  public SetTypeColors(colors: Map<string, THREE.Color>) {
    this.typeColors = colors;
  }

  // Create the wireframe mesh and the dat.GUI object counters.
  public Init(ui: dat.GUI, physics: Physics) {
    this.counts.renderObjectCount = 0;
    this.counts.physicsObjectCount = 0;

    this.scene = physics.Scene;

    this.mesh = new THREE.LineSegments(
      new THREE.BufferGeometry(),
      // vertexColors draws each segment with the per-vertex RGBA we build in
      // Update() — one color per collider, keyed by its entity type.
      new THREE.LineBasicMaterial({ vertexColors: true })
    );
    this.mesh.frustumCulled = false;
    this.scene.add(this.mesh);

    const folder = ui.addFolder("🌍 World Debug");
    folder.open();
    folder.add(this.counts, "renderObjectCount").name("Render Objects").listen();
    folder.add(this.counts, "physicsObjectCount").name("Physics Objects").listen();
  }

  // --- Per-frame ---

  // Per-frame: recount scene/colliders, then rebuild the wireframe.
  public Update(physics: Physics) {
    let entityCount = 0;
    physics.Scene.traverse(() => entityCount++);
    this.counts.renderObjectCount = entityCount;
    this.counts.physicsObjectCount = physics.World.colliders.len();

    // Rebuild the wireframe each frame: one colored outline per collider, colored
    // by its entity type via the game-injected palette. (Replaces Rapier's
    // built-in debugRender, whose palette only told sensors from solids.)
    const positions: number[] = [];
    const colors: number[] = [];

    physics.World.forEachCollider((collider) => {
      const userData = collider.parent()?.userData as
        | { type?: string }
        | undefined;
      // Pick the type's color from the palette; gray fallback for unmapped/missing types.
      let typeName = "";
      if (userData && userData.type) {
        typeName = userData.type;
      }
      let color = this.typeColors.get(typeName);
      if (!color) {
        color = PhysicsDebug.DEFAULT_COLOR;
      }
      this.appendColliderOutline(collider, color, positions, colors);
    });

    const geometry = this.mesh!.geometry;
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(positions), 2)
    );
    geometry.setAttribute(
      "color",
      new THREE.BufferAttribute(new Float32Array(colors), 4)
    );
  }

  // Append one collider's outline (cuboid/ball/capsule) to the shared position +
  // color buffers, in world pose. Uses Rapier 0.14 shape accessors (pinned, VERSION.md).
  private appendColliderOutline(
    collider: RAPIER.Collider,
    color: THREE.Color,
    positions: number[],
    colors: number[]
  ) {
    const t = collider.translation();
    const angle = collider.rotation();
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    // One segment from local (ax,ay)->(bx,by), rotated by `angle` + translated to
    // the collider's world position; `color` on both endpoints.
    const seg = (ax: number, ay: number, bx: number, by: number) => {
      positions.push(t.x + ax * cos - ay * sin, t.y + ax * sin + ay * cos);
      positions.push(t.x + bx * cos - by * sin, t.y + bx * sin + by * cos);
      colors.push(color.r, color.g, color.b, 1, color.r, color.g, color.b, 1);
    };

    switch (collider.shapeType()) {
      case RAPIER.ShapeType.Cuboid: {
        const h = collider.halfExtents();
        seg(-h.x, -h.y, h.x, -h.y);
        seg(h.x, -h.y, h.x, h.y);
        seg(h.x, h.y, -h.x, h.y);
        seg(-h.x, h.y, -h.x, -h.y);
        break;
      }
      case RAPIER.ShapeType.Ball: {
        const r = collider.radius();
        const n = PhysicsDebug.CIRCLE_SEGMENTS;
        for (let i = 0; i < n; i++) {
          const a0 = (i / n) * Math.PI * 2;
          const a1 = ((i + 1) / n) * Math.PI * 2;
          seg(
            Math.cos(a0) * r,
            Math.sin(a0) * r,
            Math.cos(a1) * r,
            Math.sin(a1) * r
          );
        }
        break;
      }
      case RAPIER.ShapeType.Capsule: {
        const r = collider.radius();
        const hh = collider.halfHeight();
        // Straight sides (capsule axis is local Y).
        seg(-r, -hh, -r, hh);
        seg(r, -hh, r, hh);
        // Rounded caps: top semicircle over +hh, bottom semicircle under -hh.
        const n = Math.max(2, Math.floor(PhysicsDebug.CIRCLE_SEGMENTS / 2));
        for (let i = 0; i < n; i++) {
          const a0 = (i / n) * Math.PI;
          const a1 = ((i + 1) / n) * Math.PI;
          seg(
            Math.cos(a0) * r,
            hh + Math.sin(a0) * r,
            Math.cos(a1) * r,
            hh + Math.sin(a1) * r
          );
          seg(
            -Math.cos(a0) * r,
            -hh - Math.sin(a0) * r,
            -Math.cos(a1) * r,
            -hh - Math.sin(a1) * r
          );
        }
        break;
      }
    }
  }

  // --- Teardown ---

  // Remove and dispose the wireframe mesh.
  public Destroy() {
    if (this.mesh) {
      this.scene?.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
      this.mesh = undefined;
    }
  }
}
