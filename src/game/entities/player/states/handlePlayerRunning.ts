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
    // Launch feel off the platform you just left: an EDGE platform gives a SOFT
    // launch (coyote-friendly, what edge platforms exist for), a non-edge one a FIRM
    // launch. Reads WasOnEdgePlatform because IsTouching.edgePlatform has already
    // cleared now that ground is lost.
    if (player.WasOnEdgePlatform) {
      if (player.GroundIsWalkableFlat) {
        // FLAT (or a ramp within FlatToleranceDegrees): launch at 0 — the loved soft,
        // coyote feel. A shallow ramp counts as flat here so its edge feels like a flat
        // platform's, instead of getting the slope carry.
        player.NextTranslation.y = 0;
      } else {
        // SLOPE edge (Bug-2): while running down the ramp the controller was moving us
        // down at ~vx*tan(θ) (the slope-clamped stick). Carry that real descent into the
        // fall so the lip is seamless — the old hard 0 here is what caused the
        // anti-gravity "notch". /dt converts the stored per-step movement back to a
        // velocity (FALLING re-multiplies by dt). Clamp to (-MaxFallSpeed..0]: min(0)
        // kills an uphill-crest upward pop, max(-MaxFallSpeed) caps a snap-to-ground spike.
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

  // Controls accelerating or decelerating the sprite animation transitions
  // Denominator determines the scaling factor relative to player speed, faster/slower move horizontally - faster/slower animation updates
  // Numerator inverts the scaling factor so that larger movements == faster animation, slower movements == slower animations
  player.SpriteAnimator.ChangeAnimationTiming(
    1 / (Math.abs(player.NextTranslation.x) / player.AnimationScalingFactor)
  );

  // Movement Logic (X Axis) — run BEFORE the grounded stick below so the slope-follow
  // stick uses this frame's horizontal speed. Shared accel/decel + wall-stop; returns
  // true on a wall hit, which running uses to keep its wall animation playing.
  if (applyHorizontalMovement(player)) {
    // Play running animation even though hitting a wall (should be in animation section above but I didn't want 2 identical checks)
    player.SpriteAnimator.ChangeAnimationTiming(
      1 / (player.MaxGroundSpeed / player.AnimationScalingFactor)
    );
  }

  // Gravity Logic (Y Axis): the grounded "stick" that keeps the player glued. On a
  // walkable-flat slope this follows the surface tangent so horizontal speed matches flat
  // ground (no climb-slow / slide-fast); flat → 0; steeper slope → firm -MaxFallSpeed.
  applyGroundedStick(player);
};

export default handlePlayerRunning;
