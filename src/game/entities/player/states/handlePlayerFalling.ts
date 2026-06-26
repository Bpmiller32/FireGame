import Player from "../player";
import PlayerStates from "../../../../engine/types/playerStates";
import SpriteAnimations from "../spriteAnimations";
import PlayerDirection from "../../../../engine/types/playerDirection";
import GameUtils from "../../../gameUtils";
import applyHorizontalMovement from "../applyHorizontalMovement";

// Falling state: coyote/buffer jumps, terminal-speed gravity, fall anim
const handlePlayerFalling = (player: Player) => {
  // Change state
  // Transition to idle or running state
  if (player.IsTouching.ground) {
    if (
      (player.Input.isNeitherLeftRight || player.Input.isLeftRightCombo) &&
      Math.abs(player.NextTranslation.x) < player.MaxGroundSpeed * 0.01
    ) {
      player.State = PlayerStates.IDLE;
    } else {
      player.State = PlayerStates.RUNNING;
    }

    // Reset gating mechanism for counting buffer jumps
    player.WasBufferJumpUsed = false;

    // Seat the player on touchdown the SAME way the grounded states do, so the landing
    // frame's KCC move matches the surface under the feet:
    //  • FLAT ground → 0, so the landing frame doesn't drive the now-full feet down into
    //    the floor (Bug-1).
    //  • SLOPE → the -MaxFallSpeed downward stick, so the player is firmly clamped onto the
    //    ramp instead of floating a hair above it. A flat 0 on a slope lets the feet settle
    //    slowly, and during that settle ground detection sits on the boundary and flickers
    //    RUNNING<->FALLING for a few frames after landing on an up-slope. The KCC clamps the
    //    stick to the surface, so this is the firm seat, not a downward dive.
    // (Safe: FALLING is only entered at the apex with vy <= 0; GroundIsFlat is fresh from
    //  the down-cast that just registered ground this transition.)
    if (player.GroundIsFlat) {
      player.NextTranslation.y = 0;
    } else {
      player.NextTranslation.y = -player.MaxFallSpeed;
    }

    return;
  }

  // Allow transition into jumping state when otherwise should be falling - coyote time
  if (
    player.Input.isJump &&
    player.CoyoteAvailable &&
    player.Time.Elapsed < player.TimeFallWasEntered + player.CoyoteTime
  ) {
    player.CoyoteCount += 1;

    // Launch impulse + reset the early-end latch so every jump starts un-cut.
    player.NextTranslation.y = player.JumpPower;
    player.EndedJumpEarly = false;
    player.CoyoteAvailable = false;
    player.TimeJumpWasEntered = player.Time.Elapsed;
    player.State = PlayerStates.JUMPING;
    return;
  }

  // Handle Falling state
  // Check if ground is within buffer range
  if (player.GroundWithinBufferRange) {
    // Give buffer jump
    if (!player.Input.isJump) {
      player.BufferJumpAvailable = true;
    }
  }

  // Count buffer jumps
  if (
    player.BufferJumpAvailable &&
    player.Input.isJump &&
    !player.WasBufferJumpUsed
  ) {
    player.WasBufferJumpUsed = true;
    player.BufferJumpCount++;
  }

  // Take coyote jump if too much time has passed falling
  if (player.Time.Elapsed >= player.TimeFallWasEntered + player.CoyoteTime) {
    player.CoyoteAvailable = false;
  }

  // Input and animation
  // Left
  if (player.Input.isLeft) {
    player.Direction = PlayerDirection.LEFT;
    player.SpriteAnimator.ChangeState(SpriteAnimations.FALL_LEFT);
  }
  // Right
  else if (player.Input.isRight) {
    player.Direction = PlayerDirection.RIGHT;
    player.SpriteAnimator.ChangeState(SpriteAnimations.FALL_RIGHT);
  }
  // Both and neither
  else if (
    player.Input.isNeitherLeftRight ||
    player.Input.isLeftRightCombo
  ) {
    player.Direction = PlayerDirection.NEUTRAL;

    // Neutral input: pick fall anim from current facing
    const isFacingLeft =
      player.SpriteAnimator.State === SpriteAnimations.IDLE_LEFT ||
      player.SpriteAnimator.State === SpriteAnimations.RUN_LEFT ||
      player.SpriteAnimator.State === SpriteAnimations.JUMP_LEFT;

    const isFacingRight =
      player.SpriteAnimator.State === SpriteAnimations.IDLE_RIGHT ||
      player.SpriteAnimator.State === SpriteAnimations.RUN_RIGHT ||
      player.SpriteAnimator.State === SpriteAnimations.JUMP_RIGHT;

    if (isFacingLeft) {
      player.SpriteAnimator.ChangeState(SpriteAnimations.FALL_LEFT);
    }

    if (isFacingRight) {
      player.SpriteAnimator.ChangeState(SpriteAnimations.FALL_RIGHT);
    }
  }

  // Gravity Logic (Y Axis)
  // Gravity is intentionally HELD OFF during the coyote window: for the few frames
  // after leaving a ledge (CoyoteAvailable stays true until CoyoteTime expires above)
  // the player floats with vy unchanged — the literal Wile-E-Coyote hang — and can
  // still jump (see the coyote-jump branch up top). NOTE: this hang fires on EVERY
  // walk-off, whether or not a jump is pressed. Once the window expires (CoyoteAvailable
  // cleared above) gravity becomes a plain accel toward terminal speed. Variable jump
  // height lives entirely in JUMPING (early release boosts rise gravity), so there's
  // no early-release branch here.
  if (!player.CoyoteAvailable) {
    player.NextTranslation.y = GameUtils.MoveTowardsPoint(
      player.NextTranslation.y,
      -player.MaxFallSpeed,
      player.FallAcceleration * player.Time.Delta
    );
  }

  // Movement Logic (X axis)
  applyHorizontalMovement(player, true);
};

export default handlePlayerFalling;
