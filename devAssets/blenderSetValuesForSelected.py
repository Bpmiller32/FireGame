import bpy

# Iterate over all selected objects
for obj in bpy.context.selected_objects:
    # Get the custom property value safely
    game_object_value = obj.get("gameObjectValue0", None)  # Use get to avoid KeyError
    
    if game_object_value is not None:
        obj["gameObjectValue1"] = 1
    
#    # Set the custom property
#    if game_object_value is None:
#        obj["gameObjectValue0"] = 0
#    else:
#        # obj["gameObjectValue0"] = game_object_value
#        del obj["gameObjectValue"]
    