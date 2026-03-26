import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View, Text, TextInput, Alert } from 'react-native';
import { supabase } from '../../src/supabase/client';
import { useProfileCompletion } from '../../src/hooks/useProfileCompletion';
import { useTheme } from '../../src/theme/useTheme';
import Button from '../../src/components/common/Button';

const CompleteProfile = () => {
  const router = useRouter();
  const theme = useTheme();
  const { markProfileComplete } = useProfileCompletion();

  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState('');
  const [loading, setLoading] = useState(false);

  const onSave = async () => {
    if (!fullName.trim()) {
      Alert.alert('Error', 'Please enter your full name.');
      return;
    }

    setLoading(true);
    try {
      const ageNumber = age.trim() ? Number(age) : null;
      if (age.trim() && (!Number.isFinite(ageNumber) || ageNumber! <= 0)) {
        Alert.alert('Error', 'Please enter a valid age.');
        return;
      }

      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: fullName.trim(),
          age: ageNumber,
          sex: sex.trim() || null,
          profile_complete: true,
        },
      });

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      await markProfileComplete();
      router.replace('/(tabs)/home');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 16, backgroundColor: theme.background }}>
      <Stack.Screen options={{ title: 'Complete Profile' }} />

      <Text style={{ fontSize: 24, marginBottom: 16, color: theme.text }} accessibilityRole="header">
        Complete your profile
      </Text>
      <Text style={{ marginBottom: 16, color: theme.text }}>
        Please add a few details to finish setting up your account.
      </Text>

      <TextInput
        placeholder="Full name"
        placeholderTextColor={theme.secondary}
        value={fullName}
        onChangeText={setFullName}
        style={{ borderWidth: 1, borderColor: theme.secondary, color: theme.text, padding: 8, marginBottom: 8, borderRadius: 4 }}
        accessibilityLabel="Full name"
      />

      <TextInput
        placeholder="Age"
        placeholderTextColor={theme.secondary}
        value={age}
        onChangeText={setAge}
        keyboardType="numeric"
        style={{ borderWidth: 1, borderColor: theme.secondary, color: theme.text, padding: 8, marginBottom: 8, borderRadius: 4 }}
        accessibilityLabel="Age"
      />

      <TextInput
        placeholder="Sex"
        placeholderTextColor={theme.secondary}
        value={sex}
        onChangeText={setSex}
        style={{ borderWidth: 1, borderColor: theme.secondary, color: theme.text, padding: 8, marginBottom: 16, borderRadius: 4 }}
        accessibilityLabel="Sex"
      />

      <Button title={loading ? 'Saving...' : 'Save'} onPress={onSave} disabled={loading} accessibilityHint="Saves your profile" />

      <View style={{ marginTop: 16 }}>
        <Button title="Sign out" onPress={() => supabase.auth.signOut()} variant="secondary" accessibilityHint="Signs out of your account" />
      </View>
    </View>
  );
};

export default CompleteProfile;
