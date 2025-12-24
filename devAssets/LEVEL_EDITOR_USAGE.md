# Level Editor Usage Guide

## Quick Start: Creating Levels in Shapr3D

### 1. Design Your Level
Create shapes in Shapr3D with meaningful names:
- `platform-1`, `platform-2` → Regular platforms
- `wall-left`, `wall-right` → Solid walls
- `player-start` → Player spawn point
- `camera-start` → Camera initial position
- `enemy-spawn-1` → Enemy locations
- `ladder-top`, `ladder-core`, `ladder-bottom` → Ladder sections

### 2. Add Metadata (Optional)
Select an object → Info → Add Custom Property:
- **name**: `type` → **value**: `Platform`
- **name**: `isOneWay` → **value**: `true`
- **name**: `floorLevel` → **value**: `1`

### 3. Export
- File → Export → GLB format
- Save to `src/assets/levels/your-level.glb`

### 4. Load in Game
```typescript
// In gameDirector.ts or wherever you load levels
await gameDirector.loadGLBLevel("/assets/levels/your-level.glb");
```

## Naming Conventions

### Automatic Type Detection
Objects are automatically categorized by name patterns:

| Name Pattern | Detected Type | Example |
|--------------|---------------|---------|
| `platform*`, `floor*`, `ground*` | Platform | `platform-1` |
| `wall*`, `barrier*` | Wall | `wall-left` |
| `player*`, `spawn*` | PlayerStart | `player-start` |
| `camera*` | CameraStart | `camera-start` |
| `ladder*` | LadderSensor | `ladder-top-1` |
| `enemy*` | Enemy | `enemy-spawn` |
| `sensor*`, `trigger*` | Sensor | `sensor-door` |

### Folder Organization (Alternative)
You can also organize by folders in Shapr3D:
```
Level/
├─ platforms/
│  ├─ main-floor
│  └─ floating-platform
├─ walls/
│  ├─ left-boundary
│  └─ right-boundary
└─ entities/
   ├─ player-start
   └─ camera-start
```

## Custom Properties

Add these to objects for advanced configuration:

### Common Properties
```
type: "Platform" | "Wall" | "OneWayPlatform" | "PlayerStart" etc.
visible: true | false
```

### Platform Properties
```
isOneWay: true        # Player can jump through from below
floorLevel: 1         # Which floor this platform belongs to
isEdge: true          # Enable coyote time at edges
oneWayPoint: 10.5     # Y-coordinate where collision becomes solid
```

### Sensor Properties
```
targetX: 100          # Teleport/camera destination
targetY: 50
targetZ: 25
triggerRadius: 5      # Detection radius
```

### Enemy Properties
```
enemyType: "regular" | "crazy"
patrolPath: "back-and-forth" | "circular"
speed: 5.0
```

## Tips & Best Practices

### 1. Use Descriptive Names
❌ Bad: `Cube.001`, `Cube.002`
✅ Good: `platform-start`, `wall-left-boundary`

### 2. Organize Your Scene
Group related objects:
```
Level-1/
  environment/
    platforms/
    walls/
  gameplay/
    player-start
    enemies/
  decorations/
```

### 3. Set Proper Scales
- 1 unit in Shapr3D = 1 unit in game
- Player is ~2 units tall
- Standard platform height: 2 units
- Standard jump height: ~5 units

### 4. Test Frequently
Export → Load → Test → Iterate

### 5. Keep It Simple
- Start with basic shapes
- Add detail later
- Focus on gameplay first

## Troubleshooting

### Object Not Loading?
- Check the name matches a pattern (see table above)
- Verify the GLB file is in the correct path
- Check browser console for parser warnings

### Wrong Position?
- Shapr3D uses Y-up, game uses Z-up (auto-converted)
- Origin point matters - use "Set Origin" in Shapr3D

### Collision Issues?
- Check object scale (very small = physics issues)
- Verify `isOneWay` property for jump-through platforms
- Use `oneWayPoint` to fine-tune collision height

## Advanced: JSON Format (Legacy)

You can still use JSON files if preferred:
```json
{
  "platform-1": {
    "type": "Platform",
    "position": [0, 0, 0],
    "width": 10,
    "height": 2,
    "depth": 2,
    "rotation": [0, 0, 0]
  }
}
```

Load with:
```typescript
import MyLevel from "./levels/my-level.json";
await gameDirector.loadLevelData(MyLevel);
```

## Need Help?

- See `GLB_LEVEL_FORMAT.md` for technical details
- Check `glbLevelParser.ts` for parser implementation
- Look at `blenderExport.json` for JSON examples
