import bpy
import json

# Create a dictionary to store bounding box information
blender_objects = {}

# Iterate over all objects in the scene
for obj in bpy.context.scene.objects:
    # Only process mesh objects
    if obj.type == 'MESH':    
        # Use Blender's object location, dimensions instead of bounding box equations and scale
        position = list(obj.location)
        dimensions = list(obj.dimensions)
        rotation_radians = [obj.rotation_euler.x, obj.rotation_euler.y, obj.rotation_euler.z]
                
        # Grab user-defined variables
        gameObjectType = obj.get("gameObjectType")
        gameObjectValue0 = obj.get("gameObjectValue0")
        gameObjectValue1 = obj.get("gameObjectValue1")
        gameObjectValue2 = obj.get("gameObjectValue2")
        gameObjectValue3 = obj.get("gameObjectValue3")
        
        # Get 2D vertices only for "ConvexOneWayPlatform" or "LineOneWayPlatform" objects
        vertices_2d = []
        if gameObjectType == "ConvexOneWayPlatform" or gameObjectType == "LineOneWayPlatform":
            # Get the object's vertices in world space and project onto the X-Z plane
            vertices_2d = [[(obj.matrix_world @ vert.co)[0], (obj.matrix_world @ vert.co)[2]] for vert in obj.data.vertices]
            
            # Sort the vertices by the x-coordinate
            vertices_2d = sorted(vertices_2d, key=lambda v: v[0])

        # Store bounding box coordinates, dimensions, and position in the dictionary
        blender_objects[obj.name] = {
            "vertices": vertices_2d,
            "width": dimensions[0],
            "height": dimensions[1],
            "depth": dimensions[2],
            "position": position,
            "rotation": rotation_radians,
            "type": gameObjectType,
            "value0": gameObjectValue0,
            "value1": gameObjectValue1,
            "value2": gameObjectValue2,
            "value3": gameObjectValue3,
        }

# Export the bounding box information to a JSON file
file_path = "/Users/billymiller/Documents/GitHub/FireGame/src/webgl/world/levels/blenderExport.json"
with open(file_path, "w") as file:
    json.dump(blender_objects, file, indent=4)

print("Level data exported.")
