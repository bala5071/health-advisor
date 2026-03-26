import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Card from '../../src/components/common/Card';
import Button from '../../src/components/common/Button';
import ScanResultView from '../../src/components/scan/ScanResult';
import { useAuth } from '../../src/components/AuthProvider';
import { HealthTrackerAgent } from '../../src/agents/HealthTrackerAgent';

export default function ScanResult() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedScanId, setSavedScanId] = useState<string | null>(null);
  const [actionSaved, setActionSaved] = useState<'accepted' | 'rejected' | null>(null);

  const parsed = useMemo(() => {
    try {
      const raw = params?.result;
      const str = Array.isArray(raw) ? raw[0] : raw;
      if (typeof str !== 'string') return null;
      return JSON.parse(str);
    } catch {
      return null;
    }
  }, [params]);

  const handleDismiss = () => {
    router.replace('/(tabs)/home');
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setSaveError(null);
      setSavedScanId(null);
      setActionSaved(null);

      const userId = user?.id;
      if (!userId) {
        setSaveError('You must be signed in to save scans.');
        return;
      }

      if (!parsed) {
        setSaveError('No scan data to save.');
        return;
      }

      const scanId = await HealthTrackerAgent.logScan({
        userId,
        type: 'product_scan',
        scanPayload: parsed,
        verdict: parsed?.recommendation?.verdict ?? parsed?.verdict,
        userAction: 'unknown',
      });

      if (scanId) setSavedScanId(scanId);
    } catch (e: any) {
      setSaveError(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  };

  const recordAction = async (userAction: 'accepted' | 'rejected') => {
    try {
      if (!savedScanId || !user?.id) return;
      await HealthTrackerAgent.recordUserAction({
        scanId: savedScanId,
        userId: user.id,
        userAction,
      });
      setActionSaved(userAction);
    } catch (e: any) {
      setSaveError(String(e?.message || e));
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Scan Result</Text>

      {!parsed ? (
        <Card>
          <Text style={styles.text}>No result data found.</Text>
          <Button title="Back" onPress={() => router.back()} />
        </Card>
      ) : (
        <>
          <ScanResultView data={parsed} onSave={handleSave} onDismiss={handleDismiss} saving={saving} />
          {saveError ? (
            <Card>
              <Text style={styles.text}>Save failed: {saveError}</Text>
            </Card>
          ) : null}
          {savedScanId ? (
            <Card>
              <Text style={styles.sectionTitle}>Advice outcome</Text>
              <Text style={styles.text}>Did you follow this recommendation?</Text>
              <Button
                title={actionSaved === 'accepted' ? 'Accepted (saved)' : 'Accepted advice'}
                onPress={() => recordAction('accepted')}
              />
              <Button
                title={actionSaved === 'rejected' ? 'Rejected (saved)' : 'Rejected advice'}
                onPress={() => recordAction('rejected')}
                variant="secondary"
              />
            </Card>
          ) : null}
        </>
      )}
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
    fontWeight: '800',
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
    fontWeight: '600',
    marginBottom: 6,
  },
  mono: {
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 6,
  },
});
