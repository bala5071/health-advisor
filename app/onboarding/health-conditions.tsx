import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
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

export default function HealthConditions() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();

  const [condition, setCondition] = useState('');
  const [conditions, setConditions] = useState<string[]>([]);
  const [allergy, setAllergy] = useState('');
  const [allergies, setAllergies] = useState<string[]>([]);
  const [medication, setMedication] = useState('');
  const [medications, setMedications] = useState<string[]>([]);

  const addItem = (
    value: string,
    list: string[],
    setList: (v: string[]) => void,
    clear: () => void,
  ) => {
    const trimmed = value.trim();
    if (!trimmed || list.includes(trimmed)) return;
    setList([...list, trimmed]);
    clear();
  };

  const removeItem = (
    item: string,
    list: string[],
    setList: (v: string[]) => void,
  ) => {
    setList(list.filter((i) => i !== item));
  };

  const handleContinue = () => {
    router.push({
      pathname: '/onboarding/permissions',
      params: {
        ...params,
        conditions: JSON.stringify(conditions),
        allergies: JSON.stringify(allergies),
        medications: JSON.stringify(medications),
      },
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <ProgressBar step={3} total={4} />

        <Text style={styles.title}>Your health{`\n`}context</Text>
        <Text style={styles.subtitle}>
          Help us give you better advice. Skip anything that doesn't apply.
        </Text>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIcon, { backgroundColor: '#FF2D5522' }]}>
              <Ionicons name="fitness" size={18} color="#FF2D55" />
            </View>
            <Text style={styles.cardTitle}>Health Conditions</Text>
          </View>
          <Text style={styles.cardHint}>e.g. Diabetes, Hypertension, Celiac disease</Text>
          <View style={styles.inputRow}>
            <View style={[styles.inputWrap, { flex: 1 }]}>
              <TextInput
                placeholder="Add condition"
                placeholderTextColor="#C7C7CC"
                value={condition}
                onChangeText={setCondition}
                style={styles.input}
                onSubmitEditing={() =>
                  addItem(condition, conditions, setConditions, () => setCondition(''))
                }
                returnKeyType="done"
              />
            </View>
            <Pressable
              style={styles.addButton}
              onPress={() =>
                addItem(condition, conditions, setConditions, () => setCondition(''))
              }
            >
              <Ionicons name="add" size={22} color="#FFFFFF" />
            </Pressable>
          </View>
          {conditions.length > 0 && (
            <View style={styles.chipWrap}>
              {conditions.map((c) => (
                <Pressable
                  key={c}
                  style={styles.chip}
                  onPress={() => removeItem(c, conditions, setConditions)}
                >
                  <Text style={styles.chipText}>{c}</Text>
                  <Ionicons name="close" size={13} color="#FF2D55" style={styles.chipCloseIcon} />
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIcon, { backgroundColor: '#FF950022' }]}>
              <Ionicons name="warning" size={18} color="#FF9500" />
            </View>
            <Text style={styles.cardTitle}>Allergies</Text>
          </View>
          <Text style={styles.cardHint}>e.g. Peanuts, Shellfish, Gluten, Lactose</Text>
          <View style={styles.inputRow}>
            <View style={[styles.inputWrap, { flex: 1 }]}>
              <TextInput
                placeholder="Add allergy"
                placeholderTextColor="#C7C7CC"
                value={allergy}
                onChangeText={setAllergy}
                style={styles.input}
                onSubmitEditing={() =>
                  addItem(allergy, allergies, setAllergies, () => setAllergy(''))
                }
                returnKeyType="done"
              />
            </View>
            <Pressable
              style={styles.addButton}
              onPress={() =>
                addItem(allergy, allergies, setAllergies, () => setAllergy(''))
              }
            >
              <Ionicons name="add" size={22} color="#FFFFFF" />
            </Pressable>
          </View>
          {allergies.length > 0 && (
            <View style={styles.chipWrap}>
              {allergies.map((a) => (
                <Pressable
                  key={a}
                  style={[styles.chip, styles.chipAmber]}
                  onPress={() => removeItem(a, allergies, setAllergies)}
                >
                  <Text style={[styles.chipText, styles.chipTextAmber]}>{a}</Text>
                  <Ionicons name="close" size={13} color="#FF9500" style={styles.chipCloseIcon} />
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIcon, { backgroundColor: '#007AFF22' }]}>
              <Ionicons name="medkit" size={18} color="#007AFF" />
            </View>
            <Text style={styles.cardTitle}>Medications</Text>
          </View>
          <Text style={styles.cardHint}>e.g. Metformin, Lisinopril, Aspirin</Text>
          <View style={styles.inputRow}>
            <View style={[styles.inputWrap, { flex: 1 }]}>
              <TextInput
                placeholder="Add medication"
                placeholderTextColor="#C7C7CC"
                value={medication}
                onChangeText={setMedication}
                style={styles.input}
                onSubmitEditing={() =>
                  addItem(medication, medications, setMedications, () => setMedication(''))
                }
                returnKeyType="done"
              />
            </View>
            <Pressable
              style={styles.addButton}
              onPress={() =>
                addItem(medication, medications, setMedications, () => setMedication(''))
              }
            >
              <Ionicons name="add" size={22} color="#FFFFFF" />
            </Pressable>
          </View>
          {medications.length > 0 && (
            <View style={styles.chipWrap}>
              {medications.map((m) => (
                <Pressable
                  key={m}
                  style={[styles.chip, styles.chipBlue]}
                  onPress={() => removeItem(m, medications, setMedications)}
                >
                  <Text style={[styles.chipText, styles.chipTextBlue]}>{m}</Text>
                  <Ionicons name="close" size={13} color="#007AFF" style={styles.chipCloseIcon} />
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <Pressable style={styles.primaryButton} onPress={handleContinue}>
          <Text style={styles.primaryButtonText}>Continue</Text>
          <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={styles.arrowIcon} />
        </Pressable>

        <Pressable style={styles.skipButton} onPress={handleContinue}>
          <Text style={styles.skipText}>Skip for now</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  progressWrap: { flexDirection: 'row', gap: 6, marginBottom: 28 },
  progressSegment: { flex: 1, height: 4, borderRadius: 2 },
  scroll: { paddingHorizontal: 20, flexGrow: 1 },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: COLORS.text,
    lineHeight: 38,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.secondary,
    lineHeight: 20,
    marginBottom: 24,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  cardIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  cardHint: { fontSize: 12, color: COLORS.secondary, marginBottom: 10 },
  inputRow: { flexDirection: 'row', gap: 8 },
  inputWrap: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    height: 46,
    justifyContent: 'center',
  },
  input: { fontSize: 15, color: COLORS.text, paddingHorizontal: 12 },
  addButton: {
    width: 46,
    height: 46,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE8EA',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  chipAmber: { backgroundColor: '#FFF4E5' },
  chipBlue: { backgroundColor: '#E8F0FF' },
  chipText: { fontSize: 13, fontWeight: '500', color: '#B42318' },
  chipTextAmber: { color: '#B06A00' },
  chipTextBlue: { color: '#0055CC' },
  chipCloseIcon: { marginLeft: 4 },
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
  primaryButtonText: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
  arrowIcon: { marginLeft: 8 },
  skipButton: { alignItems: 'center', paddingVertical: 8 },
  skipText: { fontSize: 14, color: COLORS.secondary },
});
