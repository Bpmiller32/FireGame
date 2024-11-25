import bpy
import json

# Create a dictionary to store bounding box information
blender_objects = {}

# Iterate over all objects in the scene
for obj in bpy.context.scene.objects:
    # Only process mesh objects
    if obj.type == 'MESH':  
        # Get the object's bounding box dimensions
        bounding_box = [obj.matrix_world @ vert.co for vert in obj.data.vertices]
        min_x = min([v[0] for v in bounding_box])
        max_x = max([v[0] for v in bounding_box])
        min_y = min([v[1] for v in bounding_box])
        max_y = max([v[1] for v in bounding_box])
        min_z = min([v[2] for v in bounding_box])
        max_z = max([v[2] for v in bounding_box])

        # Calculate bounding box width, height, and depth
        bb_width = max_x - min_x
        bb_height = max_y - min_y
        bb_depth = max_z - min_z

        # Get the scale of the object
        scale_x = obj.scale.x * 2
        scale_y = obj.scale.y * 2
        scale_z = obj.scale.z * 2

        # Calculate position (center) of bounding box
        position = [(min_x + max_x) / 2, (min_y + max_y) / 2, (min_z + max_z) / 2]

        # Get the rotation in radians (Blender's default is radians)
        rotation_radians = [obj.rotation_euler.x, obj.rotation_euler.y, obj.rotation_euler.z]
        
        # Grab user defined variables
        gameObjectType = None
        gameObjectValue = None
        gameObjectVisible = None
        if "gameObjectType" in obj:
            gameObjectType = obj["gameObjectType"]
        if "gameObjectValue" in obj:    
            gameObjectValue = obj["gameObjectValue"]
        if "gameObjectVisible" in obj:
            gameObjectVisible = obj["gameObjectVisible"]

        # Store bounding box coordinates, dimensions, and position in the dictionary
        blender_objects[obj.name] = {
            "width": scale_x,
            "height": scale_y,
            "depth": scale_z,
            "position": position,
            "rotation": rotation_radians,
            "type": gameObjectType,
            "visible":gameObjectVisible,
            "value": gameObjectValue,
        }

# Export the bounding box information to a JSON file
file_path = "/Users/billymiller/Documents/GitHub/FireGame/src/webgl/world/levels/blenderExport.json"
with open(file_path, "w") as file:
    json.dump(blender_objects, file, indent=4)

print("Dimensions, positions, and rotations for blender objects exported successfully.")
