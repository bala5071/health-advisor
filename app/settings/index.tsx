import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../src/components/AuthProvider';
import { useTheme } from '../../src/theme/useTheme';
import { useSettingsStore } from '../../src/stores/useSettingsStore';
import { GDPRService } from '../../src/services/GDPRService';
import { QwenModelManager } from '../../src/ai/models/QwenModelManager';
import { SLMModelManager } from '../../src/ai/models/SLMModelManager';
import pkg from '../../package.json';

type IconName = keyof typeof Ionicons.glyphMap;

const ICON_COLORS: Record<string, string> = {
  bell: '#FF9500',
  calendar: '#FF9500',
  eye: '#5856D6',
  medical: '#FF2D55',
  cloud: '#007AFF',
  trash: '#FF3B30',
  export: '#34C759',
  account: '#8E8E93',
  info: '#5AC8FA',
};

const RowIcon = ({ name, colorKey }: { name: IconName; colorKey: keyof typeof ICON_COLORS }) => (
  <View style={[styles.iconCircle, { backgroundColor: ICON_COLORS[colorKey] }]}>
    <Ionicons name={name} size={17} color="#FFFFFF" />
  </View>
);

export default function SettingsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  const reportFrequency = useSettingsStore((s) => s.reportFrequency);
  const setReportFrequency = useSettingsStore((s) => s.setReportFrequency);

  const [modelsStatus, setModelsStatus] = useState<{ qwenMain: boolean; qwenMmproj: boolean; slm: boolean }>(() => ({
    qwenMain: false,
    qwenMmproj: false,
    slm: false,
  }));
  const [downloadingModels, setDownloadingModels] = useState(false);
  const [qwenPct, setQwenPct] = useState<{ main: number; mmproj: number }>({ main: 0, mmproj: 0 });
  const [slmPct, setSlmPct] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [qwenExists, slmExists] = await Promise.all([
        QwenModelManager.checkModelsExist().catch(() => ({ main: false, mmproj: false })),
        SLMModelManager.checkSLMExists().catch(() => false),
      ]);
      setModelsStatus({ qwenMain: Boolean(qwenExists.main), qwenMmproj: Boolean(qwenExists.mmproj), slm: Boolean(slmExists) });
    } catch (e: any) {
      setError(String(e?.message || e));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const refreshModels = async () => {
    const [qwenExists, slmExists] = await Promise.all([
      QwenModelManager.checkModelsExist().catch(() => ({ main: false, mmproj: false })),
      SLMModelManager.checkSLMExists().catch(() => false),
    ]);
    setModelsStatus({ qwenMain: Boolean(qwenExists.main), qwenMmproj: Boolean(qwenExists.mmproj), slm: Boolean(slmExists) });
  };

  const downloadAllModels = async () => {
    try {
      setError(null);
      setDownloadingModels(true);
      setQwenPct({ main: 0, mmproj: 0 });
      setSlmPct(0);

      await Promise.all([
        QwenModelManager.downloadModels((main, mmproj) => setQwenPct({ main, mmproj })),
        SLMModelManager.downloadSLM((pct) => setSlmPct(pct)),
      ]);

      await refreshModels();
      Alert.alert('Models ready', 'Model files downloaded successfully.');
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setDownloadingModels(false);
    }
  };

  const deleteAllModels = async () => {
    Alert.alert(
      'Delete models?',
      'This will remove downloaded AI model files from this device. You can download them again later.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setError(null);
              await Promise.all([
                QwenModelManager.deleteModels().catch(() => undefined),
                SLMModelManager.deleteSLM().catch(() => undefined),
              ]);
              await refreshModels();
            } catch (e: any) {
              setError(String(e?.message || e));
            }
          },
        },
      ],
    );
  };

  const exportData = async () => {
    try {
      setError(null);
      if (!user?.id) {
        Alert.alert('Sign in required', 'You must be signed in to export your data.');
        return;
      }
      const res = await GDPRService.exportUserDataToJsonFile(user.id);
      Alert.alert('Export complete', `Saved to: ${res.path}`);
    } catch (e: any) {
      setError(String(e?.message || e));
    }
  };

  const reportFrequencyLabel = useMemo(() => {
    if (reportFrequency === 'monthly') return 'Monthly';
    if (reportFrequency === 'none') return 'Off';
    return 'Weekly';
  }, [reportFrequency]);

  const handlePressReportFrequency = () => {
    Alert.alert('Report Frequency', 'Choose how often you want reports.', [
      { text: 'Weekly', onPress: () => setReportFrequency('weekly') },
      { text: 'Monthly', onPress: () => setReportFrequency('monthly') },
      { text: 'Off', onPress: () => setReportFrequency('none') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const renderChevron = () => <Ionicons name="chevron-forward" size={17} color="#C7C7CC" />;
  const renderSectionHeader = (title: string) => (
    <Text style={[styles.sectionHeader, theme.typography.caption, { color: theme.textSecondary }]}>{title}</Text>
  );

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: theme.background }]}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 20 }]}
    >
      <Text style={[styles.screenTitle, theme.typography.display, { color: theme.text }]}>Settings</Text>

      {renderSectionHeader('GENERAL')}
      <View style={[styles.group, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Pressable style={[styles.row, { backgroundColor: theme.surface }]} onPress={() => router.push('/settings/notifications')}>
          <View style={styles.rowLeft}>
            <RowIcon name="notifications" colorKey="bell" />
            <Text style={[styles.rowLabel, theme.typography.body, { color: theme.text }]}>Notifications</Text>
          </View>
          {renderChevron()}
        </Pressable>
      </View>

      {renderSectionHeader('REPORTS')}
      <View style={[styles.group, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Pressable style={[styles.row, { backgroundColor: theme.surface }]} onPress={handlePressReportFrequency}>
          <View style={styles.rowLeft}>
            <RowIcon name="calendar" colorKey="calendar" />
            <Text style={[styles.rowLabel, theme.typography.body, { color: theme.text }]}>Report Frequency</Text>
          </View>
          <View style={styles.rowRightInline}>
            <Text style={[styles.rowValue, theme.typography.subhead, { color: theme.textSecondary }]}>{reportFrequencyLabel}</Text>
            {renderChevron()}
          </View>
        </Pressable>
      </View>

      {renderSectionHeader('AI MODELS')}
      <View style={[styles.group, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={[styles.row, { backgroundColor: theme.surface }]}>
          <View style={styles.rowLeft}>
            <RowIcon name="eye" colorKey="eye" />
            <Text style={[styles.rowLabel, theme.typography.body, { color: theme.text }]}>Vision Model</Text>
          </View>
          <Text style={[styles.statusValue, (modelsStatus.qwenMain && modelsStatus.qwenMmproj) ? styles.statusReady : styles.statusNotReady]}>
            {(modelsStatus.qwenMain && modelsStatus.qwenMmproj) ? '● Ready' : '✗ Not ready'}
          </Text>
        </View>
        <View style={[styles.separator, { backgroundColor: theme.border }]} />
        <View style={[styles.row, { backgroundColor: theme.surface }]}>
          <View style={styles.rowLeft}>
            <RowIcon name="medkit" colorKey="medical" />
            <Text style={[styles.rowLabel, theme.typography.body, { color: theme.text }]}>Health Advisor</Text>
          </View>
          <Text style={[styles.statusValue, modelsStatus.slm ? styles.statusReady : styles.statusNotReady]}>
            {modelsStatus.slm ? '● Ready' : '✗ Not ready'}
          </Text>
        </View>
        <View style={[styles.separator, { backgroundColor: theme.border }]} />
        <Pressable style={[styles.row, { backgroundColor: theme.surface }]} onPress={downloadAllModels} disabled={downloadingModels}>
          <View style={styles.rowLeft}>
            <RowIcon name="cloud-download" colorKey="cloud" />
            <Text style={[styles.rowLabel, theme.typography.body, { color: theme.text }]}>{downloadingModels ? 'Downloading…' : 'Download Models'}</Text>
          </View>
          {renderChevron()}
        </Pressable>
        <View style={[styles.separator, { backgroundColor: theme.border }]} />
        <Pressable style={[styles.row, { backgroundColor: theme.surface }]} onPress={deleteAllModels}>
          <View style={styles.rowLeft}>
            <RowIcon name="trash" colorKey="trash" />
            <Text style={[styles.rowLabel, theme.typography.body, { color: theme.text }]}>Delete Models</Text>
          </View>
          {renderChevron()}
        </Pressable>

        {downloadingModels ? (
          <View style={[styles.progressWrap, { borderTopColor: theme.border }]}>
            <View>
              <Text style={[styles.progressLabel, theme.typography.caption, { color: theme.textSecondary }]}>Vision Model  {qwenPct.main}%</Text>
              <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
                <View style={[styles.progressFill, { width: `${qwenPct.main}%`, backgroundColor: theme.primary }]} />
              </View>
            </View>
            <View>
              <Text style={[styles.progressLabel, theme.typography.caption, { color: theme.textSecondary }]}>Health Advisor  {slmPct}%</Text>
              <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
                <View style={[styles.progressFill, { width: `${slmPct}%`, backgroundColor: theme.primary }]} />
              </View>
            </View>
          </View>
        ) : null}
      </View>

      {renderSectionHeader('DATA & PRIVACY')}
      <View style={[styles.group, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Pressable style={[styles.row, { backgroundColor: theme.surface }]} onPress={exportData}>
          <View style={styles.rowLeft}>
            <RowIcon name="arrow-up-circle" colorKey="export" />
            <Text style={[styles.rowLabel, theme.typography.body, { color: theme.text }]}>Export My Data</Text>
          </View>
          {renderChevron()}
        </Pressable>
      </View>

      {renderSectionHeader('ACCOUNT')}
      <View style={[styles.group, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Pressable style={[styles.row, { backgroundColor: theme.surface }]} onPress={() => router.push('/settings/account')}>
          <View style={styles.rowLeft}>
            <RowIcon name="person" colorKey="account" />
            <Text style={[styles.rowLabel, theme.typography.body, { color: theme.text }]}>Account & Deletion</Text>
          </View>
          {renderChevron()}
        </Pressable>
      </View>

      {renderSectionHeader('ABOUT')}
      <View style={[styles.group, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={[styles.row, { backgroundColor: theme.surface }]}>
          <View style={styles.rowLeft}>
            <RowIcon name="information-circle" colorKey="info" />
            <Text style={[styles.rowLabel, theme.typography.body, { color: theme.text }]}>Version</Text>
          </View>
          <Text style={[styles.rowValue, theme.typography.subhead, { color: theme.textSecondary }]}>{String((pkg as any)?.version ?? '1.0.0')}</Text>
        </View>
      </View>

      {error ? <Text style={[styles.errorText, { color: theme.danger }]}>Error: {error}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  container: {
    paddingBottom: 24,
  },
  screenTitle: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    textAlign: 'left',
    marginBottom: 0,
  },
  sectionHeader: {
    textTransform: 'uppercase',
    paddingTop: 24,
    paddingBottom: 6,
    paddingHorizontal: 16,
    letterSpacing: 0.3,
    fontWeight: '600',
  },
  group: {
    marginHorizontal: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E5EA',
  },
  row: {
    minHeight: 50,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
  },
  rowLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowRightInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconCircle: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowLabel: {
    fontWeight: '400',
  },
  rowValue: {
    fontWeight: '400',
  },
  statusValue: {
    fontSize: 15,
    fontWeight: '500',
  },
  statusReady: {
    color: '#34C759',
  },
  statusNotReady: {
    color: '#FF3B30',
  },
  separator: {
    height: 1,
    marginLeft: 16,
    backgroundColor: '#E5E5EA',
  },
  progressWrap: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  progressLabel: {
    fontSize: 13,
    color: '#6D6D72',
    marginBottom: 4,
  },
  progressTrack: {
    height: 4,
    backgroundColor: '#E5E5EA',
    borderRadius: 2,
  },
  progressFill: {
    height: 4,
    backgroundColor: '#34C759',
    borderRadius: 2,
  },
  errorText: {
    marginTop: 12,
    marginHorizontal: 16,
    fontSize: 13,
    color: '#FF3B30',
    fontWeight: '600',
  },
});
