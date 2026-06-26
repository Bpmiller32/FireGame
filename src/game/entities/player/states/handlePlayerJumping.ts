import Player from "../player";
import PlayerStates from "../../../../engine/types/playerStates";
import SpriteAnimations from "../spriteAnimations";
import PlayerDirection from "../../../../engine/types/playerDirection";
import applyHorizontalMovement from "../applyHorizontalMovement";

// Jumping state: rise gravity, variable height, apex hang
const handlePlayerJumping = (player: Player) => {
  // Change state
  // Hitting a ceiling
  if (player.IsTouching.ceiling && player.NextTranslation.y >= 0) {
    player.NextTranslation.y = 0;
    player.TimeFallWasEntered = player.Time.Elapsed;
    player.State = PlayerStates.FALLING;
    return;
  }

  // Natural apex — rise gravity has decelerated the launch impulse to zero. The
  // peak emerges from physics now, not a fixed MaxJumpTime timer.
  if (player.NextTranslation.y <= 0) {
    player.TimeFallWasEntered = player.Time.Elapsed;
    player.State = PlayerStates.FALLING;
    return;
  }

  // Variable height — releasing jump past the MinJumpTime floor latches an
  // "early end", which boosts rise gravity below so the player peaks lower.
  // Holding keeps the full arc. (Stays in JUMPING; the apex check above ends it.)
  if (
    !player.Input.isJump &&
    player.Time.Elapsed > player.TimeJumpWasEntered + player.MinJumpTime
  ) {
    player.EndedJumpEarly = true;
  }

  // Handle Jumping state
  // Disable coyote and buffer jump availability
  player.CoyoteAvailable = false;
  player.BufferJumpAvailable = false;

  // Input and animation
  // Left
  if (player.Input.isLeft) {
    player.Direction = PlayerDirection.LEFT;
    player.SpriteAnimator.ChangeState(SpriteAnimations.JUMP_LEFT);
  }
  // Right
  else if (player.Input.isRight) {
    player.Direction = PlayerDirection.RIGHT;
    player.SpriteAnimator.ChangeState(SpriteAnimations.JUMP_RIGHT);
  }
  // Both and neither
  else if (
    player.Input.isNeitherLeftRight ||
    player.Input.isLeftRightCombo
  ) {
    player.Direction = PlayerDirection.NEUTRAL;

    const currentState = player.SpriteAnimator.State;

    if (
      currentState === SpriteAnimations.IDLE_LEFT ||
      currentState === SpriteAnimations.RUN_LEFT
    ) {
      player.SpriteAnimator.ChangeState(SpriteAnimations.JUMP_LEFT);
    }
    if (
      currentState === SpriteAnimations.IDLE_RIGHT ||
      currentState === SpriteAnimations.RUN_RIGHT
    ) {
      player.SpriteAnimator.ChangeState(SpriteAnimations.JUMP_RIGHT);
    }
  }

  // Jump Logic (Y Axis)
  // Rise gravity decelerates the upward impulse (set to JumpPower on jump entry)
  // so the apex emerges naturally. A full jump floats near the top (apex hang);
  // an early-released jump instead falls away fast (variable height). The two are
  // mutually exclusive — a cut jump gets no hang.
  let riseGravity = player.RiseGravity;
  if (player.EndedJumpEarly) {
    riseGravity *= player.JumpEndedEarlyGravityModifier;
  } else if (Math.abs(player.NextTranslation.y) < player.ApexHangThreshold) {
    riseGravity *= player.ApexHangMult;
  }

  player.NextTranslation.y -= riseGravity * player.Time.Delta;

  // Movement Logic (X Axis)
  applyHorizontalMovement(player, true);
};

export default handlePlayerJumping;
