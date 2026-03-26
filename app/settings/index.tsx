import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Switch, ScrollView, Alert, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/theme/useTheme';
import Card from '../../src/components/common/Card';
import Button from '../../src/components/common/Button';
import { useAuth } from '../../src/components/AuthProvider';
import { NotificationService, NotificationPreferences } from '../../src/services/NotificationService';
import { useSettingsStore } from '../../src/stores/useSettingsStore';
import { GDPRService } from '../../src/services/GDPRService';
import { QwenModelManager } from '../../src/ai/models/QwenModelManager';
import { SLMModelManager } from '../../src/ai/models/SLMModelManager';
import pkg from '../../package.json';

export default function SettingsScreen() {
  const theme = useTheme();
  const { user } = useAuth();
  const router = useRouter();

  const appTheme = useSettingsStore((s) => s.theme);
  const setAppTheme = useSettingsStore((s) => s.setTheme);
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

  const [prefs, setPrefs] = useState<NotificationPreferences>({
    weeklyReportReady: true,
    severeAllergenAlert: true,
    dailyNoScanNudge: false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      setSaved(false);
      if (!user?.id) return;
      const p = await NotificationService.loadPreferences(user.id);
      setPrefs(p);

      const [qwenExists, slmExists] = await Promise.all([
        QwenModelManager.checkModelsExist().catch(() => ({ main: false, mmproj: false })),
        SLMModelManager.checkSLMExists().catch(() => false),
      ]);
      setModelsStatus({ qwenMain: Boolean(qwenExists.main), qwenMmproj: Boolean(qwenExists.mmproj), slm: Boolean(slmExists) });
    } catch (e: any) {
      setError(String(e?.message || e));
    }
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    try {
      setLoading(true);
      setError(null);
      setSaved(false);
      if (!user?.id) {
        setError('You must be signed in to save settings.');
        return;
      }
      await NotificationService.savePreferences(user.id, prefs);
      setSaved(true);
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  const requestPermissions = async () => {
    try {
      setError(null);
      await NotificationService.requestPermissions();
    } catch (e: any) {
      setError(String(e?.message || e));
    }
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

  const themeOptionRow = (label: string, value: 'light' | 'dark' | 'system') => {
    const selected = appTheme === value;
    return (
      <Pressable
        key={value}
        onPress={() => setAppTheme(value)}
        accessibilityRole="button"
        accessibilityLabel={`Theme: ${label}`}
        accessibilityHint={selected ? 'Selected' : 'Double tap to select'}
        style={[styles.choiceRow, { borderColor: theme.border, backgroundColor: selected ? theme.card : 'transparent' }]}
      >
        <Text style={[styles.choiceLabel, { color: theme.text }]}>{label}</Text>
        <Text style={[styles.choiceValue, { color: selected ? theme.primary : theme.muted }]}>{selected ? 'On' : ''}</Text>
      </Pressable>
    );
  };

  const reportOptionRow = (label: string, value: 'weekly' | 'monthly' | 'none') => {
    const selected = reportFrequency === value;
    return (
      <Pressable
        key={value}
        onPress={() => setReportFrequency(value)}
        accessibilityRole="button"
        accessibilityLabel={`Report frequency: ${label}`}
        accessibilityHint={selected ? 'Selected' : 'Double tap to select'}
        style={[styles.choiceRow, { borderColor: theme.border, backgroundColor: selected ? theme.card : 'transparent' }]}
      >
        <Text style={[styles.choiceLabel, { color: theme.text }]}>{label}</Text>
        <Text style={[styles.choiceValue, { color: selected ? theme.primary : theme.muted }]}>{selected ? 'On' : ''}</Text>
      </Pressable>
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={[styles.title, { color: theme.text }]}>Settings</Text>

      <Card>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Appearance</Text>
        {themeOptionRow('System', 'system')}
        {themeOptionRow('Light', 'light')}
        {themeOptionRow('Dark', 'dark')}
      </Card>

      <Card>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Notifications</Text>

        <View style={styles.row}>
          <Text style={[styles.label, { color: theme.text }]}>Weekly report ready</Text>
          <Switch
            value={prefs.weeklyReportReady}
            onValueChange={(v) => setPrefs((p) => ({ ...p, weeklyReportReady: v }))}
          />
        </View>

        <View style={styles.row}>
          <Text style={[styles.label, { color: theme.text }]}>Severe allergen alert</Text>
          <Switch
            value={prefs.severeAllergenAlert}
            onValueChange={(v) => setPrefs((p) => ({ ...p, severeAllergenAlert: v }))}
          />
        </View>

        <View style={styles.row}>
          <Text style={[styles.label, { color: theme.text }]}>Daily nudge if no scan in 2 days</Text>
          <Switch
            value={prefs.dailyNoScanNudge}
            onValueChange={(v) => setPrefs((p) => ({ ...p, dailyNoScanNudge: v }))}
          />
        </View>

        <Button title="Request notification permission" onPress={requestPermissions} variant="secondary" />
        <Button title={loading ? 'Saving…' : 'Save'} onPress={save} />

        {saved ? <Text style={[styles.ok, { color: theme.primary }]}>Saved.</Text> : null}
        {error ? <Text style={[styles.err, { color: theme.danger }]}>Error: {error}</Text> : null}
      </Card>

      <Card>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Reports</Text>
        {reportOptionRow('Weekly', 'weekly')}
        {reportOptionRow('Monthly', 'monthly')}
        {reportOptionRow('None', 'none')}
        <Text style={[styles.helper, { color: theme.muted }]}>Applies next time the app opens.</Text>
      </Card>

      <Card>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Models</Text>
        <Text style={[styles.helper, { color: theme.muted }]}>
          Qwen Vision: {modelsStatus.qwenMain && modelsStatus.qwenMmproj ? 'Ready' : 'Not downloaded'}
        </Text>
        <Text style={[styles.helper, { color: theme.muted }]}>SLM: {modelsStatus.slm ? 'Ready' : 'Not downloaded'}</Text>
        {downloadingModels ? (
          <Text style={[styles.helper, { color: theme.muted }]}>
            Downloading… Qwen {qwenPct.main}%/{qwenPct.mmproj}% • SLM {slmPct}%
          </Text>
        ) : null}
        <Button
          title={downloadingModels ? 'Downloading…' : 'Download models'}
          onPress={downloadAllModels}
          disabled={downloadingModels}
          accessibilityLabel="Download models"
          accessibilityHint="Downloads AI models to enable on-device inference"
        />
        <Button
          title="Delete models"
          onPress={deleteAllModels}
          variant="secondary"
          accessibilityLabel="Delete models"
          accessibilityHint="Deletes downloaded model files from this device"
        />
      </Card>

      <Card>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Data</Text>
        <Button
          title="Export my data"
          onPress={exportData}
          accessibilityLabel="Export my data"
          accessibilityHint="Exports your data to a JSON file stored on this device"
        />
      </Card>

      <Card>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Account</Text>
        <Button
          title="Account & deletion"
          onPress={() => router.push('/settings/account')}
          variant="secondary"
          accessibilityLabel="Account and deletion"
          accessibilityHint="Opens account management and delete account options"
        />
      </Card>

      <Card>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>About</Text>
        <Text style={[styles.helper, { color: theme.muted }]}>Version: {String((pkg as any)?.version ?? 'unknown')}</Text>
        <Text style={[styles.subTitle, { color: theme.text }]}>Open source licenses</Text>
        {Object.entries((pkg as any)?.dependencies ?? {}).map(([name, version]) => (
          <Text key={name} style={[styles.helper, { color: theme.muted }]}>- {name}@{String(version)}</Text>
        ))}
      </Card>
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
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  helper: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  subTitle: {
    fontSize: 14,
    fontWeight: '900',
    marginTop: 8,
    marginBottom: 8,
  },
  choiceRow: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  choiceLabel: {
    fontSize: 14,
    fontWeight: '800',
  },
  choiceValue: {
    fontSize: 13,
    fontWeight: '900',
  },
  ok: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '800',
  },
  err: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '800',
  },
});
