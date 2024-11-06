/* -------------------------------------------------------------------------- */
/*             The camera and camera controls for the webgl scene             */
/* -------------------------------------------------------------------------- */

import * as THREE from "three";
import Experience from "./experience";
import Sizes from "./utils/sizes";
import SpriteState from "./utils/types/spriteState";
import SpriteAnimations from "./environment/player/state/spriteAnimations";

export default class Camera {
  private experience: Experience;
  private sizes: Sizes;
  private scene: THREE.Scene;

  private currentOffset: THREE.Vector3;
  private leftOffset: THREE.Vector3;
  private rightOffset: THREE.Vector3;
  private centerOffset: THREE.Vector3;

  private topNdcCorners!: THREE.Vector3[];
  private topWorldCorners!: THREE.Vector3[];
  // private bottomWorldCorners: THREE.Vector3[];

  private lerpTiming: number;

  public instance!: THREE.PerspectiveCamera;

  // Create the debug mesh for the top 15% area
  debugGeometry = new THREE.PlaneGeometry(10, 1); // Placeholder dimensions
  debugMaterial = new THREE.MeshBasicMaterial({
    color: 0xff0000,
    wireframe: true,
  });
  debugMesh = new THREE.Mesh(this.debugGeometry, this.debugMaterial);
  // Create the debug mesh for the top 15% area
  debugGeometryBot = new THREE.PlaneGeometry(10, 1); // Placeholder dimensions
  debugMaterialBot = new THREE.MeshBasicMaterial({
    color: 0xff0000,
    wireframe: true,
  });
  debugMeshBot = new THREE.Mesh(this.debugGeometryBot, this.debugMaterialBot);

  constructor() {
    this.experience = Experience.getInstance();
    this.sizes = this.experience.sizes;
    this.scene = this.experience.scene;

    // Lookahead offsets
    this.currentOffset = new THREE.Vector3(0, 0, 0);
    this.leftOffset = new THREE.Vector3(0, 0, 0);
    this.rightOffset = new THREE.Vector3(0, 0, 0);
    this.centerOffset = new THREE.Vector3(0, 0, 0);

    this.lerpTiming = 1;

    this.setInstance();
    this.setLookAhead();

    // debug
    this.scene.add(this.debugMesh);
    this.scene.add(this.debugMeshBot);
  }

  private setInstance() {
    this.instance = new THREE.PerspectiveCamera(
      35,
      this.sizes.width / this.sizes.height,
      0.1,
      500
    );

    this.instance.position.set(0, 5, 50);
    this.scene.add(this.instance);
  }

  private setLookAhead() {
    // const frustumHeight =
    //   2 * Math.tan((this.instance.fov * Math.PI) / 180 / 2) * 50;
    // const frustumWidth = frustumHeight * this.instance.aspect;
    // const top15PercentHeight = frustumHeight * 0.15;
    // // Top center point at the given distance
    // const topCenter = new THREE.Vector3(
    //   0,
    //   frustumHeight / 2 - top15PercentHeight / 2,
    //   -50
    // );
    // const topRight = new THREE.Vector3(
    //   frustumWidth / 2,
    //   frustumHeight / 2 - top15PercentHeight / 2,
    //   -50
    // );
    // const topLeft = new THREE.Vector3(
    //   -frustumWidth / 2,
    //   frustumHeight / 2 - top15PercentHeight / 2,
    //   -50
    // );
    // // Convert 3D coordinates to 2D screen space
    // const topCenter2D = topCenter.clone().project(this.instance);
    // const topRight2D = topRight.clone().project(this.instance);
    // const topLeft2D = topLeft.clone().project(this.instance);
    // // Convert normalized device coordinates (NDC) to screen space
    // const widthHalf = window.innerWidth / 2;
    // const heightHalf = window.innerHeight / 2;
    // const topCenterScreen = {
    //   x: topCenter2D.x * widthHalf + widthHalf,
    //   y: -(topCenter2D.y * heightHalf) + heightHalf,
    // };
    // const topRightScreen = {
    //   x: topRight2D.x * widthHalf + widthHalf,
    //   y: -(topRight2D.y * heightHalf) + heightHalf,
    // };
    // const topLeftScreen = {
    //   x: topLeft2D.x * widthHalf + widthHalf,
    //   y: -(topLeft2D.y * heightHalf) + heightHalf,
    // };
  }

  public changeOffset(newOffset: number) {
    this.leftOffset = new THREE.Vector3(-newOffset, 0, 0);
    this.rightOffset = new THREE.Vector3(newOffset, 0, 0);
  }

  public resize() {
    this.instance.aspect = this.sizes.width / this.sizes.height;
    this.instance.updateProjectionMatrix();
  }

  public update(
    playerPosition: { x: number; y: number },
    playerState: SpriteState
  ) {
    this.UpdateTop15PercentArea();
    this.updateBottom10PercentArea();
    const scrollUp = this.IsPlayerInTop15Percent();
    const scrollDown = this.IsPlayerInBottom10Percent();

    // while (this.IsPlayerInTop15Percent()) {
    //   this.centerOffset.y += 1;
    //   this.leftOffset.y += 1;
    //   this.rightOffset.y += 1;
    // }
    // while (this.IsPlayerInBottom10Percent()) {
    //   this.centerOffset.y -= 1;
    //   this.leftOffset.y -= 1;
    //   this.rightOffset.y -= 1;
    // }
    if (scrollUp) {
      console.log("in the top 15%");
      this.centerOffset.y += 1.2;
      this.leftOffset.y += 1.2;
      this.rightOffset.y += 1.2;
    }
    if (scrollDown) {
      console.log("in the bottom 10%");
      this.centerOffset.y -= 1.2;
      this.leftOffset.y -= 1.2;
      this.rightOffset.y -= 1.2;
    }

    let targetOffset;
    switch (playerState) {
      case SpriteAnimations.IDLE_LEFT:
        targetOffset = this.centerOffset;
        break;
      case SpriteAnimations.IDLE_RIGHT:
        targetOffset = this.centerOffset;
        break;
      case SpriteAnimations.RUN_LEFT:
        targetOffset = this.leftOffset;
        break;
      case SpriteAnimations.RUN_RIGHT:
        targetOffset = this.rightOffset;
        break;

      default:
        targetOffset = this.rightOffset;
        break;
    }

    if (targetOffset == this.centerOffset) {
      this.lerpTiming = 0.5;
    } else {
      this.lerpTiming = 1;
    }

    this.currentOffset.lerp(
      targetOffset,
      this.lerpTiming * this.experience.time.delta
    );

    this.instance.position.set(
      playerPosition.x + this.currentOffset.x,
      this.currentOffset.y,
      50
    );
  }

  // Function to check if the player is in the top 15% area
  private IsPlayerInTop15Percent(): boolean {
    const playerBoundingBox = new THREE.Box3().setFromObject(
      this.experience.world.player?.mesh!
    );
    const playerTopY = playerBoundingBox.max.y; // Get the top y-coordinate of the player's bounding box

    const fov = THREE.MathUtils.degToRad(this.instance.fov);
    const height = 2 * Math.tan(fov / 2) * this.instance.position.z;
    const top15PercentHeight = height * 0.15;
    const top15PercentY =
      this.instance.position.y + height / 2 - top15PercentHeight / 2;

    return playerTopY > top15PercentY;
  }

  // Function to check if the player is in the top 15% area
  private IsPlayerInBottom10Percent(): boolean {
    const playerBoundingBox = new THREE.Box3().setFromObject(
      this.experience.world.player?.mesh!
    );
    const playerBottomY = playerBoundingBox.min.y; // Get the top y-coordinate of the player's bounding box

    const fov = THREE.MathUtils.degToRad(this.instance.fov);
    const height = 2 * Math.tan(fov / 2) * this.instance.position.z;
    const bottom10PercentHeight = height * 0.1;
    const bottom10PercentY =
      this.instance.position.y - height / 2 + bottom10PercentHeight / 2;

    return playerBottomY < bottom10PercentY;
  }

  // Function to calculate the top 15% area dimensions and position
  private UpdateTop15PercentArea(): void {
    const fov = THREE.MathUtils.degToRad(this.instance.fov); // Convert vertical FOV to radians
    const height = 2 * Math.tan(fov / 2) * this.instance.position.z; // Height of the view at the this.instance's z position
    const top15PercentHeight = height * 0.15; // 15% of the height
    const width = top15PercentHeight * this.instance.aspect; // Width based on the aspect ratio

    // Update the geometry of the debug mesh
    this.debugMesh.geometry.dispose(); // Dispose of the old geometry
    this.debugMesh.geometry = new THREE.PlaneGeometry(
      width,
      top15PercentHeight
    );

    // Position the debug mesh
    this.debugMesh.position.set(
      this.instance.position.x,
      this.instance.position.y + height / 2 - top15PercentHeight / 2,
      0
    );
  }

  // Function to calculate the bottom 10% area dimensions and position
  private updateBottom10PercentArea(): void {
    const fov = THREE.MathUtils.degToRad(this.instance.fov); // Convert vertical FOV to radians
    const height = 2 * Math.tan(fov / 2) * this.instance.position.z; // Height of the view at the camera's z position
    const bottom10PercentHeight = height * 0.1; // 10% of the height
    const width = bottom10PercentHeight * this.instance.aspect; // Width based on the aspect ratio

    // Update the geometry of the debug mesh
    this.debugMeshBot.geometry.dispose(); // Dispose of the old geometry
    this.debugMeshBot.geometry = new THREE.PlaneGeometry(
      width,
      bottom10PercentHeight
    );

    // Position the debug mesh
    this.debugMeshBot.position.set(
      this.instance.position.x,
      this.instance.position.y - height / 2 + bottom10PercentHeight / 2,
      0
    );
  }
}
