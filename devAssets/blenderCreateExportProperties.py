import bpy

# Function to add custom properties to selected objects if they don't already exist

# Iterate over all objects in the scene
for obj in bpy.context.scene.objects:
    # Only process mesh objects
    if obj.type == 'MESH':  
        if "gameObjectType" not in obj:
            obj["gameObjectType"] = "GraphicsObject"
        if "gameObjectValue0" not in obj:
            obj["gameObjectValue0"] = 0  
        if "gameObjectValue1" not in obj:
            obj["gameObjectValue1"] = 0  
        if "gameObjectValue2" not in obj:
            obj["gameObjectValue2"] = 0 
        if "gameObjectValue3" not in obj:
            obj["gameObjectValue3"] = 0   
            
        if "gameObjectVisible" in obj:
            del obj["gameObjectVisible"]

print("Custom properties added to selected objects.")