import bpy
import json

# Create a dictionary to store bounding box information
bounding_boxes = {}

# Get selected objects
selected_objects = [obj for obj in bpy.context.selected_objects if obj.type == 'MESH']

# Iterate over selected objects
for obj in selected_objects:
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
    scale_x = obj.scale.x
    scale_y = obj.scale.y
    scale_z = obj.scale.z

    # Calculate position (center) of bounding box
    position = [(min_x + max_x) / 2, (min_y + max_y) / 2, (min_z + max_z) / 2]

    # Get the rotation in radians (Blender's default is radians)
    rotation_radians = [obj.rotation_euler.x, obj.rotation_euler.y, obj.rotation_euler.z]
    
    # Grab user defined variables
    gameObjectType = None
    gameObjectValue = None
    if "gameObjectType" in obj:
        print("test")
        gameObjectType = obj["gameObjectType"]
    if "gameObjectValue" in obj:    
        gameObjectValue = obj["gameObjectValue"]

    # Store bounding box coordinates, dimensions, and position in the dictionary
    bounding_boxes[obj.name] = {
        "width": scale_x,
        "height": scale_y,
        "depth": scale_z,
        "min_x": min_x,
        "max_x": max_x,
        "min_y": min_y,
        "max_y": max_y,
        "min_z": min_z,
        "max_z": max_z,
        "bb_width": bb_width,
        "bb_height": bb_height,
        "bb_depth": bb_depth,
        "position": position,
        "rotation": rotation_radians,
        "type": gameObjectType,
        "value": gameObjectValue
    }

# Export the bounding box information to a JSON file
file_path = "/Users/billymiller/Documents/GitHub/FireGame/src/webgl/world/levels/blenderExport.json"
with open(file_path, "w") as file:
    json.dump(bounding_boxes, file, indent=4)

print("Bounding box coordinates, dimensions, position, and rotation for selected geometries exported successfully.")
