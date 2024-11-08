import * as THREE from "three";
import * as RAPIER from "@dimforge/rapier2d";
import Experience from "../../experience";
import Physics from "../../physics";
import GameObjectType from "../../utils/types/gameObjectType";

export default class GameSensor {
  protected experience: Experience;
  protected physics: Physics;

  public physicsBody!: RAPIER.RigidBody;
  public currentTranslation!: RAPIER.Vector;

  public targetPhysicsBody?: RAPIER.RigidBody;
  public isIntersectingTarget?: boolean;

  public targetCameraPosition?: THREE.Vector3;

  constructor(
    gameObjectType: string,
    size: { width: number; height: number },
    position: { x: number; y: number },
    targetBody?: RAPIER.RigidBody,
    targetCameraPosition?: THREE.Vector3
  ) {
    this.experience = Experience.getInstance();
    this.physics = this.experience.physics;

    this.createObject(gameObjectType, size, position);

    // Optional set target in constructor
    if (targetBody) {
      this.setIntersectingTarget(targetBody);
    }

    // Optional set camera in constructor
    if (targetCameraPosition) {
      this.targetCameraPosition = targetCameraPosition;
    }
  }

  // Combines setMesh and setPhysics, hopefully less ambiguous with gameObjectType
  private createObject(
    gameObjectType: string,
    size: { width: number; height: number },
    position: { x: number; y: number }
  ) {
    let shape;

    switch (gameObjectType) {
      case GameObjectType.CUBE:
        shape = RAPIER.ColliderDesc.cuboid(size.width / 2, size.height / 2)
          .setSensor(true)
          .setActiveCollisionTypes(RAPIER.ActiveCollisionTypes.KINEMATIC_FIXED);
        break;
      case GameObjectType.SPHERE:
        shape = RAPIER.ColliderDesc.ball(size.width)
          .setSensor(true)
          .setActiveCollisionTypes(RAPIER.ActiveCollisionTypes.KINEMATIC_FIXED);
        break;
      case GameObjectType.CAPSULE:
        shape = RAPIER.ColliderDesc.capsule(size.height / 2, size.width)
          .setSensor(true)
          .setActiveCollisionTypes(RAPIER.ActiveCollisionTypes.KINEMATIC_FIXED);
        break;

      // Sensor can't be a Sprite or Map_Structure
      default:
        shape = RAPIER.ColliderDesc.cuboid(size.width / 2, size.height / 2)
          .setSensor(true)
          .setActiveCollisionTypes(RAPIER.ActiveCollisionTypes.KINEMATIC_FIXED);
        break;
    }

    this.physicsBody = this.physics.world.createRigidBody(
      RAPIER.RigidBodyDesc.fixed()
    );
    this.physicsBody.setTranslation({ x: position.x, y: position.y }, true);
    this.currentTranslation = this.physicsBody.translation();
    this.physicsBody.userData = { name: this.constructor.name };

    this.physics.world.createCollider(shape!, this.physicsBody);
  }

  public setIntersectingTarget(target: RAPIER.RigidBody) {
    this.isIntersectingTarget = false;
    this.targetPhysicsBody = target;
  }

  public update() {
    // Check that targetPhysicsBody first exists, and then check if they are intersecting
    if (
      this.targetPhysicsBody &&
      this.experience.physics.world.intersectionPair(
        this.physicsBody.collider(0),
        this.targetPhysicsBody.collider(0)
      )
    ) {
      this.isIntersectingTarget = true;
    } else {
      this.isIntersectingTarget = false;
    }
  }
}
