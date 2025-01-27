/* -------------------------------------------------------------------------- */
/*             Typescript event emitter using Mitt and events list            */
/* -------------------------------------------------------------------------- */

import mitt from "mitt";
import { IGameObject } from "../world/ecs/types/gameTypes";

type EventMap = {
  // app state
  startApp: void;
  indicateLoading: void;
  appReady: void;
  appError: void;
  // time
  tick: void;
  // sizes
  resize: void;
  // resourceLoader
  resourcesReady: void;

  // Game events
  gameObjectRemoved: IGameObject;

  gameStart: void;
  gameOver: void;
  gameWin: void;
  gameReset: void;

  switchLevel: void;
  manualCameraControl: void;
};

// Create an emitter instance
const Emitter = mitt<EventMap>();

export default Emitter;
