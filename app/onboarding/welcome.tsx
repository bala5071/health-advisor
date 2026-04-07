import { View, Text, StyleSheet, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
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

export default function Welcome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const features = [
    { icon: 'checkmark-circle', color: '#34C759', text: 'Scan any product instantly' },
    { icon: 'fitness', color: '#FF2D55', text: 'Personalized for your health' },
    { icon: 'lock-closed', color: '#007AFF', text: 'Your data stays on your device' },
  ];

  return (
    <KeyboardAvoidingView
      style={styles.keyboardRoot}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.root, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}> 
        <Stack.Screen options={{ headerShown: false }} />
        <ProgressBar step={1} total={4} />

        <View style={styles.iconWrap}>
          <Ionicons name="heart" size={40} color="#FFFFFF" />
        </View>

        <Text style={styles.title}>Welcome to{`\n`}Health Advisor</Text>
        <Text style={styles.subtitle}>Your personal AI companion{`\n`}for smarter food choices</Text>

        <View style={styles.features}>
          {features.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <View style={[styles.featureIcon, { backgroundColor: `${f.color}22` }]}>
                <Ionicons name={f.icon as keyof typeof Ionicons.glyphMap} size={20} color={f.color} />
              </View>
              <Text style={styles.featureText}>{f.text}</Text>
            </View>
          ))}
        </View>

        <View style={styles.flexSpacer} />

        <Pressable style={styles.primaryButton} onPress={() => router.push('/onboarding/health-profile')}>
          <Text style={styles.primaryButtonText}>Get Started</Text>
        </Pressable>

        <Pressable style={styles.linkButton} onPress={() => router.replace('/(auth)/login')}>
          <Text style={styles.linkButtonText}>
            Already have an account? <Text style={styles.linkHighlight}>Sign in</Text>
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardRoot: { flex: 1, backgroundColor: COLORS.bg },
  root: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 24 },
  progressWrap: { flexDirection: 'row', gap: 6, marginBottom: 28 },
  progressSegment: { flex: 1, height: 4, borderRadius: 2 },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 24,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    lineHeight: 40,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 36,
  },
  features: { gap: 14 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: { fontSize: 16, fontWeight: '500', color: COLORS.text, flex: 1 },
  flexSpacer: { flex: 1 },
  primaryButton: {
    height: 52,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  primaryButtonText: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
  linkButton: { alignItems: 'center', paddingVertical: 8 },
  linkButtonText: { fontSize: 14, color: COLORS.secondary },
  linkHighlight: { color: COLORS.primary, fontWeight: '700' },
});
