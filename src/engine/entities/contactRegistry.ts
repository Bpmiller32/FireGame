/* -------------------------------------------------------------------------- */
/*                            CONTACT REGISTRY                                */
/* -------------------------------------------------------------------------- */
/*
 * A tiny declarative table for "when an A contacts a B, run this" — sitting on
 * top of the existing physics event dispatch (Physics.handleCollisionEvents).
 *
 * The GAME declares rules as data (see game/config/contactRules.ts), matching by
 * type-flag or by instance-name. This engine class is generic: a rule's match
 * predicates and handler are opaque functions supplied by the game — the engine
 * names no game concept. (Same spirit as StateMachine: ~35 lines, no framework,
 * readable a year from now.)
 *
 * Dispatch is TWO-SIDED: a rule is tested against both (x, y) and (y, x), so a
 * rule is declared once and fires no matter which body was the mover. The
 * handler always receives the arguments in the rule's own (a, b) order.
 */
/* -------------------------------------------------------------------------- */

import GameObject from "./gameObject";

/** Predicate that decides whether a GameObject matches one side of a rule. */
export type ContactMatch = (gameObject: GameObject) => boolean;

/** Which physics phase a rule listens to. */
export type ContactPhase = "enter" | "exit" | "sensorEnter" | "sensorExit";

/** Handler run when both sides match; receives them in the rule's (a, b) order. */
export type ContactHandler = (a: GameObject, b: GameObject) => void;

interface ContactRule {
  a: ContactMatch;
  b: ContactMatch;
  phase: ContactPhase;
  run: ContactHandler;
}

export default class ContactRegistry {
  private rules: ContactRule[] = [];

  /** Declare a rule: when an `a` and a `b` reach `phase`, run `run(a, b)`. */
  public Add(a: ContactMatch, b: ContactMatch, phase: ContactPhase, run: ContactHandler) {
    this.rules.push({ a, b, phase, run });
  }

  /**
   * Called by Physics for each contact event. Fires every matching rule. The
   * `else if` makes a symmetric pair fire a rule once, not twice, and keeps the
   * handler's argument order matching how the rule was declared.
   */
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

  /** Drop all rules (e.g. on teardown). */
  public Clear() {
    this.rules.length = 0;
  }
}
