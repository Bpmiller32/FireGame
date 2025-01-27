import * as THREE from "three";
import Component from '../component';
import TransformComponent from './transformComponent';
import GameObjectType from '../../../utils/types/gameObjectType';

export default class GraphicsComponent extends Component {
    private scene: THREE.Scene;
    private transform: TransformComponent | null = null;
    private gameObjectType: string = GameObjectType.CUBE;

    private geometry?: THREE.BoxGeometry | THREE.SphereGeometry | THREE.CapsuleGeometry;
    private material?: THREE.MeshBasicMaterial | THREE.SpriteMaterial;
    private mesh?: THREE.Mesh | THREE.Sprite | THREE.Group;
    private spriteScale?: number;

    constructor(gameObjectType: string = GameObjectType.CUBE) {
        super();
        this.scene = this.experience.scene;
        this.gameObjectType = gameObjectType;
    }

    public async initialize(): Promise<void> {
        if (!this.entity) return;

        const transform = this.entity.getComponent(TransformComponent);
        if (!transform) {
            console.error('GraphicsComponent requires a TransformComponent');
            return;
        }
        this.transform = transform;
    }

    public createDebugGraphics(color: string = "white", opacity: number = 1): void {
        if (!this.transform) return;

        const isMaterialTransparent = opacity < 1;

        switch (this.gameObjectType) {
            case GameObjectType.CUBE:
                this.geometry = new THREE.BoxGeometry(
                    this.transform.currentSize.x,
                    this.transform.currentSize.y,
                    1
                );
                this.material = new THREE.MeshBasicMaterial({
                    color: color,
                    opacity: opacity,
                    transparent: isMaterialTransparent,
                });
                this.mesh = new THREE.Mesh(this.geometry, this.material);
                break;

            case GameObjectType.SPHERE:
                this.geometry = new THREE.SphereGeometry(this.transform.currentSize.x);
                this.material = new THREE.MeshBasicMaterial({
                    color: color,
                    opacity: opacity,
                    transparent: isMaterialTransparent,
                });
                this.mesh = new THREE.Mesh(this.geometry, this.material);
                break;

            default:
                this.mesh = new THREE.Mesh(this.geometry, this.material);
                break;
        }

        if (this.mesh) {
            this.scene.add(this.mesh);
            this.syncToTransform();
        }
    }

    public async createModelGraphics(resourceFromLoader: any): Promise<void> {
        this.mesh = new THREE.Group();

        const blenderMeshes = resourceFromLoader.scene.children
            .filter((child: any) => child?.isMesh)
            .map((mesh: THREE.Object3D) => (mesh as THREE.Mesh).clone());

        // Add meshes in batches
        for (let i = 0; i < blenderMeshes.length; i += 5) {
            const batch = blenderMeshes.slice(i, i + 5);
            batch.forEach((mesh: THREE.Mesh) => this.mesh!.add(mesh));
            await new Promise(resolve => setTimeout(resolve, 0));
        }

        this.scene.add(this.mesh);
        this.syncToTransform();
    }

    private syncToTransform(offset: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 }): void {
        if (!this.mesh || !this.transform) return;

        this.mesh.position.set(
            this.transform.currentPosition.x + offset.x,
            this.transform.currentPosition.y + offset.y,
            offset.z
        );

        this.mesh.rotation.set(
            this.mesh.rotation.x,
            this.mesh.rotation.y,
            this.transform.rotation
        );
    }

    public update(deltaTime: number): void {
        this.syncToTransform();
    }

    private disposeMeshHelper(object: THREE.Object3D): void {
        if (object instanceof THREE.Mesh || object instanceof THREE.Sprite) {
            object.geometry?.dispose();

            const materials = Array.isArray(object.material) 
                ? object.material 
                : [object.material];
            materials.forEach(material => material?.dispose());
        }
    }

    public destroy(): void {
        if (this.mesh) {
            this.disposeMeshHelper(this.mesh);
            this.scene.remove(this.mesh);

            this.mesh.children.forEach(child => {
                this.disposeMeshHelper(child);
            });

            this.mesh.clear();
            this.mesh = undefined;
        }

        this.geometry?.dispose();
        this.material?.dispose();
    }
}
