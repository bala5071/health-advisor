import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ScanResultView from '../../src/components/scan/ScanResult';
import { useAuth } from '../../src/components/AuthProvider';
import { HealthTrackerAgent } from '../../src/agents/HealthTrackerAgent';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ScanResult() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
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
    <View style={[styles.root, { backgroundColor: '#F2F2F7' }]}> 
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={handleDismiss} style={styles.backButton} accessibilityRole="button">
          <Ionicons name="chevron-back" size={22} color="#007AFF" />
          <Text style={styles.backLabel}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan Result</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
      >
        {!parsed ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No result data found.</Text>
          </View>
        ) : (
          <ScanResultView data={parsed} onSave={handleSave} onDismiss={handleDismiss} saving={saving} />
        )}

        {saveError ? (
          <View style={styles.errorBanner}>
            <Ionicons name="warning" size={16} color="#FF3B30" />
            <Text style={styles.errorBannerText}>Save failed: {saveError}</Text>
          </View>
        ) : null}

        {savedScanId ? (
          <View style={styles.outcomeCard}>
            <Text style={styles.outcomeTitle}>Did you follow this recommendation?</Text>
            <View style={styles.outcomeRow}>
              <Pressable
                style={[
                  styles.outcomePill,
                  styles.outcomePillAccept,
                  actionSaved === 'accepted' ? styles.outcomePillSelected : null,
                ]}
                onPress={() => recordAction('accepted')}
              >
                <Text style={styles.outcomePillText}>
                  {actionSaved === 'accepted' ? '✓ Accepted' : 'Accepted'}
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.outcomePill,
                  styles.outcomePillReject,
                  actionSaved === 'rejected' ? styles.outcomePillSelected : null,
                ]}
                onPress={() => recordAction('rejected')}
              >
                <Text style={styles.outcomePillText}>
                  {actionSaved === 'rejected' ? '✓ Rejected' : 'Rejected'}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </ScrollView>

      {parsed ? (
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <Pressable style={styles.bottomPrimary} onPress={handleDismiss}>
            <Ionicons name="camera" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.bottomPrimaryText}>Scan Again</Text>
          </Pressable>
          <Pressable style={styles.bottomSecondary} onPress={handleSave} disabled={saving}>
            <Ionicons name="bookmark-outline" size={18} color="#34C759" style={{ marginRight: 6 }} />
            <Text style={styles.bottomSecondaryText}>{saving ? 'Saving…' : 'Save'}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F2F2F7' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: '#F2F2F7',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 70,
    minHeight: 44,
  },
  backLabel: { fontSize: 17, color: '#007AFF', fontWeight: '400' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '600', color: '#1C1C1E' },
  headerSpacer: { minWidth: 70 },
  scroll: { paddingBottom: 20 },
  emptyCard: {
    margin: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
  },
  emptyText: { fontSize: 15, color: '#8E8E93', textAlign: 'center' },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: '#FFF5F5',
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#FF3B30',
  },
  errorBannerText: { flex: 1, fontSize: 13, color: '#FF3B30', fontWeight: '500' },
  outcomeCard: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  outcomeTitle: { fontSize: 15, fontWeight: '600', color: '#1C1C1E', marginBottom: 12 },
  outcomeRow: { flexDirection: 'row', gap: 10 },
  outcomePill: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F2F7',
  },
  outcomePillAccept: { backgroundColor: '#E9F8EE' },
  outcomePillReject: { backgroundColor: '#FFF5F5' },
  outcomePillSelected: { borderWidth: 2, borderColor: '#34C759' },
  outcomePillText: { fontSize: 15, fontWeight: '600', color: '#1C1C1E' },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#F2F2F7',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  bottomPrimary: {
    flex: 2,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#34C759',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#34C759',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  bottomPrimaryText: { fontSize: 17, fontWeight: '600', color: '#FFFFFF' },
  bottomSecondary: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#34C759',
  },
  bottomSecondaryText: { fontSize: 17, fontWeight: '600', color: '#34C759' },
  sectionTitle: { fontSize: 13, fontWeight: '600', letterSpacing: 0.3, textTransform: 'uppercase' },
  text: { fontSize: 15, fontWeight: '400' },
  errorText: { color: '#FF3B30' },
  container: { gap: 0 },
  bottomActions: { position: 'absolute', left: 16, right: 16, bottom: 0 },
  bottomButtonPrimary: { flex: 1 },
  bottomButtonSecondary: { width: 120 },
  closeButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  header2: { flexDirection: 'row', justifyContent: 'flex-end' },
});
