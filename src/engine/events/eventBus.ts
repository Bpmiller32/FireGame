/* -------------------------------------------------------------------------- */
/*             Typescript event emitter using Mitt and events list            */
/* -------------------------------------------------------------------------- */

import mitt from "mitt";
import GameObject from "../entities/gameObject";

// Engine-level events — emitted and consumed by reusable engine systems.
// This half must never mention a game-specific concept.
type EngineEventMap = {
  tick: void;
  resize: void;
  resourcesReady: void;
  resourceLoadFailed: string;
};

// Game-level events — specific to this game's rules, UI, and flow.
type GameEventMap = {
  gameObjectRemoved: GameObject;

  gameStart: void;
  gameOver: void;
  gameWin: void;
  gameReset: void;

  switchLevel: void;
  manualCameraControl: void;
};

// The whole app's events = engine events plus game events.
// ("&" here just means "all the keys from both maps".)
type AppEvents = EngineEventMap & GameEventMap;

// Create an emitter instance
const Emitter = mitt<AppEvents>();

export default Emitter;
