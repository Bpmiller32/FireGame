import Player from "../player";
import PlayerStates from "../../../../engine/types/playerStates";
import PlayerDirection from "../../../../engine/types/playerDirection";
import GameUtils from "../../../gameUtils";

const handlePlayerClimbing = (player: Player) => {
  /* -------------------------------------------------------------------------- */
  /*                                Change state                                */
  /* -------------------------------------------------------------------------- */
  // Helper variables for touching ladder top and bottom
  const atLadderBottom =
    player.IsTouching.ladderBottom &&
    (player.Input.isDown ||
      player.Input.isNeitherUpDown ||
      player.Input.isUpDownCombo);

  const atLadderTop =
    player.IsTouching.ladderTop &&
    (player.Input.isUp ||
      player.Input.isNeitherUpDown ||
      player.Input.isUpDownCombo);

  // Transition to idle state
  if (!player.IsTouching.ladderCore || atLadderBottom || atLadderTop) {
    if (atLadderTop) {
      player.NextTranslation.y = player.MaxClimbSpeed;
    } else {
      player.NextTranslation.y = -player.MaxClimbSpeed;
    }

    player.IsTouching.ground = true;
    player.State = PlayerStates.IDLE;
    return;
  }

  /* -------------------------------------------------------------------------- */
  /*                             Input and animation                            */
  /* -------------------------------------------------------------------------- */
  if (player.Input.isUp) {
    player.Direction = PlayerDirection.UP;
  } else if (player.Input.isDown) {
    player.Direction = PlayerDirection.DOWN;
  } else {
    player.Direction = PlayerDirection.NEUTRAL;
  }

  // Controls accelerating or decellerating the sprite animation transitions
  // Denominator determines the scaling factor relative to player speed, faster/slower move horizontally - faster/slower animation updates
  // Numerator inverts the scaling factor so that larger movements == faster animation, slower movements == slower animations
  if (Math.abs(player.NextTranslation.x) > 0) {
    player.SpriteAnimator.ChangeAnimationTiming(
      1 / (Math.abs(player.NextTranslation.x) / player.AnimationScalingFactor)
    );
  }

  /* -------------------------------------------------------------------------- */
  /*                           Movement Logic (X axis)                          */
  /* -------------------------------------------------------------------------- */
  let targetSpeed = 0;
  let acceleration = 0;

  // Accellerate climbing up
  if (player.Direction === PlayerDirection.UP) {
    targetSpeed = player.Direction * player.MaxClimbSpeed;
    acceleration = player.ClimbAcceleration * player.Time.Delta;
  }
  // Accellerate climbing down
  else if (player.Direction === PlayerDirection.DOWN) {
    targetSpeed = player.Direction * player.MaxClimbSpeed;
    acceleration = player.ClimbAcceleration * player.Time.Delta;
  }
  // Decellerate
  else {
    targetSpeed = 0;
    acceleration = player.ClimbDeceleration * player.Time.Delta;
  }

  // Set desired velocity
  player.NextTranslation.y = GameUtils.MoveTowardsPoint(
    player.NextTranslation.y,
    targetSpeed,
    acceleration
  );
};

export default handlePlayerClimbing;
