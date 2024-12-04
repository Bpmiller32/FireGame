import bpy

# Get the selected objects
selected_objects = bpy.context.selected_objects

if len(selected_objects) < 2:
    print("Please select at least two objects.")
else:
    # Use the first object as the base
    base_object = selected_objects[0]
    
    # Loop through all other selected objects
    for obj in selected_objects[1:]:
        # Add Boolean Modifier to the base object
        bool_mod = base_object.modifiers.new(name="Boolean_Union", type='BOOLEAN')
        bool_mod.operation = 'UNION'
        bool_mod.object = obj
        
        # Apply the Boolean Modifier
        bpy.context.view_layer.objects.active = base_object
        bpy.ops.object.modifier_apply(modifier=bool_mod.name)
        
        # Remove the processed object from the scene
        bpy.data.objects.remove(obj, do_unlink=True)
    
    print(f"Union completed. Remaining object: {base_object.name}")