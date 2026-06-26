import Player from "../player";
import PlayerStates from "../../../../engine/types/playerStates";
import PlayerDirection from "../../../../engine/types/playerDirection";
import GameUtils from "../../../gameUtils";

// Climbing state: ladder top/bottom exits, vertical climb movement
const handlePlayerClimbing = (player: Player) => {
  // Change state
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

  // Input and animation
  if (player.Input.isUp) {
    player.Direction = PlayerDirection.UP;
  } else if (player.Input.isDown) {
    player.Direction = PlayerDirection.DOWN;
  } else {
    player.Direction = PlayerDirection.NEUTRAL;
  }

  // Movement Logic (Y axis — vertical climbing)
  let targetSpeed = 0;
  let acceleration = 0;

  // Accelerate up or down (Direction carries the sign); otherwise decelerate to a stop.
  if (
    player.Direction === PlayerDirection.UP ||
    player.Direction === PlayerDirection.DOWN
  ) {
    targetSpeed = player.Direction * player.MaxClimbSpeed;
    acceleration = player.ClimbAcceleration * player.Time.Delta;
  } else {
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
