import bpy

# Function to add custom properties to selected objects if they don't already exist

# Iterate over all objects in the scene
for obj in bpy.context.scene.objects:
    # Only process mesh objects
    if obj.type == 'MESH':  
        if "gameObjectType" not in obj:
            obj["gameObjectType"] = "platform"  # Set the default value for gameObjectType
        if "gameObjectValue0" not in obj:
            obj["gameObjectValue0"] = 0  # Set the default value for gameObjectValue0
        if "gameObjectValue1" not in obj:
            obj["gameObjectValue1"] = 0  # Set the default value for gameObjectValue1
        if "gameObjectVisible" not in obj:
            obj["gameObjectVisible"] = true  # Set the default value for gameObjectVisible
            
        if "gameObjectType" in obj:
            obj["gameObjectType"] = "platform"  # Set the default value for gameObjectType
        if "gameObjectValue0" in obj:
            obj["gameObjectValue0"] = 0  # Set the default value for gameObjectValue
        if "gameObjectValue1" in obj:
            obj["gameObjectValue1"] = 0  # Set the default value for gameObjectValue
        if "gameObjectVisible" in obj:
            obj["gameObjectVisible"] = true  # Set the default value for gameObjectVisible

print("Custom properties added to selected objects.")