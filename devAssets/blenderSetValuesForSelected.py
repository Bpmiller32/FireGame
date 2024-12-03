import bpy

# Iterate over all selected objects
for obj in bpy.context.selected_objects:
    # Get the custom property value safely
    game_object_value = obj.get("gameObjectType", None)  # Use get to avoid KeyError
    
    if game_object_value is not None:
        obj["gameObjectType"] = "OneWayPlatform"