import { Stack, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, Alert } from 'react-native';
import { supabase } from '../../src/supabase/client';
import { useTheme } from '../../src/theme/useTheme';
import Button from '../../src/components/common/Button';

const getFragmentParams = (url: string) => {
  const hashIndex = url.indexOf('#');
  if (hashIndex === -1) return {} as Record<string, string>;

  const fragment = url.slice(hashIndex + 1);
  const params = new URLSearchParams(fragment);
  const result: Record<string, string> = {};
  params.forEach((value, key) => {
    result[key] = value;
  });
  return result;
};

const getTokensFromUrl = (url: string | null) => {
  if (!url) return null;

  const parsed = Linking.parse(url);
  const fragmentParams = getFragmentParams(url);

  // Supabase recovery links may use query params or hash params depending on auth flow.
  const accessToken =
    (parsed.queryParams?.access_token as string | undefined) ??
    (parsed.queryParams?.['access_token'] as string | undefined) ??
    fragmentParams['access_token'];
  const refreshToken =
    (parsed.queryParams?.refresh_token as string | undefined) ??
    (parsed.queryParams?.['refresh_token'] as string | undefined) ??
    fragmentParams['refresh_token'];

  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
};

export default function ResetPassword() {
  const router = useRouter();
  const theme = useTheme();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  const url = Linking.useURL();

  const tokens = useMemo(() => getTokensFromUrl(url), [url]);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        const initialUrl = url ?? (await Linking.getInitialURL());
        const tokenSet = tokens ?? getTokensFromUrl(initialUrl);

        if (!tokenSet) {
          if (!cancelled) setSessionReady(false);
          return;
        }

        const { error } = await supabase.auth.setSession({
          access_token: tokenSet.accessToken,
          refresh_token: tokenSet.refreshToken,
        });

        if (error) {
          console.error(error);
          if (!cancelled) setSessionReady(false);
          return;
        }

        if (!cancelled) setSessionReady(true);
      } catch (e) {
        console.error(e);
        if (!cancelled) setSessionReady(false);
      }
    };

    init();

    return () => {
      cancelled = true;
    };
  }, [tokens, url]);

  const handleUpdatePassword = async () => {
    if (!password || password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      Alert.alert('Success', 'Password updated successfully.');
      router.replace('/(auth)/login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 16, backgroundColor: theme.background }}>
      <Stack.Screen options={{ title: 'Reset Password' }} />

      <Text style={{ fontSize: 24, marginBottom: 16, color: theme.text }} accessibilityRole="header">
        Reset Password
      </Text>

      {!sessionReady ? (
        <Text style={{ marginBottom: 16, color: theme.text }}>
          Open this screen from the password reset link sent to your email.
        </Text>
      ) : (
        <Text style={{ marginBottom: 16, color: theme.text }}>
          Enter your new password below.
        </Text>
      )}

      <TextInput
        placeholder="New password"
        placeholderTextColor={theme.secondary}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={{ borderWidth: 1, borderColor: theme.secondary, color: theme.text, padding: 8, marginBottom: 8, borderRadius: 4 }}
        accessibilityLabel="New password"
      />

      <TextInput
        placeholder="Confirm new password"
        placeholderTextColor={theme.secondary}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        style={{ borderWidth: 1, borderColor: theme.secondary, color: theme.text, padding: 8, marginBottom: 16, borderRadius: 4 }}
        accessibilityLabel="Confirm new password"
      />

      <Button
        title={loading ? 'Updating...' : 'Update Password'}
        onPress={handleUpdatePassword}
        disabled={loading || !sessionReady}
        accessibilityHint="Updates your account password"
      />

      <View style={{ marginTop: 16 }}>
        <Button title="Back to Login" onPress={() => router.replace('/(auth)/login')} variant="secondary" accessibilityHint="Returns to login" />
      </View>
    </View>
  );
}
