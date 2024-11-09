import Experience from "../../experience";
import Physics from "../../physics";
import UserData from "../../utils/types/userData";
import World from "../levels/world";
import Player from "../player/player";

export default class GameDirector {
  private experience: Experience;
  private world: World;
  private physics: Physics;

  private player: Player;

  public isGameUpdating: boolean = true;

  constructor() {
    this.experience = Experience.getInstance();
    this.world = this.experience.world;
    this.physics = this.experience.physics;

    this.player = this.world.player!;
  }

  public update() {
    if (!this.player) {
      return;
    }

    for (
      let i = 0;
      i < this.player.characterController.numComputedCollisions();
      i++
    ) {
      const collision = this.player.characterController.computedCollision(i);

      if (
        (collision!.collider?.parent()?.userData as UserData).name === "Enemy"
      ) {
        console.log("hit enemy");
        this.player.teleportRelative(-10, 0);
      }
    }

    // this.physics.world.contactPairsWith(
    //   this.player.physicsBody.collider(0),
    //   (otherCollider) => {
    //     if ((otherCollider.parent()?.userData as UserData).name === "Enemy") {
    //       console.log("hit enemy");
    //     }
    //   }
    // );
  }
}
