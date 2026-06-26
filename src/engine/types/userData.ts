// Identity attached to every Rapier physics body — what the contact system and physics queries read off a collider.
// type = shared routing TYPE flag (many entities share one type, so one contact rule matches all). name = per-INSTANCE identifier (single out one entity).
// Meaning of both fields is assigned by the game layer; the engine treats them as opaque strings. Per-entity NUMERIC metadata is not carried here — it lives as named, typed fields on entity classes, set at spawn from the level data's `meta` bag (filled by the GLB parser from each mesh's texture name).
export default interface UserData {
  // TYPE flag — shared routing identity; entity-defined string, game-assigned. Many entities can share one type, which lets the contact system match "by type".
  type: string;

  // Per-INSTANCE identifier — entity-defined string, game-assigned. Defaults to the type until SetName overrides it.
  name: string;
}
