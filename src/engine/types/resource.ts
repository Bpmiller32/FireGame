/* -------------------------------------------------------------------------- */
/*                         RESOURCE LOADING DEFINITIONS                       */
/* -------------------------------------------------------------------------- */
/*
 * Defines the structure for loadable game resources.
 * 
 * Resources include:
 * - Textures (sprites, UI elements, backgrounds)
 * - 3D Models (GLTF/GLB files with DRACO compression)
 * - Audio files (music, sound effects) - future
 * - Level data (JSON, GLB level files) - loaded separately
 * 
 * Used by ResourceLoader to batch load assets at game startup.
 */
/* -------------------------------------------------------------------------- */

/**
 * Resource type identifiers
 * Determines which loader to use for the asset
 */
export type ResourceType = 
  | 'texture'      // Images, spritesheets (PNG, JPG, WebP)
  | 'gltfModel'    // 3D models (GLTF, GLB with DRACO)
  | 'audio'        // Sound files (MP3, WAV, OGG) - future
  | 'json'         // Data files - future
  | 'font';        // Font files - future

/**
 * Resource definition for asset loading
 * 
 * @example
 * ```typescript
 * const resources: Resource[] = [
 *   {
 *     name: 'playerSprite',
 *     type: 'texture',
 *     path: '/assets/textures/player.png'
 *   },
 *   {
 *     name: 'enemyModel',
 *     type: 'gltfModel',
 *     path: '/assets/models/enemy.glb'
 *   }
 * ];
 * 
 * // Later, access loaded resources:
 * const sprite = resourceLoader.items.playerSprite as THREE.Texture;
 * const model = resourceLoader.items.enemyModel as THREE.Object3D;
 * ```
 */
export default interface Resource {
  /**
   * Unique identifier for this resource
   * Used to access the loaded asset from ResourceLoader.items
   */
  name: string;
  
  /**
   * Type of resource (texture, gltfModel, etc.)
   * Determines which Three.js loader to use
   */
  type: ResourceType;
  
  /**
   * File path or URL to the resource
   * Can be:
   * - Relative path from public folder: "/assets/textures/sprite.png"
   * - Absolute URL: "https://cdn.example.com/asset.glb"
   * - Imported URL from Vite: import assetUrl from "./asset.png?url"
   */
  path: string;
  
  /**
   * Optional metadata for the resource
   * Can store additional info like dimensions, compression settings, etc.
   */
  metadata?: Record<string, any>;
}

/**
 * Resource collection - array of resources to load
 */
export type ResourceCollection = Resource[];

/**
 * Helper function to create a texture resource
 * 
 * @param name - Resource identifier
 * @param path - Path to texture file
 * @returns Properly formatted Resource object
 */
export function createTextureResource(name: string, path: string): Resource {
  return { name, type: 'texture', path };
}

/**
 * Helper function to create a GLTF model resource
 * 
 * @param name - Resource identifier
 * @param path - Path to GLTF/GLB file
 * @returns Properly formatted Resource object
 */
export function createModelResource(name: string, path: string): Resource {
  return { name, type: 'gltfModel', path };
}
