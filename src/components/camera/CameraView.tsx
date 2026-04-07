import React from "react";
import { View, StyleSheet, TouchableOpacity, Text } from "react-native";
import { Camera, CameraDevice } from "react-native-vision-camera";

interface CameraViewProps {
  device: CameraDevice;
  cameraRef: React.Ref<Camera>;
  onCapture: () => void;
  onToggleFlash: () => void;
  onFocus: (event: any) => void;
  onCameraError?: (error: unknown) => void;
  flash: "on" | "off";
  showControls?: boolean;
  captureLabel?: string;
}

export default function CameraView({
  device,
  cameraRef,
  onCapture,
  onToggleFlash,
  onFocus,
  onCameraError,
  flash,
  showControls = true,
  captureLabel = 'Scan Now',
}: CameraViewProps) {
  return (
    <View style={styles.container} onTouchEnd={onFocus} accessible={false}>
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        photo={true}
        video={false}
        audio={false}
        onError={onCameraError}
      />
      {showControls ? (
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.button}
            onPress={onToggleFlash}
            accessibilityRole="button"
            accessibilityLabel={flash === "on" ? "Turn flash off" : "Turn flash on"}
            accessibilityHint="Toggles the camera flash"
          >
            <Text style={styles.text}>
              {flash === "on" ? "Flash: On" : "Flash: Off"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.captureButton]}
            onPress={onCapture}
            accessibilityRole="button"
            accessibilityLabel="Capture photo"
            accessibilityHint="Takes a picture for analysis"
          >
            <Text style={styles.text}>{captureLabel}</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  buttonContainer: {
    position: "absolute",
    bottom: 98,
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 3,
  },
  button: {
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 999,
    minWidth: 112,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
  },
  captureButton: {
    backgroundColor: "rgba(0,123,255,0.92)",
    minWidth: 148,
    paddingVertical: 14,
    borderColor: "rgba(255,255,255,0.38)",
  },
  text: {
    fontSize: 15,
    fontWeight: "800",
    color: "white",
  },
});
