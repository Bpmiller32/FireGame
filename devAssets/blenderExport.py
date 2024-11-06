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

    # Calculate width, height, and depth
    width = max_x - min_x
    height = max_y - min_y
    depth = max_z - min_z

    # Calculate position (center) of bounding box
    position = [(min_x + max_x) / 2, (min_y + max_y) / 2, (min_z + max_z) / 2]
    
    # Grab user defined variables
    print("test")
    
    gameObjectType = None
    gameObjectValue = None
    if "gameObjectType" in obj:
        gameObjectType = obj["gameObjectType"]
    if "gameObjectValue" in obj:    
        gameObjectValue = obj["gameObjectValue"]

    # Store bounding box coordinates, dimensions, and position in the dictionary
    bounding_boxes[obj.name] = {
        "min_x": min_x,
        "max_x": max_x,
        "min_y": min_y,
        "max_y": max_y,
        "min_z": min_z,
        "max_z": max_z,
        "width": width,
        "height": height,
        "depth": depth,
        "position": position,
        "type": gameObjectType,
        "value": gameObjectValue
    }

# Export the bounding box information to a JSON file
#file_path = "/Users/billymiller/Documents/GitHub/FireGame/three/src/webgl/environment/objects/blenderExport.json"
file_path = "C:\\Users\\bpmil\\Downloads\\fire\\src\\webgl\\environment\\objects\\blenderExport.json"
with open(file_path, "w") as file:
    json.dump(bounding_boxes, file, indent=4)

print("Bounding box coordinates, dimensions, and position for selected geometries exported successfully to selected_bounding_boxes_with_dimensions_and_position.json")
