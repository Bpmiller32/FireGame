import Player from "../player";
import PlayerStates from "../../../../engine/types/playerStates";
import SpriteAnimations from "../spriteAnimations";
import PlayerDirection from "../../../../engine/types/playerDirection";
import applyGroundedStick from "../applyGroundedStick";

// Idle state: transitions, grounded coyote/buffer resets, idle anim
const handlePlayerIdle = (player: Player) => {
  // Change state
  // Edge case: only when vertical velocity is genuinely POSITIVE (rising) and a
  // direction is held — give the downward stick before entering idle. Uses > 0 (not
  // >= 0) so flat-ground idle (where the stick now holds y = 0) does NOT trip this; a
  // >= 0 here cost a 1-frame stall on every walk-start from a standstill.
  if (
    player.NextTranslation.y > 0 &&
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
    // Launch impulse + reset the early-end latch so every jump starts at full
    // height (a buffered jump fired on landing skips the grounded reset below).
    player.NextTranslation.y = player.JumpPower;
    player.EndedJumpEarly = false;
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

  // Handle Idle state
  // In a grounded state, give coyote and reset early jump gravity
  player.CoyoteAvailable = true;
  player.EndedJumpEarly = false;
  if (!player.Input.isJump) {
    player.BufferJumpAvailable = true;
  }

  // Grounded "stick" that keeps the player glued (shared with running). On a walkable-flat
  // slope it follows the surface so a near-stationary idle isn't pulled around; flat → 0
  // (so a hard landing de-penetrates instead of being pinned into the floor); steeper slope
  // → firm -MaxFallSpeed. Idle's horizontal speed is ~0, so the slope-follow term is ~0.
  applyGroundedStick(player);

  // Animation
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
