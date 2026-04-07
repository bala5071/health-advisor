import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

export default function HealthProfile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState<'Male' | 'Female' | 'Other' | ''>('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');

  const canContinue = fullName.trim().length > 0 && age.trim().length > 0;

  const goToHealthConditions = () => {
    router.push({
      pathname: '/onboarding/health-conditions',
      params: { fullName, age, sex, weight, height },
    });
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
        <ProgressBar step={2} total={4} />

        <Text style={styles.title}>Tell us about{`\n`}yourself</Text>
        <Text style={styles.subtitle}>This helps us personalize health advice for you. All data stays on your device.</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Full Name</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="person-outline" size={18} color={COLORS.secondary} style={styles.inputIcon} />
            <TextInput
              placeholder="Your full name"
              placeholderTextColor="#C7C7CC"
              value={fullName}
              onChangeText={setFullName}
              style={styles.input}
              autoCapitalize="words"
            />
          </View>

          <Text style={[styles.label, { marginTop: 16 }]}>Age</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="calendar-outline" size={18} color={COLORS.secondary} style={styles.inputIcon} />
            <TextInput
              placeholder="Your age"
              placeholderTextColor="#C7C7CC"
              value={age}
              onChangeText={setAge}
              keyboardType="numeric"
              style={styles.input}
            />
          </View>

          <Text style={[styles.label, { marginTop: 16 }]}>Biological Sex</Text>
          <View style={styles.segmentRow}>
            {(['Male', 'Female', 'Other'] as const).map((option) => (
              <Pressable
                key={option}
                style={[styles.segmentPill, sex === option ? styles.segmentPillActive : null]}
                onPress={() => setSex(option)}
              >
                <Text style={[styles.segmentText, sex === option ? styles.segmentTextActive : null]}>
                  {option}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.label, { marginTop: 16 }]}>Weight <Text style={styles.labelUnit}>(kg)</Text></Text>
          <View style={styles.inputWrap}>
            <Ionicons name="barbell-outline" size={18} color={COLORS.secondary} style={styles.inputIcon} />
            <TextInput
              placeholder="Optional"
              placeholderTextColor="#C7C7CC"
              value={weight}
              onChangeText={setWeight}
              keyboardType="numeric"
              style={styles.input}
            />
          </View>

          <Text style={[styles.label, { marginTop: 16 }]}>Height <Text style={styles.labelUnit}>(cm)</Text></Text>
          <View style={styles.inputWrap}>
            <Ionicons name="resize-outline" size={18} color={COLORS.secondary} style={styles.inputIcon} />
            <TextInput
              placeholder="Optional"
              placeholderTextColor="#C7C7CC"
              value={height}
              onChangeText={setHeight}
              keyboardType="numeric"
              style={styles.input}
            />
          </View>
        </View>

        <Text style={styles.hint}>You can update this anytime in your profile.</Text>

        <View style={styles.flexSpacer} />

        <Pressable
          style={[styles.primaryButton, !canContinue ? styles.primaryButtonDisabled : null]}
          onPress={goToHealthConditions}
          disabled={!canContinue}
        >
          <Text style={styles.primaryButtonText}>Continue</Text>
          <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={styles.arrowIcon} />
        </Pressable>

        <Pressable style={styles.skipButton} onPress={goToHealthConditions}>
          <Text style={styles.skipText}>Skip for now</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

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
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.muted, marginBottom: 6 },
  labelUnit: { fontWeight: '400', color: COLORS.secondary },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    height: 50,
  },
  inputIcon: { marginLeft: 14, marginRight: 4 },
  input: { flex: 1, fontSize: 16, color: COLORS.text, paddingHorizontal: 10, height: '100%' },
  segmentRow: { flexDirection: 'row', gap: 8 },
  segmentPill: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: COLORS.inputBg,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentPillActive: { backgroundColor: '#E9F8EE', borderColor: COLORS.primary },
  segmentText: { fontSize: 14, fontWeight: '500', color: COLORS.secondary },
  segmentTextActive: { color: COLORS.primary, fontWeight: '700' },
  hint: { fontSize: 12, color: COLORS.secondary, textAlign: 'center', marginBottom: 20 },
  flexSpacer: { flex: 1, minHeight: 24 },
  primaryButton: {
    height: 52,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    marginBottom: 12,
  },
  primaryButtonDisabled: { opacity: 0.5 },
  primaryButtonText: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
  arrowIcon: { marginLeft: 8 },
  skipButton: { alignItems: 'center', paddingVertical: 8 },
  skipText: { fontSize: 14, color: COLORS.secondary },
});
