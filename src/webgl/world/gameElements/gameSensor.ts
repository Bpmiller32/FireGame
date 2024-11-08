import * as THREE from "three";
import * as RAPIER from "@dimforge/rapier2d";
import Experience from "../../experience";
import Physics from "../../physics";
import GameObjectType from "../../utils/types/gameObjectType";

export default class GameSensor {
  protected experience: Experience;
  protected physics: Physics;

  public body!: RAPIER.RigidBody;
  public currentTranslation!: RAPIER.Vector;

  public targetBody?: RAPIER.RigidBody;
  public isIntersectingTarget?: boolean;

  public cameraPosition?: THREE.Vector3;

  constructor(
    gameObjectType: string,
    size: { width: number; height: number },
    position: { x: number; y: number },
    targetBody?: RAPIER.RigidBody,
    cameraPosition?: THREE.Vector3
  ) {
    this.experience = Experience.getInstance();
    this.physics = this.experience.physics;

    this.createObject(gameObjectType, size, position);

    // Optional set target in constructor
    if (targetBody) {
      this.setIntersectingTarget(targetBody);
    }

    // Optional set camera in constructor
    if (cameraPosition) {
      this.cameraPosition = cameraPosition;
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

      // TODO, sensor can't be a sprite or Map_Structure, guard against better somehow
      default:
        shape = RAPIER.ColliderDesc.cuboid(size.width / 2, size.height / 2)
          .setSensor(true)
          .setActiveCollisionTypes(RAPIER.ActiveCollisionTypes.KINEMATIC_FIXED);
        break;
    }

    this.body = this.physics.world.createRigidBody(
      RAPIER.RigidBodyDesc.fixed()
    );
    this.body.setTranslation({ x: position.x, y: position.y }, true);
    this.currentTranslation = this.body.translation();
    this.body.userData = { name: this.constructor.name };

    this.physics.world.createCollider(shape!, this.body);
  }

  public setIntersectingTarget(target: RAPIER.RigidBody) {
    this.isIntersectingTarget = false;
    this.targetBody = target;
  }

  public update() {
    if (
      this.targetBody &&
      this.experience.physics.world.intersectionPair(
        this.body.collider(0),
        this.targetBody.collider(0)
      )
    ) {
      this.isIntersectingTarget = true;
    } else {
      this.isIntersectingTarget = false;
    }
  }
}
