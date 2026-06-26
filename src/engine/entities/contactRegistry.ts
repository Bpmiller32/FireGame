// Contact registry — a declarative "when an A contacts a B, run this" table over
// the physics event dispatch (Physics.handleCollisionEvents). The game declares
// rules as data (game/config/contactRules.ts); this engine class is generic and
// names no game concept (same spirit as StateMachine). Dispatch is two-sided: a
// rule is tested as (x, y) and (y, x), so it fires no matter which body moved;
// the handler always gets args in the rule's own (a, b) order.

import GameObject from "./gameObject";

// Predicate that decides whether a GameObject matches one side of a rule.
export type ContactMatch = (gameObject: GameObject) => boolean;

// Which physics phase a rule listens to.
type ContactPhase = "enter" | "exit" | "sensorEnter" | "sensorExit";

// Handler run when both sides match; receives them in the rule's (a, b) order.
type ContactHandler = (a: GameObject, b: GameObject) => void;

interface ContactRule {
  a: ContactMatch;
  b: ContactMatch;
  phase: ContactPhase;
  run: ContactHandler;
}

export default class ContactRegistry {
  private rules: ContactRule[] = []; // all declared contact rules

  // Declare a rule: when an `a` and a `b` reach `phase`, run `run(a, b)`.
  public Add(a: ContactMatch, b: ContactMatch, phase: ContactPhase, run: ContactHandler) {
    this.rules.push({ a, b, phase, run });
  }

  // Called by Physics for each contact event. Fires every matching rule. The
  // `else if` makes a symmetric pair fire a rule once, not twice, and keeps the
  // handler's argument order matching how the rule was declared.
  public Dispatch(phase: ContactPhase, x: GameObject, y: GameObject) {
    for (const rule of this.rules) {
      if (rule.phase !== phase) {
        continue;
      }

      if (rule.a(x) && rule.b(y)) {
        rule.run(x, y);
      } else if (rule.a(y) && rule.b(x)) {
        rule.run(y, x);
      }
    }
  }
}
