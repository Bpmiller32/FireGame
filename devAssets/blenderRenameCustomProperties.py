import bpy

# Iterate through all selected objects
for obj in bpy.context.selected_objects:
    # Check if the object has the custom property 'gameObjectType'
    if "gameObjectType" in obj:
        # Get the current value of the property
        current_value = obj["gameObjectType"]
        
        # Ensure the value is a string
        if isinstance(current_value, str):
            # Special case handling
            if current_value.lower() == "trashcan":
                obj["gameObjectType"] = "TrashCan"
            elif current_value.lower() == "playerstart":
                obj["gameObjectType"] = "PlayerStart"
            elif current_value.lower() == "camerastart":
                obj["gameObjectType"] = "CameraStart"
            elif current_value.lower() == "barrellauncher":
                obj["gameObjectType"] = "BarrelLauncher"
            elif current_value.lower() == "camerasensor":
                obj["gameObjectType"] = "CameraSensor"
            elif current_value.lower() == "laddertopsensor":
                obj["gameObjectType"] = "LadderTopSensor"
            elif current_value.lower() == "laddercoresensor":
                obj["gameObjectType"] = "LadderCoreSensor"
            elif current_value.lower() == "ladderbottomsensor":
                obj["gameObjectType"] = "LadderBottomSensor"
            elif current_value.lower() == "onewayplatform":
                obj["gameObjectType"] = "OneWayPlatform"
            else:
                # Capitalize the first letter for other values
                obj["gameObjectType"] = current_value.capitalize()
            
            print(f"Updated {obj.name}: {current_value} -> {obj['gameObjectType']}")
        else:
            print(f"Skipped {obj.name}: 'gameObjectType' is not a string.")