import * as THREE from "three";
import * as RAPIER from "@dimforge/rapier2d";
import Experience from "../../experience";
import Physics from "../../physics";
import GameObjectType from "../../utils/types/gameObjectType";
import UserData from "../../utils/types/userData";
import Emitter from "../../utils/eventEmitter";

export default class GameSensor {
  protected experience: Experience;
  protected physics: Physics;

  public physicsBody!: RAPIER.RigidBody;

  public targetPhysicsBody?: RAPIER.RigidBody;
  public isIntersectingTarget?: boolean;

  public positionData?: THREE.Vector3;

  constructor(
    name: string = "GameSensor",
    gameObjectType: string,
    size: { width: number; height: number },
    position: { x: number; y: number },
    targetBody?: RAPIER.RigidBody,
    positionData?: THREE.Vector3
  ) {
    this.experience = Experience.getInstance();
    this.physics = this.experience.physics;

    this.createObject(name, gameObjectType, size, position);

    // Optional set target in constructor
    if (targetBody) {
      this.setIntersectingTarget(targetBody);
    }

    // Optional set camera in constructor
    if (positionData) {
      this.positionData = positionData;
    }

    // Remove targetPhysicsBody if it was destroyed
    Emitter.on("objectRemoved", (removedObjectName) => {
      if (
        removedObjectName ===
        (this.targetPhysicsBody?.userData as UserData).name
      ) {
      }
      this.targetPhysicsBody = undefined;
    });
  }

  // Combines setMesh and setPhysics, hopefully less ambiguous with gameObjectType
  private createObject(
    name: string,
    gameObjectType: string,
    size: { width: number; height: number },
    position: { x: number; y: number }
  ) {
    let physicsShape;

    switch (gameObjectType) {
      case GameObjectType.CUBE:
        physicsShape = RAPIER.ColliderDesc.cuboid(
          size.width / 2,
          size.height / 2
        )
          .setSensor(true)
          .setActiveCollisionTypes(RAPIER.ActiveCollisionTypes.KINEMATIC_FIXED);
        break;
      case GameObjectType.SPHERE:
        physicsShape = RAPIER.ColliderDesc.ball(size.width)
          .setSensor(true)
          .setActiveCollisionTypes(RAPIER.ActiveCollisionTypes.KINEMATIC_FIXED);
        break;

      // Sensor can't be a Sprite or Map_Structure
      default:
        physicsShape = RAPIER.ColliderDesc.cuboid(
          size.width / 2,
          size.height / 2
        )
          .setSensor(true)
          .setActiveCollisionTypes(RAPIER.ActiveCollisionTypes.KINEMATIC_FIXED);
        break;
    }

    // Create physicsBody/rigidBody, set type, position, rotation (in radians), userdata,
    this.physicsBody = this.physics.world.createRigidBody(
      RAPIER.RigidBodyDesc.fixed()
    );

    this.physicsBody.setTranslation({ x: position.x, y: position.y }, true);

    this.physicsBody.userData = {
      name: name,
      gameEntityType: this.constructor.name,
    } as UserData;

    // Create and attach collider to physicsBody/rigidbody
    this.physics.world.createCollider(physicsShape!, this.physicsBody);
  }

  public setIntersectingTarget(target: RAPIER.RigidBody) {
    this.isIntersectingTarget = false;
    this.targetPhysicsBody = target;
  }

  public update(callback?: () => void) {
    // Check that targetPhysicsBody first exists, and then check if they are intersecting
    if (
      this.targetPhysicsBody &&
      this.targetPhysicsBody.collider(0) &&
      this.physics.world.intersectionPair(
        this.physicsBody.collider(0),
        this.targetPhysicsBody.collider(0)
      )
    ) {
      this.isIntersectingTarget = true;
    } else {
      this.isIntersectingTarget = false;
    }

    // If a callback is provided, invoke it
    if (callback) {
      callback();
    }
  }

  public destroy() {
    // Remove physics body and collider from the physics world
    this.physics.world.removeCollider(this.physicsBody.collider(0), true);
    this.physics.world.removeRigidBody(this.physicsBody);

    // Nullify all properties to release references
    this.physicsBody = null as any;
    this.targetPhysicsBody = null as any;
    this.positionData = null as any;
    this.experience = null as any;
    this.physics = null as any;

    this.isIntersectingTarget = null as any;
  }
}
