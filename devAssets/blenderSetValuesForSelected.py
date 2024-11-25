import bpy

# Define the custom value you want to set
custom_value = True

# Iterate over all selected objects
for obj in bpy.context.selected_objects:
    # Set a custom property
    obj["isConnectedLadder"] = custom_value
    print(f"Set custom_value to {custom_value} on {obj.name}")