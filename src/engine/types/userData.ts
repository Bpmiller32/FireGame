// Identity attached to every Rapier body — read off a collider by the contact system and physics queries.
// type = shared routing flag (many entities share one, so one contact rule matches all); name = per-instance id.
// Both are opaque game-assigned strings; numeric per-entity metadata lives on entity classes, not here.
export default interface UserData {
  // Shared routing type — many entities share one, letting the contact system match by type.
  type: string;

  // Per-instance id; defaults to the type until SetName overrides it.
  name: string;
}
