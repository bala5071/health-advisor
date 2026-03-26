import { useAuth } from '@/components/AuthProvider';
import { Stack, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text } from 'react-native';
import { supabase } from '@/supabase/client';

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

const getOAuthParamsFromUrl = (url: string | null) => {
  if (!url) return null;
  const parsed = Linking.parse(url);
  const fragmentParams = getFragmentParams(url);

  const code =
    (parsed.queryParams?.code as string | undefined) ??
    (parsed.queryParams?.['code'] as string | undefined) ??
    fragmentParams['code'];

  const accessToken =
    (parsed.queryParams?.access_token as string | undefined) ??
    (parsed.queryParams?.['access_token'] as string | undefined) ??
    fragmentParams['access_token'];
  const refreshToken =
    (parsed.queryParams?.refresh_token as string | undefined) ??
    (parsed.queryParams?.['refresh_token'] as string | undefined) ??
    fragmentParams['refresh_token'];

  return { code, accessToken, refreshToken };
};

const OAuthCallback = () => {
  const { session } = useAuth();
  const router = useRouter();
  const url = Linking.useURL();
  const [errorText, setErrorText] = useState<string | null>(null);

  const params = useMemo(() => getOAuthParamsFromUrl(url), [url]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        if (session) {
          router.replace('/(tabs)/home');
          return;
        }

        const initialUrl = url ?? (await Linking.getInitialURL());
        const p = params ?? getOAuthParamsFromUrl(initialUrl);
        if (!p) return;

        if (p.code) {
          const { error } = await supabase.auth.exchangeCodeForSession(p.code);
          if (error) {
            if (!cancelled) setErrorText(error.message);
          }
          return;
        }

        if (p.accessToken && p.refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: p.accessToken,
            refresh_token: p.refreshToken,
          });
          if (error) {
            if (!cancelled) setErrorText(error.message);
          }
        }
      } catch (e: any) {
        if (!cancelled) setErrorText(e?.message ?? 'OAuth callback failed.');
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [session, router, url, params]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Stack.Screen options={{ title: 'Logging in...' }} />
      <Text>{errorText ? `Login failed: ${errorText}` : 'Logging you in...'}</Text>
    </View>
  );
};

export default OAuthCallback;
