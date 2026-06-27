// GameObject physics collider shapes — CUBE, SPHERE, CAPSULE only; slopes are built from rotated cubes.
// Maps to Rapier2D: CUBE->cuboid, SPHERE->ball, CAPSULE->capsule.
const GameObjectType = {
  // Rectangular/box collider — players, platforms, walls, slopes (rotated cubes).
  CUBE: "cube",

  // Circular collider — rolling enemies, projectiles, round objects.
  SPHERE: "sphere",

  // Rounded-rectangle collider — smooth-moving characters (won't catch on ledges).
  CAPSULE: "capsule",
} as const;

export default GameObjectType;
