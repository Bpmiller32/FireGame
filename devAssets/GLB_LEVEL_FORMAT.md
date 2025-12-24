# GLB Level Format Quick Reference

Simple guide for creating levels using Shapr3D and GLB files.

## Folder Structure = Object Types

Organize your Shapr3D file with folders to automatically set object types:

```
MyLevel/
├── Platforms/          → Regular platforms
├── OneWayPlatforms/    → One-way platforms (can jump through)
├── Walls/              → Solid walls
├── Ladders/
│   ├── Top/            → Top sensors (player can grab here)
│   ├── Core/           → Core sensors (climbing area)
│   └── Bottom/         → Bottom sensors (ladder exit)
├── Sensors/
│   └── Cameras/        → Camera trigger zones
├── Entities/           → Special objects
│   ├── player_start    → Where player spawns
│   ├── camera_start    → Initial camera position
│   ├── trash_can_01    → TrashCan object
│   ├── teleporter_01   → Teleporter
│   └── win_flag        → Win condition
└── Graphics/           → Visual only (no physics)
```

## Metadata (GLTF extras field)

Add custom properties to objects for game-specific behavior:

### Platforms & OneWayPlatforms
```json
{
  "floorLevel": 0,        // Which floor this platform belongs to (0, 1, 2, etc.)
  "isEdge": false,        // Is this an edge platform? (affects coyote time)
  "enablePoint": 12.5     // Y position where one-way collision activates
}
```

### Ladders
```json
{
  "direction": 0          // -1 = left, 1 = right, 0 = both directions
}
```

### Camera Sensors
```json
{
  "target": [35, 25, 0]   // [X, Y, Z] position to move camera to
}
```

### Teleporters
```json
{
  "destination": [10, 55] // [X, Y] position to teleport player
}
```

## Workflow

1. **Design in Shapr3D**
   - Use the folder structure above
   - Name objects clearly (e.g., `floor1_platform01`, `ladder_left`)

2. **Export as GLB**
   - File → Export → GLB format
   - Save to `src/webgl/world/levels/myLevel.glb`

3. **Add Metadata** (optional)
   - Open GLB in https://gltf.report/ or use VS Code GLTF Tools extension
   - Click objects and add `extras` properties
   - Save modified GLB

4. **Load in Game**
   ```typescript
   // In gameDirector or where you load levels
   await gameDirector.loadGLBLevel('levels/myLevel.glb');
   ```

## Defaults

If metadata is missing, these defaults apply:
- `floorLevel`: 0
- `isEdge`: false
- `direction`: 0 (bidirectional ladder)
- `enablePoint`: Middle of object's Y position

## Example GLB Structure

```
myFirstLevel.glb
├── Platforms/
│   ├── ground_platform     extras: {floorLevel: 0}
│   └── second_floor        extras: {floorLevel: 1}
├── Ladders/
│   ├── Top/
│   │   └── ladder_01       extras: {direction: -1}
│   ├── Core/
│   │   └── ladder_01       extras: {direction: -1}
│   └── Bottom/
│       └── ladder_01       extras: {direction: -1}
├── Sensors/
│   └── Cameras/
│       └── cam_trigger     extras: {target: [0, 25, 0]}
└── Entities/
    ├── player_start
    └── camera_start
```

## Tips

- **Naming**: Use descriptive names like `floor2_platform01` instead of `Cube.001`
- **Organization**: Group related objects in folders
- **Coordinates**: Shapr3D uses Y-up, parser converts to your Z-up system automatically
- **Testing**: Load level, check console for warnings about missing objects
- **Graphics**: Put visual-only objects in `Graphics/` folder to skip physics

## Loading GLB vs JSON

```typescript
// Old way (JSON from Blender)
gameDirector.loadLevelData(BlenderExport);

// New way (GLB from Shapr3D)
await gameDirector.loadGLBLevel('levels/myLevel.glb');

// Both work with the same engine!
```

That's it! Keep it simple, name things clearly, and the parser handles the rest.
