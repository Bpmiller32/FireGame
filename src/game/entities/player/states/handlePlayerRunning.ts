import Player from "../player";
import PlayerStates from "../../../../engine/types/playerStates";
import SpriteAnimations from "../spriteAnimations";
import PlayerDirection from "../../../../engine/types/playerDirection";
import applyHorizontalMovement from "../applyHorizontalMovement";

const handlePlayerRunning = (player: Player) => {
  /* -------------------------------------------------------------------------- */
  /*                                Change state                                */
  /* -------------------------------------------------------------------------- */
  // Transition to falling state
  if (!player.IsTouching.ground) {
    if (player.IsTouching.edgePlatform) {
      player.NextTranslation.y = 0;
    }

    // // Make the collider smaller in air for better feel
    // player.changeColliderSize({ width: 1.75, height: 2.5 });

    player.TimeFallWasEntered = player.Time.Elapsed;
    player.State = PlayerStates.FALLING;
    return;
  }

  // Transition to idle state
  const isMovingSlowly =
    Math.abs(player.NextTranslation.x) <= player.MaxGroundSpeed * 0.01;
  const isIdleInput =
    player.Input.isNeitherLeftRight || player.Input.isLeftRightCombo;

  if (isMovingSlowly && isIdleInput) {
    player.NextTranslation.x = 0;
    player.State = PlayerStates.IDLE;
    return;
  }

  // Transition to jumping state
  if (player.Input.isJump && player.BufferJumpAvailable) {
    // TODO: remove?
    // // Make the collider smaller in air for better feel
    // player.changeColliderSize({ width: 1.75, height: 2.5 });

    player.NextTranslation.y = 0;

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
  /*                            Handle Running state                            */
  /* -------------------------------------------------------------------------- */
  // In a grounded state, give coyote and reset early jump gravity
  player.CoyoteAvailable = true;
  player.EndedJumpEarly = false;
  if (!player.Input.isJump) {
    player.BufferJumpAvailable = true;
  }

  /* -------------------------------------------------------------------------- */
  /*                             Input and animation                            */
  /* -------------------------------------------------------------------------- */
  // Left
  if (player.Input.isLeft) {
    player.Direction = PlayerDirection.LEFT;
    player.SpriteAnimator.ChangeState(SpriteAnimations.RUN_LEFT);
  }
  // Right
  else if (player.Input.isRight) {
    player.Direction = PlayerDirection.RIGHT;
    player.SpriteAnimator.ChangeState(SpriteAnimations.RUN_RIGHT);
  }
  // Both and neither
  else if (isIdleInput) {
    player.Direction = PlayerDirection.NEUTRAL;

    const currentState = player.SpriteAnimator.State;

    if (
      currentState == SpriteAnimations.JUMP_LEFT ||
      currentState == SpriteAnimations.FALL_LEFT
    ) {
      player.SpriteAnimator.ChangeState(SpriteAnimations.RUN_LEFT);
    }
    if (
      currentState == SpriteAnimations.JUMP_RIGHT ||
      currentState == SpriteAnimations.FALL_RIGHT
    ) {
      player.SpriteAnimator.ChangeState(SpriteAnimations.RUN_RIGHT);
    }
  }

  // Controls accelerating or decellerating the sprite animation transitions
  // Denominator determines the scaling factor relative to player speed, faster/slower move horizontally - faster/slower animation updates
  // Numerator inverts the scaling factor so that larger movements == faster animation, slower movements == slower animations
  player.SpriteAnimator.ChangeAnimationTiming(
    1 / (Math.abs(player.NextTranslation.x) / player.AnimationScalingFactor)
  );

  /* -------------------------------------------------------------------------- */
  /*                           Gravity Logic (Y Axis)                           */
  /* -------------------------------------------------------------------------- */
  if (player.IsTouching.edgePlatform) {
    // Exception to simple gravity when about to run off an edge
    player.NextTranslation.y = 0;
  } else {
    // Simple max gravity in non-vertical state to fix downward movement on slopes, maintain touching ground
    player.NextTranslation.y = -player.MaxFallSpeed;
  }

  /* -------------------------------------------------------------------------- */
  /*                           Movement Logic (X Axis)                          */
  /* -------------------------------------------------------------------------- */
  // Shared accel/decel + wall-stop; returns true on a wall hit, which running
  // uses to keep its wall animation playing.
  if (applyHorizontalMovement(player)) {
    // Play running animation even though hitting a wall (should be in animation section above but I didn't want 2 identical checks)
    player.SpriteAnimator.ChangeAnimationTiming(
      1 / (player.MaxGroundSpeed / player.AnimationScalingFactor)
    );
  }
};

export default handlePlayerRunning;
