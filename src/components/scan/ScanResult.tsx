import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Card from '../common/Card';
import Button from '../common/Button';
import { useTheme } from '../../theme/useTheme';
import RecommendationCard, { Verdict } from './RecommendationCard';
import NutritionLabel from './NutritionLabel';
import VoiceButton from '../VoiceButton';
import { voiceManager } from '../../voice/VoiceManager';
import TranscriptDisplay from '../TranscriptDisplay';
import { sttProvider } from '../../voice/STTProvider';
import { VoiceAgent } from '../../agents/VoiceAgent';

export type ScanResultData = any;

const bestVerdict = (data: any): Verdict => {
  const v = String(data?.verdict || '').toUpperCase();
  if (v === 'APPROVED' || v === 'CAUTION' || v === 'AVOID') return v as Verdict;

  const allergyMatches = data?.allergyResult?.matchedAllergens;
  if (Array.isArray(allergyMatches) && allergyMatches.length > 0) {
    const sev = String(allergyMatches[0]?.severity || '').toLowerCase();
    if (sev === 'severe') return 'AVOID';
    return 'CAUTION';
  }

  const flags = data?.nutritionResult?.flags;
  if (flags?.highSodium || flags?.highSugar || flags?.highSaturatedFat) return 'CAUTION';

  return 'APPROVED';
};

export default function ScanResult({
  data,
  onSave,
  onDismiss,
  saving,
}: {
  data: ScanResultData;
  onSave: () => void;
  onDismiss: () => void;
  saving?: boolean;
}) {
  const theme = useTheme();
  const [voiceAnswer, setVoiceAnswer] = useState<string>('');
  const [isListening, setIsListening] = useState<boolean>(sttProvider.getState().isListening);
  const lastQuestionRef = useRef<string>('');
  const voiceAgentRef = useRef<VoiceAgent | null>(null);
  if (!voiceAgentRef.current) voiceAgentRef.current = new VoiceAgent();

  const productName = String(
    data?.productName ?? data?.visionResult?.productName ?? data?.product?.name ?? 'Unknown product',
  );

  const verdict = useMemo(() => bestVerdict(data), [data]);

  const allergens = useMemo(() => {
    const matched = data?.allergyResult?.matchedAllergens;
    if (Array.isArray(matched) && matched.length > 0) return matched;

    const ocr = data?.ocrResult?.allergens;
    if (Array.isArray(ocr) && ocr.length > 0) {
      return ocr.map((a: any) => ({ allergen: String(a), severity: 'unknown', ingredient: String(a), confidence: 0.3 }));
    }

    return [];
  }, [data]);

  const crossWarnings = useMemo(() => {
    const w = data?.allergyResult?.crossReactivityWarnings;
    return Array.isArray(w) ? w : [];
  }, [data]);

  const nutrition = data?.nutritionResult?.nutrition ?? data?.nutrition ?? null;
  const comparisons = data?.nutritionResult?.comparisons ?? data?.comparisons ?? null;

  const score = typeof data?.nutritionResult?.dietaryScore === 'number' ? data.nutritionResult.dietaryScore : null;

  const speechText = useMemo(() => {
    const rec = data?.recommendation ?? data;
    const v = String(rec?.verdict || verdict);
    const exp = String(rec?.explanation || '').trim();
    const alts = Array.isArray(rec?.alternatives) ? rec.alternatives : [];

    const parts: string[] = [];
    if (v) parts.push(`Verdict: ${v}.`);
    if (exp) {
      const trimmed = exp.replace(/\s+/g, ' ');
      const sentences = trimmed.split(/(?<=[.!?])\s+/).filter(Boolean);
      parts.push(sentences.slice(0, 2).join(' '));
    }
    if (alts.length > 0) parts.push(`Consider: ${String(alts[0])}.`);
    const combined = parts.join(' ');
    const finalSentences = combined.split(/(?<=[.!?])\s+/).filter(Boolean);
    return finalSentences.slice(0, 3).join(' ');
  }, [data, verdict]);

  useEffect(() => {
    return sttProvider.subscribe((s) => {
      setIsListening(Boolean(s?.isListening));
      if (!s?.finalTranscript) return;
      const q = String(s.finalTranscript || '').trim();
      if (!q) return;
      if (q === lastQuestionRef.current) return;
      lastQuestionRef.current = q;

      voiceAgentRef.current
        ?.answerQuestion({ question: q, scanContext: data, userId: data?.userId ?? null })
        .then((res) => {
          if (res?.answer) setVoiceAnswer(res.answer);
        })
        .catch(() => undefined);
    });
  }, [data]);

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.text }]}>Scan Result</Text>

      <RecommendationCard
        verdict={verdict}
        title={productName}
        subtitle={score != null ? `Dietary score: ${String(score)}/100` : undefined}
      />

      {allergens.length > 0 || crossWarnings.length > 0 ? (
        <Card>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Allergen Warnings</Text>

          {allergens.length > 0 ? (
            <View style={styles.block}>
              {allergens.map((m: any, idx: number) => (
                <View key={String(idx)} style={[styles.warningRow, { backgroundColor: 'rgba(231, 76, 60, 0.12)' }]}>
                  <Text style={[styles.warningText, { color: theme.text }]}>
                    {String(m.allergen || m)}
                    {m?.severity ? ` (${String(m.severity)})` : ''}
                  </Text>
                  {m?.ingredient ? (
                    <Text style={[styles.warningSub, { color: theme.text }]}>{String(m.ingredient)}</Text>
                  ) : null}
                </View>
              ))}
            </View>
          ) : null}

          {crossWarnings.length > 0 ? (
            <View style={styles.block}>
              <Text style={[styles.subTitle, { color: theme.text }]}>Cross-reactivity</Text>
              {crossWarnings.map((w: any, idx: number) => (
                <View key={String(idx)} style={[styles.warningRow, { backgroundColor: 'rgba(241, 196, 15, 0.14)' }]}>
                  <Text style={[styles.warningText, { color: theme.text }]}>
                    {String(w.userAllergy)} → {String(w.ingredientAllergen)}
                    {w?.severity ? ` (${String(w.severity)})` : ''}
                  </Text>
                  {w?.reason ? <Text style={[styles.warningSub, { color: theme.text }]}>{String(w.reason)}</Text> : null}
                </View>
              ))}
            </View>
          ) : null}
        </Card>
      ) : null}

      <NutritionLabel nutrition={nutrition} comparisons={comparisons} />

      <Card>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Voice</Text>
        <VoiceButton textToSpeak={speechText} />
      </Card>

      <Card>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Ask a question</Text>
        <TranscriptDisplay />
        <Button
          title={isListening ? 'Stop Mic' : 'Start Mic'}
          onPress={() =>
            isListening
              ? sttProvider.stop().catch(() => undefined)
              : sttProvider.start('en-US').catch(() => undefined)
          }
          variant={isListening ? 'danger' : 'secondary'}
        />
        {voiceAnswer ? <Text style={[styles.answer, { color: theme.text }]}>{voiceAnswer}</Text> : null}
      </Card>

      <Card>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Actions</Text>
        <Button title={saving ? 'Saving...' : 'Save Scan'} onPress={onSave} variant="primary" />
        <Button title="Dismiss" onPress={onDismiss} variant="secondary" />
      </Card>
    </View>
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
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 10,
  },
  subTitle: {
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 8,
    opacity: 0.9,
  },
  block: {
    gap: 8,
    marginBottom: 12,
  },
  warningRow: {
    padding: 10,
    borderRadius: 10,
    gap: 2,
  },
  warningText: {
    fontSize: 14,
    fontWeight: '900',
  },
  warningSub: {
    fontSize: 12,
    fontWeight: '700',
    opacity: 0.85,
  },
  answer: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '700',
  },
});
