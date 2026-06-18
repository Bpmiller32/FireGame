import Player from "../player";
import PlayerStates from "../../../../engine/types/playerStates";
import SpriteAnimations from "../spriteAnimations";
import PlayerDirection from "../../../../engine/types/playerDirection";
import GameUtils from "../../../gameUtils";
import applyHorizontalMovement from "../applyHorizontalMovement";

const handlePlayerJumping = (player: Player) => {
  /* -------------------------------------------------------------------------- */
  /*                                Change state                                */
  /* -------------------------------------------------------------------------- */
  // Hitting a ceiling
  if (player.IsTouching.ceiling && player.NextTranslation.y >= 0) {
    player.NextTranslation.y = 0;
    player.TimeFallWasEntered = player.Time.Elapsed;
    player.State = PlayerStates.FALLING;
    return;
  }

  // Max jump time exceeded
  if (player.Time.Elapsed >= player.TimeJumpWasEntered + player.MaxJumpTime) {
    player.EndedJumpEarly = false;

    player.NextTranslation.y = 0;
    player.TimeFallWasEntered = player.Time.Elapsed;
    player.State = PlayerStates.FALLING;
    return;
  }

  // Min jump time exceeded and not holding jump
  if (
    !player.Input.isJump &&
    player.Time.Elapsed > player.TimeJumpWasEntered + player.MinJumpTime
  ) {
    player.EndedJumpEarly = true;

    player.NextTranslation.y = 0;
    player.TimeFallWasEntered = player.Time.Elapsed;
    player.State = PlayerStates.FALLING;
    return;
  }

  /* -------------------------------------------------------------------------- */
  /*                            Handle Jumping state                            */
  /* -------------------------------------------------------------------------- */
  // Disable coyote and buffer jump availability
  player.CoyoteAvailable = false;
  player.BufferJumpAvailable = false;

  /* -------------------------------------------------------------------------- */
  /*                             Input and animation                            */
  /* -------------------------------------------------------------------------- */
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

  /* -------------------------------------------------------------------------- */
  /*                             Jump Logic (Y Axis)                            */
  /* -------------------------------------------------------------------------- */
  // Apply jump physics
  player.NextTranslation.y = GameUtils.MoveTowardsPoint(
    player.NextTranslation.y,
    player.JumpPower,
    player.JumpAcceleration * player.Time.Delta
  );

  /* -------------------------------------------------------------------------- */
  /*                           Movement Logic (X Axis)                          */
  /* -------------------------------------------------------------------------- */
  applyHorizontalMovement(player);
};

export default handlePlayerJumping;
