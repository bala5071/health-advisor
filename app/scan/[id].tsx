import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  BackHandler,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Card from '../../src/components/common/Card';
import Button from '../../src/components/common/Button';
import ScanResultView from '../../src/components/scan/ScanResult';
import { useAuth } from '../../src/components/AuthProvider';
import LoadingSpinner from '../../src/components/common/LoadingSpinner';
import { useAgentPipeline } from '../../src/hooks/useAgentPipeline';
import { useTheme } from '../../src/theme/useTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

let cameraAvailable = true;
let CameraView: any;
let useCamera: any;

try {
  CameraView = require('../../src/components/camera/CameraView').default;
  useCamera = require('../../src/hooks/useCamera').useCamera;
} catch {
  cameraAvailable = false;
}

const safeJsonParse = (v: any): any => {
  if (typeof v !== 'string') return v;
  try {
    return JSON.parse(v);
  } catch {
    return null;
  }
};

export default function ScanRoute() {
  const params = useLocalSearchParams();
  const scanId = useMemo(() => {
    const raw = (params as any)?.id;
    const v = Array.isArray(raw) ? raw[0] : raw;
    return typeof v === 'string' ? v : '';
  }, [params]);

  const isCaptureMode = scanId === 'new' || scanId === 'capture';
  if (isCaptureMode) {
    return <ScanCaptureFlow />;
  }

  return <ScanDetailFlow scanId={scanId} />;
}

const ScanCaptureFlow = () => {
  const router = useRouter();
  const navigation = useNavigation<any>();
  const theme = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { status, error, message, result, run, reset } = useAgentPipeline();

  const [step, setStep] = useState<1 | 2>(1);
  const [productImageUri, setProductImageUri] = useState<string | null>(null);
  const [nutritionImageUri, setNutritionImageUri] = useState<string | null>(null);
  const bypassExitConfirmRef = useRef(false);
  const captureScale = useSharedValue(1);

  const captureAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: captureScale.value }],
  }));

  const topPanelTop = insets.top + 8;
  const thumbnailTop = insets.top + 152;
  const secondaryBottom = insets.bottom + 162;
  const captureBottom = insets.bottom + 30;
  const overlayBottomCard = insets.bottom + 22;

  useEffect(() => {
    if (status !== 'running') {
      captureScale.value = withTiming(1, { duration: 120 });
    }
  }, [captureScale, status]);

  const {
    hasPermission,
    device,
    cameraRef,
    flash,
    takePicture,
    toggleFlash,
    focus,
    handleCameraRuntimeError,
  } = cameraAvailable ? useCamera() : {
    hasPermission: false,
    device: null,
    cameraRef: null,
    flash: 'off',
    takePicture: async () => null,
    toggleFlash: () => undefined,
    focus: async () => undefined,
    handleCameraRuntimeError: () => undefined,
  };

  const isAnalyzing = status === 'running';
  const showNoProduct =
    status === 'done' &&
    Boolean(result) &&
    !Boolean((result as any)?.visionResult?.productDetected);
  const showError = status === 'error' || Boolean(error);

  const resetFlow = useCallback(() => {
    setStep(1);
    setProductImageUri(null);
    setNutritionImageUri(null);
    reset();
  }, [reset]);

  const goBackOrHome = useCallback(() => {
    bypassExitConfirmRef.current = true;
    router.replace('/(tabs)/home');
  }, [router]);

  const processScan = useCallback(
    async (productUri: string, nutritionUri: string | null) => {
      const out = await run({
        productImageUri: productUri,
        nutritionImageUri: nutritionUri,
        userId: user?.id ?? null,
      });

      if (out?.visionResult?.productDetected) {
        router.push({
          pathname: '/scan/result',
          params: {
            result: JSON.stringify(out),
          },
        });
      }
    },
    [run, router, user?.id],
  );

  const confirmStartOver = useCallback(
    (onConfirm?: () => void) => {
      Alert.alert('Start over?', 'You will lose the photos captured so far.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start over',
          style: 'destructive',
          onPress: () => {
            resetFlow();
            onConfirm?.();
          },
        },
      ]);
    },
    [resetFlow],
  );

  useEffect(() => {
    if (step !== 2 || isAnalyzing) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      confirmStartOver(goBackOrHome);
      return true;
    });
    return () => sub.remove();
  }, [confirmStartOver, goBackOrHome, isAnalyzing, step]);

  useEffect(() => {
    const unsubscribe = navigation?.addListener?.('beforeRemove', (e: any) => {
      if (bypassExitConfirmRef.current) {
        bypassExitConfirmRef.current = false;
        return;
      }
      if (step !== 2 || isAnalyzing) return;
      e.preventDefault();
      confirmStartOver(() => {
        if (e?.data?.action) {
          navigation.dispatch(e.data.action);
        }
      });
    });

    return unsubscribe;
  }, [confirmStartOver, isAnalyzing, navigation, step]);

  const handleCapture = useCallback(async () => {
    if (isAnalyzing) return;
    try {
      const photo = await takePicture();
      const uri = photo?.path ? String(photo.path) : '';
      if (!uri) return;

      if (step === 1) {
        setProductImageUri(uri);
        setStep(2);
        return;
      }

      setNutritionImageUri(uri);
      if (!productImageUri) return;
      await processScan(productImageUri, uri);
    } catch (e: any) {
      Alert.alert('Capture failed', String(e?.message || e || 'Unable to capture image.'));
    }
  }, [isAnalyzing, processScan, productImageUri, step, takePicture]);

  const handleCapturePress = useCallback(async () => {
    captureScale.value = withSequence(withTiming(0.97, { duration: 90 }), withTiming(1, { duration: 120 }));

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Haptics = require('expo-haptics');
      Haptics?.impactAsync?.(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    } catch {
      // ignore
    }

    await handleCapture();
  }, [captureScale, handleCapture]);

  const handleSkipNutrition = useCallback(async () => {
    if (!productImageUri || isAnalyzing) return;
    setNutritionImageUri(null);
    await processScan(productImageUri, null);
  }, [isAnalyzing, processScan, productImageUri]);

  const handlePickFromGallery = useCallback(async () => {
    if (!productImageUri || isAnalyzing) return;

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const ImagePicker = require('expo-image-picker');
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm?.granted) {
        Alert.alert('Permission needed', 'Allow gallery access to pick the nutrition label image.');
        return;
      }

      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: false,
        quality: 0.8,
      });

      if (picked?.canceled) return;
      const uri = picked?.assets?.[0]?.uri ? String(picked.assets[0].uri) : '';
      if (!uri) return;

      setNutritionImageUri(uri);
      await processScan(productImageUri, uri);
    } catch {
      Alert.alert('Gallery unavailable', 'Image picker is not available in this build.');
    }
  }, [isAnalyzing, processScan, productImageUri]);

  const handleFocus = useCallback(
    (event: any) => {
      focus({ x: event.nativeEvent.locationX, y: event.nativeEvent.locationY });
    },
    [focus],
  );

  if (!cameraAvailable) {
    return (
      <View style={styles.centerState}>
        <Text style={styles.text}>Camera is unavailable in this runtime.</Text>
      </View>
    );
  }

  if (hasPermission === null) {
    return (
      <View style={styles.centerState}>
        <LoadingSpinner />
        <Text style={[styles.text, { color: theme.text }]}>Preparing camera…</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.centerState}>
        <Card>
          <Text style={[styles.text, { color: theme.text }]}>Camera permission is required to scan products.</Text>
        </Card>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.centerState}>
        <LoadingSpinner />
        <Text style={[styles.text, { color: theme.text }]}>Starting camera…</Text>
      </View>
    );
  }

  return (
    <View style={styles.captureRoot}>
      <CameraView
        device={device}
        cameraRef={cameraRef}
        flash={flash}
        onCapture={handleCapturePress}
        onToggleFlash={toggleFlash}
        onFocus={handleFocus}
        onCameraError={handleCameraRuntimeError}
        showControls={false}
      />

      <View style={styles.overlayTopBar} />
      <View style={styles.overlayBottomBar} />

      <View style={[styles.captureTopPanel, { top: topPanelTop }]}> 
        <View style={styles.captureTopRow}>
          <View style={styles.captureTopActions}>
            <TouchableOpacity
              onPress={toggleFlash}
              accessibilityRole="button"
              accessibilityLabel={flash === 'on' ? 'Turn flash off' : 'Turn flash on'}
              style={styles.cornerIconButton}
            >
              <Ionicons name={flash === 'on' ? 'flash' : 'flash-off'} size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={goBackOrHome} accessibilityRole="button" style={styles.cornerIconButton}>
              <Ionicons name="close" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {step === 2 ? (
        <TouchableOpacity
          onPress={handlePickFromGallery}
          accessibilityRole="button"
          accessibilityLabel="Pick nutrition label from gallery"
          style={[styles.cornerIconButton, styles.galleryButton, { top: insets.top + 60 }]}
        >
          <Ionicons name="images-outline" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      ) : null}

      {step === 2 && productImageUri ? (
        <View style={[styles.thumbnailCorner, { top: thumbnailTop }]}> 
          <Image source={{ uri: productImageUri }} style={styles.thumbnailImage} accessibilityLabel="Captured product image preview" />
        </View>
      ) : null}

      {step === 2 ? (
        <View style={[styles.secondaryActions, { bottom: secondaryBottom }]}>
          <Button title="Skip Label" onPress={handleSkipNutrition} variant="secondary" />
        </View>
      ) : null}

      <Animated.View style={[styles.captureButtonWrap, captureAnimatedStyle, { bottom: captureBottom }]}> 
        <Pressable onPress={handleCapturePress} style={styles.captureButtonOuter}>
          <View style={[styles.captureButtonInner, { backgroundColor: '#FFFFFF' }]} />
        </Pressable>
      </Animated.View>

      {isAnalyzing ? (
        <View style={[styles.captureOverlay, { bottom: overlayBottomCard }]}> 
          <Card>
            <Text style={[styles.overlayTitle, { color: theme.text }]}>Processing scan…</Text>
            <LoadingSpinner />
            <Text style={[styles.text, { color: theme.text }]}>{message || 'Analyzing product details.'}</Text>
          </Card>
        </View>
      ) : null}

      {showNoProduct ? (
        <View style={[styles.captureOverlay, { bottom: overlayBottomCard }]}>
          <Card>
            <Text style={[styles.overlayTitle, { color: theme.text }]}>No product detected</Text>
            <Text style={[styles.text, { color: theme.text }]}>Try recapturing with better framing and lighting.</Text>
            <Button title="Start Over" onPress={resetFlow} />
          </Card>
        </View>
      ) : null}

      {showError ? (
        <View style={[styles.captureOverlay, { bottom: overlayBottomCard }]}>
          <Card>
            <Text style={[styles.overlayTitle, { color: theme.text }]}>Scan failed</Text>
            <Text style={[styles.text, { color: theme.text }]}>{String(error || 'Could not process the scan.')}</Text>
            <Button title="Start Over" onPress={resetFlow} />
          </Card>
        </View>
      ) : null}
    </View>
  );
};

const ScanDetailFlow = ({ scanId }: { scanId: string }) => {
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const goHome = useCallback(() => {
    router.replace('/(tabs)/home');
  }, [router]);

  const [loading, setLoading] = useState(true);
  const [scanData, setScanData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        if (!scanId) {
          setError('Missing scan id');
          setScanData(null);
          return;
        }

        // Lazy require repositories so this route doesn't crash without WatermelonDB.
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const repos = require('../../src/database/repositories') as typeof import('../../src/database/repositories');

        const scan = await repos.ScanRepository.getScanById(scanId);
        if (!mounted) return;

        const parsed = safeJsonParse((scan as any)?.data) ?? null;
        setScanData(parsed);
      } catch (e: any) {
        if (!mounted) return;
        setError(String(e?.message || e));
        setScanData(null);
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [scanId]);

  return (
    <View style={[styles.detailRoot, { backgroundColor: '#F2F2F7' }]}> 
      <View style={[styles.detailHeader, { paddingTop: insets.top + 8 }]}> 
        <TouchableOpacity onPress={goHome} style={styles.detailBackButton} accessibilityRole="button">
          <Ionicons name="chevron-back" size={22} color="#007AFF" />
          <Text style={styles.detailBackLabel}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.detailHeaderTitle}>Scan Detail</Text>
        <View style={styles.detailHeaderSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.detailScroll, { paddingBottom: insets.bottom + 32 }]}
      >
        {loading ? (
          <View style={styles.detailLoadingCard}>
            <LoadingSpinner />
            <Text style={styles.detailLoadingText}>Loading…</Text>
          </View>
        ) : error ? (
          <View style={styles.detailErrorCard}>
            <Ionicons name="warning" size={20} color="#FF3B30" />
            <Text style={styles.detailErrorText}>Failed to load scan: {error}</Text>
          </View>
        ) : !scanData ? (
          <View style={styles.detailEmptyCard}>
            <Text style={styles.detailEmptyText}>No scan data found.</Text>
          </View>
        ) : (
          <ScanResultView
            data={{ ...scanData, userId: user?.id ?? null }}
            onSave={() => undefined}
            onDismiss={goHome}
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  detailRoot: {
    flex: 1,
  },
  detailBackButton: { flexDirection: 'row', alignItems: 'center', minWidth: 70, minHeight: 44 },
  detailBackLabel: { fontSize: 17, color: '#007AFF', fontWeight: '400' },
  detailHeaderTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '600', color: '#1C1C1E' },
  detailHeaderSpacer: { minWidth: 70 },
  detailScroll: { paddingTop: 8 },
  detailLoadingCard: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  detailLoadingText: { fontSize: 15, color: '#8E8E93' },
  detailErrorCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, margin: 16, backgroundColor: '#FFF5F5', borderRadius: 12, padding: 14, borderLeftWidth: 3, borderLeftColor: '#FF3B30' },
  detailErrorText: { flex: 1, fontSize: 14, color: '#FF3B30', lineHeight: 20 },
  detailEmptyCard: { alignItems: 'center', paddingVertical: 48 },
  detailEmptyText: { fontSize: 15, color: '#8E8E93' },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: '#F2F2F7',
  },
  captureRoot: {
    flex: 1,
  },
  overlayTopBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 92,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  overlayBottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 150,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  captureTopPanel: {
    position: 'absolute',
    left: 16,
    right: 16,
  },
  captureTopRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
  },
  captureTopActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cornerIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.58)',
  },
  galleryButton: {
    position: 'absolute',
    right: 16,
  },
  thumbnailCorner: {
    position: 'absolute',
    right: 16,
    width: 68,
    height: 68,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.75)',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  secondaryActions: {
    position: 'absolute',
    left: 16,
    right: 16,
    gap: 8,
  },
  captureButtonWrap: {
    position: 'absolute',
    alignSelf: 'center',
  },
  captureButtonOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: '#2ECC71',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  captureButtonInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
  },
  captureOverlay: {
    position: 'absolute',
    left: 16,
    right: 16,
  },
  overlayTitle: {
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 8,
    textAlign: 'center',
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  text: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
});
