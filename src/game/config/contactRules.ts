// Declarative cross-entity contact table for this game (who dies/wins/teleports); engine side is Physics.Contacts. Match by TYPE flag, two-sided dispatch. An entity's OWN movement reactions (e.g. enemy reversing at a wall) live with the entity, not here.

import ContactRegistry, {
  ContactMatch,
} from "../../engine/entities/contactRegistry";
import GameObject from "../../engine/entities/gameObject";
import { matchesType } from "../../engine/helpers/physicsHelpers";
import Emitter from "../../engine/events/eventBus";
import EntityType from "../types/entityType";
import Player from "../entities/player/player";
import Teleporter from "../entities/teleporter";
import CameraSensor from "../entities/cameraSensor";
import TrashCan from "../entities/trashCan";

// Match any entity carrying this TYPE flag (e.g. every enemy).
const byType = (type: string): ContactMatch => (go: GameObject) =>
  matchesType(go, type);

// Register this game's contact rules into the engine's contact registry.
// Called once at startup (App.vue), after the engine is configured.
export default function registerContactRules(contacts: ContactRegistry) {
  // Enemy touches Player -> game over. Two-sided: fires whether the player ran
  // into the enemy or the enemy rolled into the player ("any touch registers").
  contacts.Add(
    byType(EntityType.ENEMY),
    byType(EntityType.PLAYER),
    "enter",
    () => Emitter.emit("gameOver")
  );

  // Enemy falls into a TrashCan -> enemy destroyed, can catches fire.
  contacts.Add(
    byType(EntityType.ENEMY),
    byType(EntityType.TRASH_CAN),
    "enter",
    (enemy, can) => {
      (can as TrashCan).IsOnFire = true;
      Emitter.emit("gameObjectRemoved", enemy);
    }
  );

  // Player enters a Teleporter sensor -> teleport to its destination.
  contacts.Add(
    byType(EntityType.TELEPORTER),
    byType(EntityType.PLAYER),
    "sensorEnter",
    (teleporter, player) => {
      const dest = (teleporter as Teleporter).Destination;
      (player as Player).TeleportToPosition(dest.x, dest.y);
    }
  );

  // Player enters a CameraSensor -> adjust the camera to that zone.
  contacts.Add(
    byType(EntityType.CAMERA_SENSOR),
    byType(EntityType.PLAYER),
    "sensorEnter",
    (sensor) => (sensor as CameraSensor).ApplyCameraOnEnter()
  );

  // Player reaches the WinFlag goal zone -> win the level.
  contacts.Add(
    byType(EntityType.WIN_FLAG),
    byType(EntityType.PLAYER),
    "sensorEnter",
    () => Emitter.emit("gameWin")
  );
}
