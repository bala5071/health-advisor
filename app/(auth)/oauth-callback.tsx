import { useAuth } from '@/src/components/AuthProvider';
import { Stack } from 'expo-router';
import React, { useEffect } from 'react';
import { View, Text } from 'react-native';

const OAuthCallback = () => {
  const { session } = useAuth();

  useEffect(() => {
    // Handle session logic here
  }, [session]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Stack.Screen options={{ title: 'Logging in...' }} />
      <Text>Logging you in...</Text>
    </View>
  );
};

export default OAuthCallback;
