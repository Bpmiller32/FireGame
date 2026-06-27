// Tiny generic state machine: dispatches to the current State's handler once per
// Update. Host owns `State`; a handler reassigns host.State to transition next frame.
export default class StateMachine<H extends { State: S }, S extends string> {
  constructor(
    private host: H,
    private handlers: Record<S, (host: H) => void>
  ) {}

  public Update() {
    // Read State once: changing host.State transitions next Update, not within this one.
    this.handlers[this.host.State]?.(this.host);
  }
}
