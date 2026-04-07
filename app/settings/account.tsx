import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../src/components/AuthProvider';
import { useTheme } from '../../src/theme/useTheme';
import { GDPRService } from '../../src/services/GDPRService';
import { supabase } from '../../src/supabase/client';

export default function AccountSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { user, signOut } = useAuth();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wipeLocal = async () => {
    if (!user?.id) {
      Alert.alert('Sign in required', 'You must be signed in to wipe local data.');
      return;
    }

    Alert.alert(
      'Clear local data?',
      'This will remove your profile, conditions, allergies, medications, scans, and reports from this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              setBusy(true);
              setError(null);
              await GDPRService.wipeLocalUserData(user.id, { includeScans: true, includeReports: true });
              Alert.alert('Cleared', 'Local data cleared successfully.');
            } catch (e: any) {
              setError(String(e?.message || e));
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };

  const deleteAccount = async () => {
    if (!user?.id) {
      Alert.alert('Sign in required', 'You must be signed in to delete your account.');
      return;
    }

    Alert.alert(
      'Delete account?',
      'This will delete your Supabase account (if server deletion is configured) and clear local data on this device. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: async () => {
            Alert.alert(
              'Final confirmation',
              'Are you sure you want to permanently delete your account?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      setBusy(true);
                      setError(null);

                      await GDPRService.wipeLocalUserData(user.id, { includeScans: true, includeReports: true }).catch(() => undefined);

                      // Best-effort server deletion: requires an Edge Function named 'delete-account'
                      // deployed in your Supabase project. If not present, we still sign out and clear local.
                      try {
                        await supabase.functions.invoke('delete-account', { body: {} });
                      } catch {
                        // ignore
                      }

                      await signOut?.();
                      Alert.alert('Account deleted', 'Your account has been deleted (or scheduled for deletion) and local data has been cleared.');
                      router.replace('/(auth)/login');
                    } catch (e: any) {
                      setError(String(e?.message || e));
                    } finally {
                      setBusy(false);
                    }
                  },
                },
              ],
            );
          },
        },
      ],
    );
  };

  const sectionHeader = (title: string) => (
    <Text style={[styles.sectionHeader, theme.typography.caption, { color: theme.textSecondary }]}>{title}</Text>
  );

  const chevron = <Ionicons name="chevron-forward" size={17} color="#C7C7CC" />;

  const RowIcon = ({ name, bg, color }: { name: string; bg: string; color: string }) => (
    <View style={[styles.iconCircle, { backgroundColor: bg }]}> 
      <Ionicons name={name as any} size={17} color={color} />
    </View>
  );

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: theme.background }]}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 20 }]}
    >
      <Text style={[styles.screenTitle, theme.typography.display, { color: theme.text }]}>Account</Text>

      {sectionHeader('ACCOUNT')}
      <View style={[styles.group, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={[styles.row, { backgroundColor: theme.surface }]}>
          <View style={styles.rowLeft}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {(user?.email ?? 'U').slice(0, 1).toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={[styles.accountEmail, theme.typography.body, { color: theme.text }]}>{user?.email ?? 'Not signed in'}</Text>
              <Text style={[styles.accountMeta, theme.typography.caption, { color: theme.textSecondary }]}>Health Advisor Account</Text>
            </View>
          </View>
        </View>
      </View>

      {sectionHeader('SESSION')}
      <View style={[styles.group, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Pressable style={[styles.row, { backgroundColor: theme.surface }]} onPress={() => signOut?.()}>
          <View style={styles.rowLeft}>
            <RowIcon name="log-out" bg="#FF9500" color="#FFFFFF" />
            <Text style={[styles.rowLabel, theme.typography.body, { color: theme.text }]}>Sign Out</Text>
          </View>
          {chevron}
        </Pressable>
      </View>

      {sectionHeader('DATA')}
      <View style={[styles.group, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Pressable style={[styles.row, { backgroundColor: theme.surface }]} onPress={wipeLocal} disabled={busy}>
          <View style={styles.rowLeft}>
            <RowIcon name="trash-bin" bg="#FF9500" color="#FFFFFF" />
            <Text style={[styles.rowLabel, theme.typography.body, { color: theme.text }]}>{busy ? 'Working…' : 'Clear Local Data'}</Text>
          </View>
          {chevron}
        </Pressable>
      </View>

      {sectionHeader('DANGER ZONE')}
      <View style={[styles.group, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Pressable style={[styles.row, { backgroundColor: theme.surface }]} onPress={deleteAccount} disabled={busy}>
          <View style={styles.rowLeft}>
            <RowIcon name="warning" bg="#FF3B30" color="#FFFFFF" />
            <Text style={[styles.rowLabel, theme.typography.body, styles.destructive]}>{busy ? 'Working…' : 'Delete Account'}</Text>
          </View>
          {chevron}
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
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconCircle: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#34C759',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  accountEmail: {
    fontWeight: '400',
  },
  accountMeta: {
    fontWeight: '400',
  },
  rowLabel: {
    fontWeight: '400',
  },
  destructive: {
    color: '#FF3B30',
  },
  errorText: {
    marginTop: 12,
    marginHorizontal: 16,
    fontSize: 13,
    color: '#FF3B30',
    fontWeight: '600',
  },
});
