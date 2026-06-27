import Player from "../player";
import PlayerStates from "../../../../engine/types/playerStates";
import SpriteAnimations from "../spriteAnimations";
import PlayerDirection from "../../../../engine/types/playerDirection";
import applyHorizontalMovement from "../applyHorizontalMovement";
import applyGroundedStick from "../applyGroundedStick";

// Running state: transitions, horizontal movement, run animation timing
const handlePlayerRunning = (player: Player) => {
  // Change state
  // Transition to falling state
  if (!player.IsTouching.ground) {
    // Edge platform = soft launch (coyote-friendly), non-edge = firm. Read
    // WasOnEdgePlatform because IsTouching.edgePlatform already cleared once ground is lost.
    if (player.WasOnEdgePlatform) {
      if (player.GroundIsWalkableFlat) {
        // Flat (or ramp within FlatToleranceDegrees): launch at 0 for the soft coyote feel.
        player.NextTranslation.y = 0;
      } else {
        // Slope edge: carry the ramp's descent into the fall so the lip is seamless.
        // /dt converts stored per-step movement to velocity (FALLING re-multiplies by dt).
        // Clamp to (-MaxFallSpeed..0]: min(0) kills uphill-crest pop, max caps snap spike.
        const carried = player.LastGroundedMoveY / player.Time.Delta;
        player.NextTranslation.y = Math.max(
          -player.MaxFallSpeed,
          Math.min(0, carried)
        );
      }
    } else {
      player.NextTranslation.y = -player.MaxFallSpeed;
    }

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

  // Handle Running state
  // In a grounded state, give coyote and reset early jump gravity
  player.CoyoteAvailable = true;
  player.EndedJumpEarly = false;
  if (!player.Input.isJump) {
    player.BufferJumpAvailable = true;
  }

  // Input and animation
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

    // Neutral input: keep run anim matching last facing
    const currentState = player.SpriteAnimator.State;

    if (
      currentState === SpriteAnimations.JUMP_LEFT ||
      currentState === SpriteAnimations.FALL_LEFT
    ) {
      player.SpriteAnimator.ChangeState(SpriteAnimations.RUN_LEFT);
    }
    if (
      currentState === SpriteAnimations.JUMP_RIGHT ||
      currentState === SpriteAnimations.FALL_RIGHT
    ) {
      player.SpriteAnimator.ChangeState(SpriteAnimations.RUN_RIGHT);
    }
  }

  // Scale animation speed to horizontal speed: faster movement == faster animation.
  player.SpriteAnimator.ChangeAnimationTiming(
    1 / (Math.abs(player.NextTranslation.x) / player.AnimationScalingFactor)
  );

  // Movement Logic (X Axis) — run BEFORE the grounded stick so the slope-follow stick
  // uses this frame's speed. Returns true on a wall hit.
  if (applyHorizontalMovement(player)) {
    // Keep run animation playing even when hitting a wall.
    player.SpriteAnimator.ChangeAnimationTiming(
      1 / (player.MaxGroundSpeed / player.AnimationScalingFactor)
    );
  }

  // Gravity Logic (Y Axis): grounded "stick" that glues the player. Follows slope tangent
  // (so speed matches flat ground); flat → 0; steeper slope → firm -MaxFallSpeed.
  applyGroundedStick(player);
};

export default handlePlayerRunning;
