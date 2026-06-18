import Player from "../player";
import PlayerStates from "../../../../engine/types/playerStates";
import SpriteAnimations from "../spriteAnimations";
import PlayerDirection from "../../../../engine/types/playerDirection";

const handlePlayerIdle = (player: Player) => {
  /* -------------------------------------------------------------------------- */
  /*                                Change state                                */
  /* -------------------------------------------------------------------------- */
  // Check for edge case where verical direction is positive before entering idle
  if (
    player.NextTranslation.y >= 0 &&
    (player.Input.isLeft || player.Input.isRight)
  ) {
    player.NextTranslation.y = -player.MaxFallSpeed;
    return;
  }

  // Transition to falling state
  if (!player.IsTouching.ground && player.NextTranslation.y <= 0) {
    player.TimeFallWasEntered = player.Time.Elapsed;
    player.State = PlayerStates.FALLING;
    return;
  }

  // Transition to running state
  if (player.Input.isLeft || player.Input.isRight) {
    player.State = PlayerStates.RUNNING;
    return;
  }

  // Transition to jumping state
  if (player.Input.isJump && player.BufferJumpAvailable) {
    // TODO: remove?
    // // Make the collider smaller in air for better feel
    // player.changeColliderSize({ width: 1.75, height: 2.5 });

    player.TimeJumpWasEntered = player.Time.Elapsed;
    player.State = PlayerStates.JUMPING;
    return;
  }

  // Transition to climbing state
  if (
    player.IsTouching.ladderCore &&
    (player.Input.isUp || player.Input.isDown) &&
    !(player.IsTouching.ladderTop && player.Input.isUp) &&
    !(player.IsTouching.ladderBottom && player.Input.isDown)
  ) {
    player.NextTranslation.x = 0;
    player.NextTranslation.y = 0;

    player.State = PlayerStates.CLIMBING;
    return;
  }

  /* -------------------------------------------------------------------------- */
  /*                              Handle Idle state                             */
  /* -------------------------------------------------------------------------- */
  // In a grounded state, give coyote and reset early jump gravity
  player.CoyoteAvailable = true;
  player.EndedJumpEarly = false;
  if (!player.Input.isJump) {
    player.BufferJumpAvailable = true;
  }

  // Simple max gravity in non-vertical state to fix downward movement on slopes, maintain touching ground
  player.NextTranslation.y = -player.MaxFallSpeed;

  /* -------------------------------------------------------------------------- */
  /*                                  Animation                                 */
  /* -------------------------------------------------------------------------- */
  switch (player.Direction) {
    case PlayerDirection.LEFT:
      player.SpriteAnimator.ChangeState(SpriteAnimations.IDLE_LEFT);
      break;
    case PlayerDirection.RIGHT:
      player.SpriteAnimator.ChangeState(SpriteAnimations.IDLE_RIGHT);
      break;

    // PlayerDirection == NEUTRAL
    default:
      const currentState = player.SpriteAnimator.State;

      // If already in idle state, no need to change
      if (
        currentState === SpriteAnimations.IDLE_LEFT ||
        currentState === SpriteAnimations.IDLE_RIGHT
      ) {
        break;
      }

      // Transitioned into idle state, match with correct idle orientation
      if (
        currentState === SpriteAnimations.RUN_LEFT ||
        currentState === SpriteAnimations.FALL_LEFT
      ) {
        player.SpriteAnimator.ChangeState(SpriteAnimations.IDLE_LEFT);
      } else if (
        currentState === SpriteAnimations.RUN_RIGHT ||
        currentState === SpriteAnimations.FALL_RIGHT
      ) {
        player.SpriteAnimator.ChangeState(SpriteAnimations.IDLE_RIGHT);
      }
      break;
  }
};

export default handlePlayerIdle;
