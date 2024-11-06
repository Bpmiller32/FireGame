import bpy

# Function to add custom properties to selected objects if they don't already exist
def add_custom_properties():
    for obj in bpy.context.selected_objects:
        if "gameObjectType" not in obj:
            obj["gameObjectType"] = "platform"  # Set the default value for gameObjectType
        if "gameObjectValue" not in obj:
            obj["gameObjectValue"] = 0  # Set the default value for gameObjectValue
            
        if "gameObjectType" in obj:
            obj["gameObjectType"] = "platform"  # Set the default value for gameObjectType
        if "gameObjectValue" in obj:
            obj["gameObjectValue"] = 0  # Set the default value for gameObjectValue

# Run the function
add_custom_properties()

print("Custom properties added to selected objects.")