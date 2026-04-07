import {
  View,
  Text,
  Alert,
  ScrollView,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Camera } from 'expo-camera';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../src/supabase/client';
import { useProfileCompletion } from '../../src/hooks/useProfileCompletion';

const COLORS = {
  bg: '#F2F2F7',
  card: '#FFFFFF',
  primary: '#34C759',
  text: '#1C1C1E',
  secondary: '#8E8E93',
  muted: '#6D6D72',
  border: '#E5E5EA',
  inputBg: '#F2F2F7',
};

const ProgressBar = ({ step, total }: { step: number; total: number }) => (
  <View style={styles.progressWrap}>
    {Array.from({ length: total }).map((_, i) => (
      <View
        key={i}
        style={[
          styles.progressSegment,
          { backgroundColor: i < step ? COLORS.primary : COLORS.border },
        ]}
      />
    ))}
  </View>
);

const Permissions = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const [weeklyReports, setWeeklyReports] = useState(true);
  const [allergenAlerts, setAllergenAlerts] = useState(true);
  const { setOnboardingComplete } = useOnboarding();
  const { markProfileComplete } = useProfileCompletion();

  const parseJsonArray = (value: unknown): string[] => {
    try {
      const parsed = JSON.parse(String(value ?? '[]'));
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map((item) => String(item ?? '').trim())
        .filter((item) => item.length > 0);
    } catch {
      return [];
    }
  };

  const handleFinish = async () => {
    const fullName = String(params.fullName || '').trim();
    const ageValue = String(params.age || '').trim();
    const ageNumber = ageValue ? Number(ageValue) : null;
    const age = ageNumber != null && Number.isFinite(ageNumber) ? ageNumber : null;
    const sex = String(params.sex || '').trim() || null;

    const conditions = parseJsonArray(params.conditions);
    const allergies = parseJsonArray(params.allergies);
    const medications = parseJsonArray(params.medications);

    try {
      await supabase.auth
        .updateUser({
          data: {
            full_name: fullName || undefined,
            age,
            sex,
            profile_complete: true,
          },
        })
        .catch(() => undefined);
    } catch {
      // ignore
    }

    try {
      const repos = require('../../src/database/repositories');
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const userId = user?.id;

      if (userId) {
        let profile = await repos.UserRepository.getHealthProfile(userId).catch(() => null);
        if (!profile) {
          profile = await repos.UserRepository.createHealthProfile({ user_id: userId } as any).catch(() => null);
        }

        if (profile?.id) {
          for (const name of conditions) {
            await repos.ConditionRepository.createCondition({
              health_profile_id: profile.id,
              name,
            } as any).catch(() => undefined);
          }

          for (const name of allergies) {
            await repos.AllergyRepository.createAllergy({
              health_profile_id: profile.id,
              name,
              severity: 'None',
            } as any).catch(() => undefined);
          }

          for (const name of medications) {
            await repos.MedicationRepository.createMedication({
              health_profile_id: profile.id,
              name,
              dosage: '',
              frequency: '',
              notes: '',
            } as any).catch(() => undefined);
          }
        }
      }
    } catch {
      // ignore
    }

    await markProfileComplete().catch(() => undefined);
    await setOnboardingComplete().catch(() => undefined);
    router.replace('/(tabs)/home');
  };

  const requestPermissions = async () => {
    const { status: cameraStatus } = await Camera.requestCameraPermissionsAsync();
    const { status: microphoneStatus } = await Camera.requestMicrophonePermissionsAsync();

    if (cameraStatus !== 'granted' || microphoneStatus !== 'granted') {
      Alert.alert('Permissions required', 'Please grant camera and microphone permissions in your device settings.');
    } else {
      await handleFinish();
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <ProgressBar step={4} total={4} />

        <Text style={styles.title}>Enable notifications</Text>
        <Text style={styles.subtitle}>Get alerts for allergen warnings and weekly health reports</Text>

        <View style={styles.card}>
          <View style={styles.permissionRow}>
            <View style={styles.permissionLeft}>
              <View style={[styles.permissionIconWrap, styles.permissionIconOrange]}>
                <Ionicons name="notifications" size={18} color="#FF9500" />
              </View>
              <Text style={styles.permissionText}>Weekly Reports</Text>
            </View>
            <Switch
              value={weeklyReports}
              onValueChange={setWeeklyReports}
              trackColor={{ false: '#D1D1D6', true: '#A9E5B8' }}
              thumbColor={weeklyReports ? '#34C759' : '#FFFFFF'}
            />
          </View>

          <View style={styles.separator} />

          <View style={styles.permissionRow}>
            <View style={styles.permissionLeft}>
              <View style={[styles.permissionIconWrap, styles.permissionIconRed]}>
                <Ionicons name="warning" size={18} color="#FF3B30" />
              </View>
              <Text style={styles.permissionText}>Allergen Alerts</Text>
            </View>
            <Switch
              value={allergenAlerts}
              onValueChange={setAllergenAlerts}
              trackColor={{ false: '#D1D1D6', true: '#A9E5B8' }}
              thumbColor={allergenAlerts ? '#34C759' : '#FFFFFF'}
            />
          </View>
        </View>

        <Text style={styles.hint}>You can update these preferences anytime in app settings.</Text>

        <View style={styles.flexSpacer} />

        <Pressable style={styles.primaryButton} onPress={requestPermissions}>
          <Text style={styles.primaryButtonText}>Finish Setup</Text>
        </Pressable>

        <Pressable style={styles.skipButton} onPress={handleFinish}>
          <Text style={styles.skipText}>Maybe later</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default Permissions;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { paddingHorizontal: 24, flexGrow: 1 },
  progressWrap: { flexDirection: 'row', gap: 6, marginBottom: 28 },
  progressSegment: { flex: 1, height: 4, borderRadius: 2 },
  title: { fontSize: 30, fontWeight: '700', color: COLORS.text, lineHeight: 38, marginBottom: 8 },
  subtitle: { fontSize: 14, color: COLORS.secondary, lineHeight: 20, marginBottom: 28 },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  permissionRow: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  permissionLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  permissionIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionIconOrange: { backgroundColor: '#FFF3E6' },
  permissionIconRed: { backgroundColor: '#FFECEC' },
  permissionText: { fontSize: 16, fontWeight: '500', color: COLORS.text, flex: 1 },
  separator: { height: 1, backgroundColor: COLORS.border, marginLeft: 46 },
  hint: { fontSize: 12, color: COLORS.secondary, textAlign: 'center', marginBottom: 20 },
  flexSpacer: { flex: 1, minHeight: 24 },
  primaryButton: {
    height: 52,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    marginBottom: 12,
  },
  primaryButtonText: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
  skipButton: { alignItems: 'center', paddingVertical: 8 },
  skipText: { fontSize: 14, color: COLORS.secondary },
});
