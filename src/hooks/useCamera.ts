import { useState, useEffect, useRef } from 'react';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
} from 'react-native-vision-camera';

export const useCamera = () => {
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');
  const cameraRef = useRef<Camera>(null);
  const [flash, setFlash] = useState<'on' | 'off'>('off');

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  const takePicture = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePhoto({
        flash,
      });
      return photo;
    }
  };

  const toggleFlash = () => {
    setFlash(flash === 'off' ? 'on' : 'off');
  };

  const focus = async (point: { x: number; y: number }) => {
    if (cameraRef.current) {
      await cameraRef.current.focus(point);
    }
  };

  return {
    hasPermission,
    device,
    cameraRef,
    flash,
    takePicture,
    toggleFlash,
    focus,
  };
};
