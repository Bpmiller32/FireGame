import Player from "../player";
import PlayerStates from "../../../../engine/types/playerStates";
import SpriteAnimations from "../spriteAnimations";
import PlayerDirection from "../../../../engine/types/playerDirection";
import applyGroundedStick from "../applyGroundedStick";

// Idle state: transitions, grounded coyote/buffer resets, idle anim
const handlePlayerIdle = (player: Player) => {
  // Change state
  // Rising + direction held: give downward stick before idle. Must be > 0 not >= 0,
  // else flat-ground idle trips it and stalls walk-start by a frame.
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
    // Launch + reset early-end latch so a buffered jump fires at full height.
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

  // Grounded "stick" glues player to floor (shared with running). Flat → 0 so a hard
  // landing de-penetrates instead of pinning into the floor; steeper slope → -MaxFallSpeed.
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
