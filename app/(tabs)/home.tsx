import React from 'react';
import { View, Text } from 'react-native';
import CameraView from '../../src/components/camera/CameraView';
import { useCamera } from '../../src/hooks/useCamera';
import { agentOrchestrator } from '../../src/agents/core/AgentOrchestrator';
import '../../src/agents';
import LoadingSpinner from '../../src/components/common/LoadingSpinner';

const Home = () => {
  const {
    hasPermission,
    device,
    cameraRef,
    flash,
    takePicture,
    toggleFlash,
    focus,
  } = useCamera();

  const handleCapture = async () => {
    const photo = await takePicture();
    if (photo) {
      agentOrchestrator.processImage(photo.path);
    }
  };

  const handleFocus = (event: any) => {
    focus({ x: event.nativeEvent.locationX, y: event.nativeEvent.locationY });
  };

  if (hasPermission === null) {
    return <View />;
  }
  if (hasPermission === false) {
    return <Text>No access to camera</Text>;
  }

  if (!device) {
    return <LoadingSpinner />;
  }

  return (
    <CameraView
      device={device}
      cameraRef={cameraRef}
      flash={flash}
      onCapture={handleCapture}
      onToggleFlash={toggleFlash}
      onFocus={handleFocus}
    />
  );
};

export default Home;
