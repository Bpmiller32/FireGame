import Player from "../player";
import PlayerStates from "../../../utils/types/playerStates";
import SpriteAnimations from "./spriteAnimations";
import PlayerDirection from "../../../utils/types/playerDirection";
import GameUtils from "../../../utils/gameUtils";

const handlePlayerRunning = (player: Player) => {
  /* -------------------------------------------------------------------------- */
  /*                                Change state                                */
  /* -------------------------------------------------------------------------- */
  // Transition to falling state
  if (!player.isTouching.ground) {
    if (player.isTouching.edgePlatform) {
      player.nextTranslation.y = 0;
    }

    // // Make the collider smaller in air for better feel
    // player.changeColliderSize({ width: 1.75, height: 2.5 });

    player.timeFallWasEntered = player.time.elapsed;
    player.state = PlayerStates.FALLING;
    return;
  }

  // Transition to idle state
  const isMovingSlowly =
    Math.abs(player.nextTranslation.x) <= player.maxGroundSpeed * 0.01;
  const isIdleInput =
    player.input.isNeitherLeftRight() || player.input.isLeftRightCombo();

  if (isMovingSlowly && isIdleInput) {
    player.nextTranslation.x = 0;
    player.state = PlayerStates.IDLE;
    return;
  }

  // Transition to jumping state
  if (player.input.isJump() && player.bufferJumpAvailable) {
    // TODO: remove?
    // // Make the collider smaller in air for better feel
    // player.changeColliderSize({ width: 1.75, height: 2.5 });

    player.nextTranslation.y = 0;

    player.timeJumpWasEntered = player.time.elapsed;
    player.state = PlayerStates.JUMPING;
    return;
  }

  // Transition to climbing state
  if (
    player.isTouching.ladderCore &&
    (player.input.isUp() || player.input.isDown()) &&
    !(player.isTouching.ladderTop && player.input.isUp()) &&
    !(player.isTouching.ladderBottom && player.input.isDown())
  ) {
    player.nextTranslation.x = 0;
    player.nextTranslation.y = 0;

    player.state = PlayerStates.CLIMBING;
    return;
  }

  /* -------------------------------------------------------------------------- */
  /*                            Handle Running state                            */
  /* -------------------------------------------------------------------------- */
  // In a grounded state, give coyote and reset early jump gravity
  player.coyoteAvailable = true;
  player.endedJumpEarly = false;
  if (!player.input.isJump()) {
    player.bufferJumpAvailable = true;
  }

  /* -------------------------------------------------------------------------- */
  /*                             Input and animation                            */
  /* -------------------------------------------------------------------------- */
  // Left
  if (player.input.isLeft()) {
    player.direction = PlayerDirection.LEFT;
    player.spriteAnimator.changeState(SpriteAnimations.RUN_LEFT);
  }
  // Right
  else if (player.input.isRight()) {
    player.direction = PlayerDirection.RIGHT;
    player.spriteAnimator.changeState(SpriteAnimations.RUN_RIGHT);
  }
  // Both and neither
  else if (isIdleInput) {
    player.direction = PlayerDirection.NEUTRAL;

    const currentState = player.spriteAnimator.state;

    if (
      currentState == SpriteAnimations.JUMP_LEFT ||
      currentState == SpriteAnimations.FALL_LEFT
    ) {
      player.spriteAnimator.changeState(SpriteAnimations.RUN_LEFT);
    }
    if (
      currentState == SpriteAnimations.JUMP_RIGHT ||
      currentState == SpriteAnimations.FALL_RIGHT
    ) {
      player.spriteAnimator.changeState(SpriteAnimations.RUN_RIGHT);
    }
  }

  // Controls accelerating or decellerating the sprite animation transitions
  // Denominator determines the scaling factor relative to player speed, faster/slower move horizontally - faster/slower animation updates
  // Numerator inverts the scaling factor so that larger movements == faster animation, slower movements == slower animations
  player.spriteAnimator.changeAnimationTiming(
    1 / (Math.abs(player.nextTranslation.x) / 1.6)
  );

  /* -------------------------------------------------------------------------- */
  /*                           Gravity Logic (Y Axis)                           */
  /* -------------------------------------------------------------------------- */
  if (player.isTouching.edgePlatform) {
    // Exception to simple gravity when about to run off an edge
    player.nextTranslation.y = 0;
  } else {
    // Simple max gravity in non-vertical state to fix downward movement on slopes, maintain touching ground
    player.nextTranslation.y = -player.maxFallSpeed;
  }

  /* -------------------------------------------------------------------------- */
  /*                           Movement Logic (X Axis)                          */
  /* -------------------------------------------------------------------------- */
  let targetSpeed = 0;
  let acceleration = 0;

  // Decellerate x movement while running
  if (player.direction === PlayerDirection.NEUTRAL) {
    targetSpeed = 0;
    acceleration = player.groundDeceleration;
  }
  // Accellerate x movement while running
  else {
    targetSpeed = player.direction * player.maxGroundSpeed;
    acceleration = player.groundAcceleration;
  }

  // Set desired velocity
  player.nextTranslation.x = GameUtils.moveTowardsPoint(
    player.nextTranslation.x,
    targetSpeed,
    acceleration * player.time.delta
  );

  // Hitting a wall
  if (
    (player.isTouching.leftSide && player.direction == PlayerDirection.LEFT) ||
    (player.isTouching.rightSide && player.direction == PlayerDirection.RIGHT)
  ) {
    player.nextTranslation.x = 0;

    // Play running animation even though hitting a wall (should be in animation section above but I didn't want 2 identical checks)
    player.spriteAnimator.changeAnimationTiming(
      1 / (player.maxGroundSpeed / 1.6)
    );
  }
};

export default handlePlayerRunning;
