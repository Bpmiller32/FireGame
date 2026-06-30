import * as THREE from "three";

// Debug-only gizmos for the level's INVISIBLE marker nodes (EnemySpawn + the Waypoint path). Those nodes
// carry no collider, so the physics wireframe pass never draws them — this fills that gap. Rendered as one
// flat LineSegments overlay in the 2D XY plane (same look as the physics wireframes), with depthTest off so
// it always reads on top. Built on level load, cleared on unload; markers are static so there's no per-frame work.
type Vec = { x: number; y: number };

export default class LevelMarkers {
  private static readonly SPAWN_COLOR = new THREE.Color("#ff3df0"); // magenta — barrel origin
  private static readonly PATH_COLOR = new THREE.Color("#33ddff"); // cyan — waypoint path + mid nodes
  private static readonly START_COLOR = new THREE.Color("#41f06a"); // green — first waypoint
  private static readonly END_COLOR = new THREE.Color("#ff5151"); // red — last waypoint
  private static readonly NODE_R = 0.6; // marker glyph radius
  private static readonly ARROW = 0.7; // arrowhead size on path segments

  private scene: THREE.Scene;
  private mesh?: THREE.LineSegments<
    THREE.BufferGeometry,
    THREE.LineBasicMaterial
  >;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  // --- Commands ---

  // Rebuild the gizmo from the current markers (clears any previous one first).
  public Rebuild(spawnPoint: Vec | undefined, waypoints: Vec[]) {
    this.Clear();

    const positions: number[] = [];
    const colors: number[] = [];

    // EnemySpawn — a ring + an X so it's unmistakable as the throw point.
    if (spawnPoint) {
      this.ring(positions, colors, spawnPoint, LevelMarkers.SPAWN_COLOR);
      this.cross(positions, colors, spawnPoint, LevelMarkers.SPAWN_COLOR);
    }

    // Waypoint path — a diamond at each node (first green, last red, rest cyan) and an arrowed
    // segment from the previous node, so the traversal order reads at a glance.
    waypoints.forEach((wp, i) => {
      let color = LevelMarkers.PATH_COLOR;
      if (i === 0) color = LevelMarkers.START_COLOR;
      else if (i === waypoints.length - 1) color = LevelMarkers.END_COLOR;
      this.diamond(positions, colors, wp, color);
      if (i > 0) this.arrow(positions, colors, waypoints[i - 1], wp);
    });

    if (positions.length === 0) return;

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(positions), 2)
    );
    geometry.setAttribute(
      "color",
      new THREE.BufferAttribute(new Float32Array(colors), 4)
    );

    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      depthTest: false,
      depthWrite: false,
      transparent: true,
    });
    this.mesh = new THREE.LineSegments(geometry, material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 999; // sit on top of the level graphics
    this.scene.add(this.mesh);
  }

  // Remove + dispose the gizmo (idempotent).
  public Clear() {
    if (!this.mesh) return;
    this.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.mesh = undefined;
  }

  // --- Glyph builders (each pushes line segments as x,y pairs + rgba per vertex) ---

  // One line segment a->b, single color on both ends.
  private seg(
    positions: number[],
    colors: number[],
    ax: number,
    ay: number,
    bx: number,
    by: number,
    color: THREE.Color
  ) {
    positions.push(ax, ay, bx, by);
    colors.push(color.r, color.g, color.b, 1, color.r, color.g, color.b, 1);
  }

  private ring(positions: number[], colors: number[], c: Vec, color: THREE.Color) {
    const n = 16;
    const r = LevelMarkers.NODE_R;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2;
      const a1 = ((i + 1) / n) * Math.PI * 2;
      this.seg(
        positions,
        colors,
        c.x + Math.cos(a0) * r,
        c.y + Math.sin(a0) * r,
        c.x + Math.cos(a1) * r,
        c.y + Math.sin(a1) * r,
        color
      );
    }
  }

  private cross(positions: number[], colors: number[], c: Vec, color: THREE.Color) {
    const r = LevelMarkers.NODE_R;
    this.seg(positions, colors, c.x - r, c.y, c.x + r, c.y, color);
    this.seg(positions, colors, c.x, c.y - r, c.x, c.y + r, color);
  }

  private diamond(positions: number[], colors: number[], c: Vec, color: THREE.Color) {
    const r = LevelMarkers.NODE_R;
    this.seg(positions, colors, c.x, c.y + r, c.x + r, c.y, color);
    this.seg(positions, colors, c.x + r, c.y, c.x, c.y - r, color);
    this.seg(positions, colors, c.x, c.y - r, c.x - r, c.y, color);
    this.seg(positions, colors, c.x - r, c.y, c.x, c.y + r, color);
  }

  // Segment a->b plus a small arrowhead near b pointing along the direction of travel.
  private arrow(positions: number[], colors: number[], a: Vec, b: Vec) {
    const color = LevelMarkers.PATH_COLOR;
    this.seg(positions, colors, a.x, a.y, b.x, b.y, color);

    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 0.0001) return;

    const ux = dx / len;
    const uy = dy / len;
    const s = LevelMarkers.ARROW;
    // Tip just shy of the node glyph; two barbs swept back along the perpendicular.
    const tipX = b.x - ux * LevelMarkers.NODE_R;
    const tipY = b.y - uy * LevelMarkers.NODE_R;
    const backX = tipX - ux * s;
    const backY = tipY - uy * s;
    const perpX = -uy * s * 0.6;
    const perpY = ux * s * 0.6;
    this.seg(positions, colors, tipX, tipY, backX + perpX, backY + perpY, color);
    this.seg(positions, colors, tipX, tipY, backX - perpX, backY - perpY, color);
  }
}
