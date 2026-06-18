import Player from "../player";
import PlayerStates from "../../../../engine/types/playerStates";
import SpriteAnimations from "../spriteAnimations";
import PlayerDirection from "../../../../engine/types/playerDirection";
import GameUtils from "../../../gameUtils";
import applyHorizontalMovement from "../applyHorizontalMovement";

const handlePlayerFalling = (player: Player) => {
  /* -------------------------------------------------------------------------- */
  /*                                Change state                                */
  /* -------------------------------------------------------------------------- */
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

    // Reset gating mechanism for changing collider size
    player.HasColliderUpdated = false;
    return;
  }

  // Allow transition into jumping state when otherwise should be falling - coyote time
  if (
    player.Input.isJump &&
    player.CoyoteAvailable &&
    player.Time.Elapsed < player.TimeFallWasEntered + player.CoyoteTime
  ) {
    // Reset gating mechanism for changing collider size
    player.HasColliderUpdated = false;

    player.CoyoteCount += 1;

    player.NextTranslation.y = 0;
    player.CoyoteAvailable = false;
    player.TimeJumpWasEntered = player.Time.Elapsed;
    player.State = PlayerStates.JUMPING;
    return;
  }

  /* -------------------------------------------------------------------------- */
  /*                            Handle Falling state                            */
  /* -------------------------------------------------------------------------- */
  // Check if ground is within buffer range
  if (player.GroundWithinBufferRange) {
    // // TODO: remove?
    // // Return collider to initial size, gate to only do this once instead of creating multiple colliders per tick in this state
    // if (!player.hasColliderUpdated) {
    //   player.hasColliderUpdated = true;

    //   player.changeColliderSize({
    //     width: player.initialSize.x,
    //     height: player.initialSize.y,
    //   });
    // }

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

  /* -------------------------------------------------------------------------- */
  /*                             Input and animation                            */
  /* -------------------------------------------------------------------------- */
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

  /* -------------------------------------------------------------------------- */
  /*                           Gravity Logic (Y Axis)                           */
  /* -------------------------------------------------------------------------- */
  let inAirGravity = player.FallAcceleration;

  // Apply early jump gravity modifier if the jump ended early and player is moving up
  if (player.EndedJumpEarly && player.NextTranslation.y > 0) {
    inAirGravity *= player.JumpEndedEarlyGravityModifier;
  }

  // Move player in the Y direction if coyote time is not available
  if (!player.CoyoteAvailable) {
    player.NextTranslation.y = GameUtils.MoveTowardsPoint(
      player.NextTranslation.y,
      -player.MaxFallSpeed,
      inAirGravity * player.Time.Delta
    );
  }

  /* -------------------------------------------------------------------------- */
  /*                           Movement Logic (X axis)                          */
  /* -------------------------------------------------------------------------- */
  applyHorizontalMovement(player);
};

export default handlePlayerFalling;
