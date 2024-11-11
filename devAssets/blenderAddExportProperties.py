import bpy

# Function to add custom properties to selected objects if they don't already exist

# Iterate over all objects in the scene
for obj in bpy.context.scene.objects:
    # Only process mesh objects
    if obj.type == 'MESH':  
        if "gameObjectType" not in obj:
            obj["gameObjectType"] = "platform"  # Set the default value for gameObjectType
        if "gameObjectValue" not in obj:
            obj["gameObjectValue"] = 0  # Set the default value for gameObjectValue
        if "gameObjectVisible" not in obj:
            obj["gameObjectVisible"] = true  # Set the default value for gameObjectVisible
            
        if "gameObjectType" in obj:
            obj["gameObjectType"] = "platform"  # Set the default value for gameObjectType
        if "gameObjectValue" in obj:
            obj["gameObjectValue"] = 0  # Set the default value for gameObjectValue
        if "gameObjectVisible" in obj:
            obj["gameObjectVisible"] = true  # Set the default value for gameObjectVisible

print("Custom properties added to objects.")