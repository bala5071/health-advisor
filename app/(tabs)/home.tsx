import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import LoadingSpinner from '../../src/components/common/LoadingSpinner';
import Button from '../../src/components/common/Button';
import Card from '../../src/components/common/Card';
import { useAgentPipeline } from '../../src/hooks/useAgentPipeline';
import { useAuth } from '../../src/components/AuthProvider';
import SyncStatusIndicator from '../../src/components/SyncStatusIndicator';

let cameraAvailable = true;
let CameraView: any;
let useCamera: any;

try {
  CameraView = require('../../src/components/camera/CameraView').default;
  useCamera = require('../../src/hooks/useCamera').useCamera;
} catch (_e) {
  cameraAvailable = false;
}

const CameraHome = () => {
  const router = useRouter();
  const {
    hasPermission,
    device,
    cameraRef,
    flash,
    takePicture,
    toggleFlash,
    focus,
  } = useCamera();

  const { user } = useAuth();
  const { status, result, error, message, run, reset } = useAgentPipeline();
  const [lastCapturedUri, setLastCapturedUri] = useState<string | null>(null);

  const statusMessage = useMemo(() => {
    if (status === 'idle') return '';
    return message || '';
  }, [message, status]);

  const isAnalyzing = status === 'running';

  const handleResetCamera = useCallback(() => {
    reset();
    setLastCapturedUri(null);
  }, [reset]);

  const handleCapture = async () => {
    if (isAnalyzing) return;
    const photo = await takePicture();
    if (photo) {
      const uri = photo.path;
      setLastCapturedUri(uri);
      const res = await run({ imageUri: uri, userId: user?.id ?? null });
      if (res?.visionResult?.productDetected) {
        router.push({
          pathname: '/scan/result',
          params: {
            result: JSON.stringify(res),
          },
        });
      }
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

  const showNoProduct = status === 'done' && Boolean(result) && result?.visionResult?.productDetected === false;
  const showError = status === 'error' || Boolean(error);

  return (
    <View style={styles.container}>
      <CameraView
        device={device}
        cameraRef={cameraRef}
        flash={flash}
        onCapture={handleCapture}
        onToggleFlash={toggleFlash}
        onFocus={handleFocus}
      />

      <View style={styles.syncPill}>
        <SyncStatusIndicator />
      </View>

      {isAnalyzing ? (
        <View style={styles.overlay}>
          <Card>
            <View style={styles.overlayContent}>
              <LoadingSpinner />
              <Text style={styles.overlayText}>{statusMessage}</Text>
            </View>
          </Card>
        </View>
      ) : null}

      {showNoProduct ? (
        <View style={styles.overlay}>
          <Card>
            <Text style={styles.title}>No product detected. Please scan a product label.</Text>
            <Button title="Try Again" onPress={handleResetCamera} />
          </Card>
        </View>
      ) : null}

      {showError ? (
        <View style={styles.overlay}>
          <Card>
            <Text style={styles.title}>Analysis failed. Please try again.</Text>
            <Button
              title="Retry"
              onPress={async () => {
                if (!lastCapturedUri) {
                  handleResetCamera();
                  return;
                }
                const res = await run({ imageUri: lastCapturedUri, userId: user?.id ?? null });
                if (res?.visionResult?.productDetected) {
                  router.push({
                    pathname: '/scan/result',
                    params: {
                      result: JSON.stringify(res),
                    },
                  });
                }
              }}
            />
            <Button title="Try Again" onPress={handleResetCamera} variant="secondary" />
          </Card>
        </View>
      ) : null}
    </View>
  );
};

const Home = () => {
  if (!cameraAvailable) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <Text style={{ fontSize: 16, textAlign: 'center' }}>
          Camera module is not available in this runtime. Use a development build or remove vision-camera.
        </Text>
      </View>
    );
  }

  return <CameraHome />;
};

export default Home;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  syncPill: {
    position: 'absolute',
    left: 16,
    top: 14,
  },
  overlay: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
  },
  overlayContent: {
    minHeight: 90,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayText: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 10,
    textAlign: 'center',
  },
});
