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
    <View style={styles.container} onTouchEnd={onFocus}>
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        photo={true}
      />
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={onToggleFlash}>
          <Text style={styles.text}>
            {flash === "on" ? "Flash On" : "Flash Off"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={onCapture}>
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
