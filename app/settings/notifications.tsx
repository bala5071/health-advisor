import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../src/components/AuthProvider';
import { useTheme } from '../../src/theme/useTheme';
import { NotificationPreferences, NotificationService } from '../../src/services/NotificationService';

export default function NotificationSettingsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const theme = useTheme();

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
      const next = await NotificationService.loadPreferences(user.id);
      setPrefs(next);
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
      Alert.alert('Permissions updated', 'Notification permissions were requested.');
    } catch (e: any) {
      setError(String(e?.message || e));
    }
  };

  const chevron = <Ionicons name="chevron-forward" size={17} color="#C7C7CC" />;

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: theme.background }]}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 20 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.screenTitle, theme.typography.display, { color: theme.text }]}>Notifications</Text>

      <Text style={[styles.sectionHeader, theme.typography.caption, { color: theme.textSecondary }]}>PREFERENCES</Text>
      <View style={[styles.group, { backgroundColor: theme.surface, borderColor: theme.border }]}> 
        <View style={[styles.row, { backgroundColor: theme.surface }]}> 
          <Text style={[styles.rowLabel, theme.typography.body, { color: theme.text }]}>Weekly Report Ready</Text>
          <Switch
            value={prefs.weeklyReportReady}
            onValueChange={(v) => setPrefs((p) => ({ ...p, weeklyReportReady: v }))}
            trackColor={{ false: '#D1D1D6', true: theme.primary }}
            thumbColor="#FFFFFF"
          />
        </View>
        <View style={[styles.separator, { backgroundColor: theme.border }]} />
        <View style={[styles.row, { backgroundColor: theme.surface }]}> 
          <Text style={[styles.rowLabel, theme.typography.body, { color: theme.text }]}>Severe Allergen Alert</Text>
          <Switch
            value={prefs.severeAllergenAlert}
            onValueChange={(v) => setPrefs((p) => ({ ...p, severeAllergenAlert: v }))}
            trackColor={{ false: '#D1D1D6', true: theme.primary }}
            thumbColor="#FFFFFF"
          />
        </View>
        <View style={[styles.separator, { backgroundColor: theme.border }]} />
        <View style={[styles.row, { backgroundColor: theme.surface }]}> 
          <Text style={[styles.rowLabel, theme.typography.body, { color: theme.text }]}>Daily Scan Nudge</Text>
          <Switch
            value={prefs.dailyNoScanNudge}
            onValueChange={(v) => setPrefs((p) => ({ ...p, dailyNoScanNudge: v }))}
            trackColor={{ false: '#D1D1D6', true: theme.primary }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      <Text style={[styles.sectionHeader, theme.typography.caption, { color: theme.textSecondary }]}>ACTIONS</Text>
      <View style={[styles.group, { backgroundColor: theme.surface, borderColor: theme.border }]}> 
        <Pressable style={[styles.row, { backgroundColor: theme.surface }]} onPress={requestPermissions}>
          <Text style={[styles.rowLabel, theme.typography.body, { color: theme.text }]}>Request Permissions</Text>
          {chevron}
        </Pressable>
        <View style={[styles.separator, { backgroundColor: theme.border }]} />
        <Pressable style={[styles.row, { backgroundColor: theme.surface }]} onPress={save} disabled={loading}>
          <Text style={[styles.rowLabel, theme.typography.body, { color: theme.text }]}>{loading ? 'Saving…' : 'Save Preferences'}</Text>
          <Text style={saved ? [styles.savedText, { color: theme.primary }] : [styles.rowValue, theme.typography.subhead, { color: theme.textSecondary }]}>{saved ? 'Saved ✓' : ''}</Text>
        </Pressable>
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
  rowLabel: {
    fontWeight: '400',
  },
  rowValue: {
    fontWeight: '400',
  },
  savedText: {
    fontSize: 15,
    color: '#34C759',
    fontWeight: '600',
  },
  separator: {
    height: 1,
    marginLeft: 16,
    backgroundColor: '#E5E5EA',
  },
  errorText: {
    marginTop: 12,
    marginHorizontal: 16,
    fontSize: 13,
    color: '#FF3B30',
    fontWeight: '600',
  },
});
