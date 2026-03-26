import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Card from '../../src/components/common/Card';
import Button from '../../src/components/common/Button';
import ScanResultView from '../../src/components/scan/ScanResult';
import { useAuth } from '../../src/components/AuthProvider';

const safeJsonParse = (v: any): any => {
  if (typeof v !== 'string') return v;
  try {
    return JSON.parse(v);
  } catch {
    return null;
  }
};

export default function ScanDetail() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();

  const scanId = useMemo(() => {
    const raw = (params as any)?.id;
    const v = Array.isArray(raw) ? raw[0] : raw;
    return typeof v === 'string' ? v : '';
  }, [params]);

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
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Scan Detail</Text>

      {loading ? (
        <Card>
          <Text style={styles.text}>Loading…</Text>
        </Card>
      ) : null}

      {error ? (
        <Card>
          <Text style={styles.text}>Failed to load scan: {error}</Text>
          <Button title="Back" onPress={() => router.back()} />
        </Card>
      ) : null}

      {!loading && !error && !scanData ? (
        <Card>
          <Text style={styles.text}>No scan data found.</Text>
          <Button title="Back" onPress={() => router.back()} />
        </Card>
      ) : null}

      {!loading && !error && scanData ? (
        <>
          <ScanResultView
            data={{ ...scanData, userId: user?.id ?? null }}
            onSave={() => undefined}
            onDismiss={() => router.back()}
          />
          <View style={styles.bottom}>
            <Button title="Back" onPress={() => router.back()} />
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 4,
  },
  text: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  bottom: {
    marginTop: 6,
  },
});
