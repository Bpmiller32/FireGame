/* -------------------------------------------------------------------------- */
/*                          CONTACT RULES (this game)                         */
/* -------------------------------------------------------------------------- */
/*
 * The declarative "when an A contacts a B, run this" table for this game. Every
 * cross-entity interaction lives here as one readable row, so you can see all of
 * the game's contact logic in one place — instead of hunting through each
 * entity's collision callbacks.
 *
 * This is the game-side content; the engine-side machine is Physics.Contacts
 * (an engine ContactRegistry). Same split this project already uses elsewhere:
 *   engine Input  <- inputBindings.ts        (F-keys -> game events)
 *   ENTITY_FACTORIES dispatch <- factory rows (level data -> entities)
 *   Physics.Contacts <- contactRules.ts       (THIS file: contacts -> game logic)
 *
 * Match by TYPE flag (byType — covers every entity of a kind, e.g. all enemies)
 * or by per-INSTANCE name (byName — singles out one specific entity). Dispatch is
 * two-sided, so a rule fires no matter which body was the mover.
 *
 * NOTE: an entity's OWN movement reactions to the world (e.g. an enemy reversing
 * at a wall) are NOT here — those live with the entity. This table is for
 * cross-entity GAME interactions (who dies, who wins, who teleports).
 */
/* -------------------------------------------------------------------------- */

import ContactRegistry, {
  ContactMatch,
} from "../../engine/entities/contactRegistry";
import GameObject from "../../engine/entities/gameObject";
import { matchesType, matchesName } from "../../engine/helpers/physicsHelpers";
import Emitter from "../../engine/events/eventBus";
import EntityType from "../types/entityType";
import Player from "../entities/player/player";
import Teleporter from "../entities/teleporter";
import CameraSensor from "../entities/cameraSensor";
import TrashCan from "../entities/trashCan";

/** Match any entity carrying this TYPE flag (e.g. every enemy). */
export const byType = (type: string): ContactMatch => (go: GameObject) =>
  matchesType(go, type);

/** Match one specific entity by its per-INSTANCE name. */
export const byName = (name: string): ContactMatch => (go: GameObject) =>
  matchesName(go, name);

/**
 * Register this game's contact rules into the engine's contact registry.
 * Called once at startup (App.vue), after the engine is configured.
 */
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
