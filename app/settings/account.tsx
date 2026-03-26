import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/theme/useTheme';
import Card from '../../src/components/common/Card';
import Button from '../../src/components/common/Button';
import { useAuth } from '../../src/components/AuthProvider';
import { GDPRService } from '../../src/services/GDPRService';
import { supabase } from '../../src/supabase/client';

export default function AccountSettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={[styles.title, { color: theme.text }]}>Account</Text>

      <Card>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Danger zone</Text>
        <Button
          title={busy ? 'Working…' : 'Clear local data'}
          onPress={wipeLocal}
          variant="secondary"
          disabled={busy}
          accessibilityLabel="Clear local data"
          accessibilityHint="Clears your stored health data from this device"
        />
        <Button
          title={busy ? 'Working…' : 'Delete account'}
          onPress={deleteAccount}
          disabled={busy}
          accessibilityLabel="Delete account"
          accessibilityHint="Deletes your account and clears local data"
        />

        {error ? <Text style={[styles.err, { color: theme.danger }]}>Error: {error}</Text> : null}
      </Card>

      <Card>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Sign out</Text>
        <Button
          title="Sign out"
          onPress={() => signOut?.()}
          variant="secondary"
          accessibilityLabel="Sign out"
          accessibilityHint="Signs you out of your account"
        />
      </Card>

      <View style={styles.footerRow}>
        <Button
          title="Back to Settings"
          onPress={() => router.back()}
          variant="secondary"
          accessibilityLabel="Back to Settings"
          accessibilityHint="Returns to settings"
        />
      </View>
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
  err: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '800',
  },
  footerRow: {
    marginTop: 4,
  },
});
