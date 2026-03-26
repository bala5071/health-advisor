import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import Button from '../../src/components/common/Button';
import Card from '../../src/components/common/Card';
import { VisionAgent, VisionResult } from '../../src/agents/VisionAgent';

type TraceRow = {
  atMs: number;
  label: string;
  data?: any;
};

async function getUsedMemorySafe(): Promise<number | null> {
  try {
    const fn = (DeviceInfo as any).getUsedMemory;
    if (typeof fn !== 'function') return null;
    const bytes = await fn();
    return typeof bytes === 'number' ? bytes : null;
  } catch {
    return null;
  }
}

function formatBytes(bytes: number | null): string {
  if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes <= 0) return 'n/a';
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(2)} GB`;
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(0)} MB`;
}

export default function VisionTestScreen() {
  const agentRef = useRef<VisionAgent | null>(null);
  const [pickedUri, setPickedUri] = useState<string | null>(null);
  const [trace, setTrace] = useState<TraceRow[]>([]);
  const [result, setResult] = useState<VisionResult | null>(null);
  const [totalMs, setTotalMs] = useState<number | null>(null);
  const [memBefore, setMemBefore] = useState<number | null>(null);
  const [memAfter, setMemAfter] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isDev = typeof __DEV__ === 'boolean' ? __DEV__ : false;

  useEffect(() => {
    if (!isDev) return;

    VisionAgent.onTrace = (e) => {
      setTrace((prev) => [
        ...prev,
        {
          atMs: e.atMs,
          label: e.step,
          data: e.data,
        },
      ]);
    };

    return () => {
      VisionAgent.onTrace = null;
    };
  }, [isDev]);

  const pickImage = useCallback(async () => {
    if (!isDev) return;

    setError(null);

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const ImagePicker = require('expo-image-picker') as any;

      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm?.granted) {
        setError('Photo library permission not granted');
        return;
      }

      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1,
      });

      if (res?.canceled) return;

      const uri = res?.assets?.[0]?.uri;
      if (typeof uri !== 'string' || !uri) {
        setError('No image was selected');
        return;
      }

      setPickedUri(uri);
    } catch {
      setError(
        'expo-image-picker is required for this test screen. Install it with: npx expo install expo-image-picker',
      );
    }
  }, [isDev]);

  const reset = useCallback(() => {
    setTrace([]);
    setResult(null);
    setTotalMs(null);
    setMemBefore(null);
    setMemAfter(null);
    setError(null);
  }, []);

  const run = useCallback(async () => {
    if (!isDev) return;
    if (!pickedUri) {
      setError('Pick an image first');
      return;
    }

    reset();

    const startedAt = Date.now();
    setTrace([{ atMs: 0, label: 'ui_start', data: { uri: pickedUri } }]);

    const before = await getUsedMemorySafe();
    setMemBefore(before);

    try {
      if (!agentRef.current) {
        agentRef.current = new VisionAgent();
      }

      const res = await agentRef.current.analyze(pickedUri);
      setResult(res);

      const after = await getUsedMemorySafe();
      setMemAfter(after);

      const elapsed = Date.now() - startedAt;
      setTotalMs(elapsed);
      setTrace((prev) => [...prev, { atMs: elapsed, label: 'ui_done' }]);
    } catch (e: any) {
      const elapsed = Date.now() - startedAt;
      setTotalMs(elapsed);
      setError(e?.message ? String(e.message) : 'Failed');
      setTrace((prev) => [...prev, { atMs: elapsed, label: 'ui_error' }]);

      const after = await getUsedMemorySafe();
      setMemAfter(after);
    }
  }, [isDev, pickedUri, reset]);

  const rawAnswers = useMemo(() => {
    return Array.isArray(result?.rawAnswers) ? result?.rawAnswers : [];
  }, [result]);

  if (!isDev) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Vision Test</Text>
        <Text style={styles.text}>This screen is only available in development mode.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Vision Test (Dev Only)</Text>

      <Card>
        <Text style={styles.text}>1) Pick any image from your library</Text>
        <Button title="Pick Image" onPress={pickImage} />
        <Text style={styles.small}>URI: {pickedUri || 'none'}</Text>
      </Card>

      <Card>
        <Text style={styles.text}>2) Run VisionAgent.analyze()</Text>
        <Button title="Run Analysis" onPress={run} />
        <Button title="Reset Output" onPress={reset} variant="secondary" />
      </Card>

      {error ? (
        <Card>
          <Text style={styles.error}>{error}</Text>
        </Card>
      ) : null}

      <Card>
        <Text style={styles.sectionTitle}>Timing / Memory</Text>
        <Text style={styles.small}>Total time: {typeof totalMs === 'number' ? `${totalMs} ms` : 'n/a'}</Text>
        <Text style={styles.small}>Used memory before: {formatBytes(memBefore)}</Text>
        <Text style={styles.small}>Used memory after: {formatBytes(memAfter)}</Text>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Q1 / Q2 / Q3 (verbatim)</Text>
        <Text style={styles.mono}>Q1: {rawAnswers[0] ?? ''}</Text>
        <Text style={styles.mono}>Q2: {rawAnswers[1] ?? ''}</Text>
        <Text style={styles.mono}>Q3: {rawAnswers[2] ?? ''}</Text>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Final VisionResult JSON</Text>
        <Text style={styles.mono}>{result ? JSON.stringify(result, null, 2) : ''}</Text>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Step Trace (timestamps)</Text>
        {trace.length === 0 ? (
          <Text style={styles.small}>No trace yet.</Text>
        ) : (
          trace.map((row, idx) => (
            <Text key={String(idx)} style={styles.mono}>
              +{row.atMs}ms {row.label}
              {row.data != null ? ` ${safeStringify(row.data)}` : ''}
            </Text>
          ))
        )}
      </Card>
    </ScrollView>
  );
}

function safeStringify(value: any): string {
  try {
    const s = JSON.stringify(value);
    if (typeof s !== 'string') return '';
    if (s.length > 400) return s.slice(0, 400) + '…';
    return s;
  } catch {
    return '';
  }
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 8,
  },
  text: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  small: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
  },
  mono: {
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 6,
  },
  error: {
    fontSize: 13,
    fontWeight: '800',
    color: '#DC3545',
  },
});
