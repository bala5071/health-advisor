import React from "react";
import { View, StyleSheet, TouchableOpacity, Text } from "react-native";
import { Camera, CameraDevice } from "react-native-vision-camera";

interface CameraViewProps {
  device: CameraDevice;
  cameraRef: React.Ref<Camera>;
  onCapture: () => void;
  onToggleFlash: () => void;
  onFocus: (event: any) => void;
  flash: "on" | "off";
}

export default function CameraView({
  device,
  cameraRef,
  onCapture,
  onToggleFlash,
  onFocus,
  flash,
}: CameraViewProps) {
  return (
    <View style={styles.container} onTouchEnd={onFocus} accessible={false}>
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        photo={true}
      />
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.button}
          onPress={onToggleFlash}
          accessibilityRole="button"
          accessibilityLabel={flash === "on" ? "Turn flash off" : "Turn flash on"}
          accessibilityHint="Toggles the camera flash"
        >
          <Text style={styles.text}>
            {flash === "on" ? "Flash On" : "Flash Off"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.button}
          onPress={onCapture}
          accessibilityRole="button"
          accessibilityLabel="Capture photo"
          accessibilityHint="Takes a picture for analysis"
        >
          <Text style={styles.text}>Capture</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  buttonContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 20,
  },
  button: {
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 10,
    borderRadius: 5,
  },
  text: {
    fontSize: 18,
    color: "white",
  },
});
