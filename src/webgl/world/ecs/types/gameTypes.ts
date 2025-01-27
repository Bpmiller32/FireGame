import * as RAPIER from "@dimforge/rapier2d";
import PlayerStates from "../../../utils/types/playerStates";

type PlayerState = typeof PlayerStates[keyof typeof PlayerStates];

export interface IPlayer {
    currentFloor: number;
    state: PlayerState;
}

export interface ITrashCan {
    isOnFire: boolean;
}

export interface IGameObject {
    physicsBody?: RAPIER.RigidBody;
    currentTranslation: RAPIER.Vector;
    currentSize: RAPIER.Vector2;
    isBeingDestroyed?: boolean;
}

import Entity from "../entity";

export interface IWorld {
    player?: IPlayer;
    trashCan?: ITrashCan;
    
    // Collections
    enemies: Entity[];
    crazyEnemies: Entity[];
    trashCans: Entity[];
    winFlags: Entity[];
    cameraSensors: Entity[];
    ladderTopSensors: Entity[];
    ladderCoreSensors: Entity[];
    ladderBottomSensors: Entity[];
    walls: Entity[];
    platforms: Entity[];
    teleporters: Entity[];
}
