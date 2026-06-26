// Tiny generic state machine. Dispatches to the handler for the host's CURRENT
// state, exactly once per update(). The HOST owns its `state` field — a handler
// reassigns host.state to transition next frame; this class just routes. Works
// for any host with a string `state` + a matching handler map: player movement
// states today, enemy/boss action states later.
export default class StateMachine<H extends { State: S }, S extends string> {
  constructor(
    private host: H,
    private handlers: Record<S, (host: H) => void>
  ) {}

  public Update() {
    // Read State once: a handler that changes host.State transitions on the NEXT
    // update, it does not re-dispatch within this one.
    this.handlers[this.host.State]?.(this.host);
  }
}
