import { useState, useEffect, useRef } from 'react';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
} from 'react-native-vision-camera';

export const useCamera = () => {
  const { hasPermission, requestPermission } = useCameraPermission();
  const [forceDefaultDevice, setForceDefaultDevice] = useState(false);
  const wideAngleDevice = useCameraDevice('back', {
    physicalDevices: ['wide-angle-camera'],
  });
  const defaultBackDevice = useCameraDevice('back');
  const device = forceDefaultDevice ? defaultBackDevice : wideAngleDevice ?? defaultBackDevice;
  const cameraRef = useRef<Camera>(null);
  const [flash, setFlash] = useState<'on' | 'off'>('off');
  const focusInProgressRef = useRef(false);
  const lastFocusAtRef = useRef(0);

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
    const now = Date.now();
    if (!cameraRef.current || focusInProgressRef.current || now - lastFocusAtRef.current < 180) {
      return;
    }

    focusInProgressRef.current = true;
    lastFocusAtRef.current = now;

    try {
      await cameraRef.current.focus(point);
    } catch (error: unknown) {
      const message = String((error as any)?.message || error || '').toLowerCase();
      const isFocusCanceled =
        message.includes('focus-canceled') ||
        message.includes('focus operation has been canceled');

      if (!isFocusCanceled) {
        if (
          message.includes('invalid-output-configuration') ||
          message.includes('output/stream configurations are invalid')
        ) {
          setForceDefaultDevice(true);
        }
      }
    } finally {
      focusInProgressRef.current = false;
    }
  };

  const handleCameraRuntimeError = (error: unknown) => {
    const message = String((error as any)?.message || error || '').toLowerCase();
    if (
      message.includes('invalid-output-configuration') ||
      message.includes('output/stream configurations are invalid')
    ) {
      setForceDefaultDevice(true);
    }
  };

  return {
    hasPermission,
    device,
    forceDefaultDevice,
    cameraRef,
    flash,
    takePicture,
    toggleFlash,
    focus,
    handleCameraRuntimeError,
  };
};
