import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Verdict } from './RecommendationCard';
import VoiceButton from '../VoiceButton';
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
  onSave: _onSave,
  onDismiss: _onDismiss,
  saving: _saving,
}: {
  data: ScanResultData;
  onSave: () => void;
  onDismiss: () => void;
  saving?: boolean;
}) {
  const [voiceAnswer, setVoiceAnswer] = useState<string>('');
  const [isListening, setIsListening] = useState<boolean>(sttProvider.getState().isListening);
  const lastQuestionRef = useRef<string>('');
  const voiceAgentRef = useRef<VoiceAgent | null>(null);
  if (!voiceAgentRef.current) voiceAgentRef.current = new VoiceAgent();

  const productName = String(
    data?.productName ?? data?.visionResult?.productName ?? data?.product?.name ?? 'Unknown product',
  );

  const verdict = useMemo(() => bestVerdict(data), [data]);
  const confidence = Number(data?.recommendation?.confidence ?? data?.confidence ?? 0);

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
  const ingredients = String(data?.ocrResult?.ingredientsText ?? data?.ingredientsText ?? '').toLowerCase();
  const highGiWarning = ingredients.includes('corn syrup') || ingredients.includes('maltodextrin');

  const nutritionFacts = data?.ocrResult?.nutritionFacts;
  const nutritionFactsMissing = !Array.isArray(nutritionFacts) || nutritionFacts.length === 0;
  const shouldShowNutritionWarning = Boolean(data?.nutritionImageUri) && nutritionFactsMissing;
  const score =
    !nutritionFactsMissing && typeof data?.nutritionResult?.dietaryScore === 'number'
      ? data.nutritionResult.dietaryScore
      : null;
  const explanation = String(data?.recommendation?.explanation ?? '').trim();
  const alternatives = Array.isArray(data?.recommendation?.alternatives) ? data.recommendation.alternatives : [];

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

  const verdictConfig = {
    APPROVED: { bg: '#F0FFF4', border: '#34C759', text: '#1E7D36', icon: 'checkmark-circle', iconBg: '#34C759' },
    CAUTION: { bg: '#FFFBEB', border: '#FF9500', text: '#B06A00', icon: 'warning', iconBg: '#FF9500' },
    AVOID: { bg: '#FFF5F5', border: '#FF3B30', text: '#B42318', icon: 'close-circle', iconBg: '#FF3B30' },
  };
  const vc = verdictConfig[verdict] ?? verdictConfig.CAUTION;

  return (
    <View style={styles.container}>
      <View style={[styles.verdictCard, { backgroundColor: vc.bg, borderColor: vc.border }]}> 
        <View style={styles.verdictTopRow}>
          <View style={[styles.verdictIconCircle, { backgroundColor: vc.iconBg }]}> 
            <Ionicons name={vc.icon as any} size={28} color="#FFFFFF" />
          </View>
          <View style={styles.verdictTextWrap}>
            <Text style={[styles.verdictLabel, { color: vc.text }]}>{verdict}</Text>
            <Text style={styles.productName} numberOfLines={2}>{productName}</Text>
          </View>
        </View>
        <View style={styles.verdictBottomRow}>
          {score != null ? (
            <View style={styles.scorePill}>
              <Text style={[styles.scorePillText, { color: vc.text }]}>Score {score}/100</Text>
            </View>
          ) : null}
          <View style={styles.confidencePill}>
            <Text style={styles.confidencePillText}>
              {Math.round(Math.max(0, Math.min(1, confidence)) * 100)}% confidence
            </Text>
          </View>
        </View>
      </View>

      {explanation ? (
        <View style={styles.section}>
          <Text style={styles.groupHeader}>RECOMMENDATION</Text>
          <View style={styles.group}>
            <View style={styles.recRow}>
              <View style={[styles.recIconCircle, { backgroundColor: vc.iconBg }]}> 
                <Ionicons name="medical" size={17} color="#FFFFFF" />
              </View>
              <View style={styles.recContent}>
                <Text style={styles.recLabel}>Health Advisor</Text>
                <Text style={styles.recText}>{explanation}</Text>
                {alternatives.length > 0 ? (
                  <Text style={styles.recAlternatives}>
                    Consider: {alternatives.slice(0, 2).join(', ')}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.groupHeader}>ALLERGENS</Text>
        <View style={styles.group}>
          {allergens.length === 0 && crossWarnings.length === 0 ? (
            <View style={styles.allergenRow}>
              <View style={[styles.allergenIcon, { backgroundColor: '#34C759' }]}>
                <Ionicons name="checkmark" size={15} color="#FFFFFF" />
              </View>
              <Text style={styles.allergenName}>No allergen concerns detected</Text>
            </View>
          ) : (
            <>
              {allergens.length === 0 ? (
                <View style={styles.allergenRow}>
                  <View style={[styles.allergenIcon, { backgroundColor: '#34C759' }]}>
                    <Ionicons name="checkmark" size={15} color="#FFFFFF" />
                  </View>
                  <Text style={styles.allergenName}>No allergen concerns detected</Text>
                </View>
              ) : allergens.map((m: any, idx: number) => {
                const sev = String(m?.severity || 'unknown').toLowerCase();
                const iconBg = sev === 'severe' ? '#FF3B30' : sev === 'moderate' ? '#FF9500' : '#FFD60A';
                const sevLabel = sev.charAt(0).toUpperCase() + sev.slice(1);
                const isLast = idx === allergens.length - 1 && crossWarnings.length === 0;
                return (
                  <View key={String(idx)}>
                    <View style={styles.allergenRow}>
                      <View style={[styles.allergenIcon, { backgroundColor: iconBg }]}> 
                        <Ionicons name="warning" size={15} color="#FFFFFF" />
                      </View>
                      <Text style={styles.allergenName}>{String(m.allergen ?? m.name ?? m)}</Text>
                      <View style={[styles.severityPill, { backgroundColor: iconBg + '22' }]}> 
                        <Text style={[styles.severityPillText, { color: iconBg }]}>{sevLabel}</Text>
                      </View>
                    </View>
                    {!isLast ? <View style={styles.rowSep} /> : null}
                  </View>
                );
              })}
              {crossWarnings.map((w: any, idx: number) => (
                <View key={`cw-${idx}`}>
                  <View style={styles.rowSep} />
                  <View style={styles.allergenRow}>
                    <View style={[styles.allergenIcon, { backgroundColor: '#FF9500' }]}> 
                      <Ionicons name="git-compare" size={15} color="#FFFFFF" />
                    </View>
                    <Text style={styles.allergenName} numberOfLines={2}>
                      {String(w.userAllergy)} → {String(w.ingredientAllergen)}
                      {w?.severity ? ` (${String(w.severity)})` : ''}
                    </Text>
                  </View>
                </View>
              ))}
            </>
          )}
        </View>
      </View>

      {nutrition ? (
        <View style={styles.section}>
          <Text style={styles.groupHeader}>NUTRITION FACTS</Text>
          <View style={styles.group}>
            {[
              { key: 'caloriesKcal', label: 'Calories', unit: 'kcal' },
              { key: 'sodiumMg', label: 'Sodium', unit: 'mg' },
              { key: 'totalSugarsG', label: 'Sugar', unit: 'g' },
              { key: 'totalFatG', label: 'Total Fat', unit: 'g' },
              { key: 'saturatedFatG', label: 'Saturated Fat', unit: 'g' },
              { key: 'proteinG', label: 'Protein', unit: 'g' },
              { key: 'fiberG', label: 'Fiber', unit: 'g' },
              { key: 'totalCarbsG', label: 'Carbohydrates', unit: 'g' },
            ]
              .filter(({ key }) => typeof (nutrition as any)[key] === 'number')
              .map(({ key, label, unit }, idx, arr) => {
                const value = (nutrition as any)[key] as number;
                const comp = comparisons?.find((c: any) => c.nutrient === key.replace(/G$/, '').replace(/Mg$/, '').replace(/Kcal$/, ''));
                const pct = comp?.percentDV ?? null;
                const pctColor = pct == null ? '#8E8E93' : pct <= 20 ? '#34C759' : pct <= 40 ? '#FF9500' : '#FF3B30';
                return (
                  <View key={key}>
                    <View style={styles.nutritionRow}>
                      <Text style={styles.nutritionLabel}>{label}</Text>
                      <Text style={styles.nutritionValue}>{Math.round(value)} {unit}</Text>
                      {pct != null ? (
                        <Text style={[styles.nutritionPct, { color: pctColor }]}>{pct}%</Text>
                      ) : null}
                    </View>
                    {idx < arr.length - 1 ? <View style={styles.rowSep} /> : null}
                  </View>
                );
              })}
          </View>
          {nutritionFactsMissing && shouldShowNutritionWarning ? (
            <View style={styles.nutritionWarning}>
              <Ionicons name="information-circle" size={16} color="#FF9500" />
              <Text style={styles.nutritionWarningText}>Nutrition facts could not be read. Try scanning in better lighting.</Text>
            </View>
          ) : null}
        </View>
      ) : nutritionFactsMissing && shouldShowNutritionWarning ? (
        <View style={styles.section}>
          <Text style={styles.groupHeader}>NUTRITION FACTS</Text>
          <View style={styles.group}>
            <View style={styles.allergenRow}>
              <Ionicons name="information-circle" size={20} color="#FF9500" />
              <Text style={styles.allergenName}>Nutrition facts could not be read. Try scanning in better lighting.</Text>
            </View>
          </View>
        </View>
      ) : null}

      {highGiWarning ? (
        <View style={styles.giWarning}>
          <Ionicons name="warning" size={16} color="#FF9500" />
          <Text style={styles.giWarningText}>Contains corn syrup or maltodextrin — consider lower glycemic alternatives if monitoring blood sugar.</Text>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.groupHeader}>VOICE & QUESTIONS</Text>
        <View style={styles.group}>
          <View style={styles.voiceRow}>
            <VoiceButton textToSpeak={speechText} />
          </View>
          <View style={styles.rowSep} />
          <View style={styles.voiceRow}>
            <TranscriptDisplay />
            <Pressable
              style={[styles.micButton, isListening ? styles.micButtonActive : null]}
              onPress={() => isListening ? sttProvider.stop().catch(() => undefined) : sttProvider.start('en-US').catch(() => undefined)}
            >
              <Ionicons name={isListening ? 'stop' : 'mic'} size={18} color={isListening ? '#FFFFFF' : '#007AFF'} />
              <Text style={[styles.micText, isListening ? styles.micTextActive : null]}>
                {isListening ? 'Stop' : 'Ask Question'}
              </Text>
            </Pressable>
          </View>
          {voiceAnswer ? (
            <>
              <View style={styles.rowSep} />
              <View style={[styles.voiceRow, { paddingVertical: 14 }]}> 
                <Text style={styles.voiceAnswer}>{voiceAnswer}</Text>
              </View>
            </>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 8,
    paddingBottom: 6,
  },
  section: { marginTop: 8 },
  groupHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6D6D72',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 6,
  },
  group: { backgroundColor: '#FFFFFF', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#E5E5EA' },
  verdictCard: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    gap: 12,
  },
  verdictTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  verdictIconCircle: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  verdictTextWrap: { flex: 1 },
  verdictLabel: { fontSize: 28, fontWeight: '800', lineHeight: 34 },
  productName: { fontSize: 17, fontWeight: '500', color: '#1C1C1E', marginTop: 2, lineHeight: 24 },
  verdictBottomRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  scorePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.07)' },
  scorePillText: { fontSize: 13, fontWeight: '700' },
  confidencePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.07)' },
  confidencePillText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6D6D72',
  },
  recRow: { flexDirection: 'row', padding: 14, gap: 12, alignItems: 'flex-start' },
  recIconCircle: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 },
  recContent: { flex: 1 },
  recLabel: { fontSize: 13, fontWeight: '600', color: '#8E8E93', marginBottom: 4 },
  recText: { fontSize: 15, fontWeight: '400', color: '#1C1C1E', lineHeight: 22 },
  recAlternatives: { fontSize: 13, color: '#8E8E93', marginTop: 6, lineHeight: 20 },
  allergenRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, gap: 12 },
  allergenIcon: { width: 28, height: 28, borderRadius: 7, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  allergenName: { flex: 1, fontSize: 15, fontWeight: '400', color: '#1C1C1E' },
  severityPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  severityPillText: { fontSize: 12, fontWeight: '700' },
  rowSep: { height: 1, marginLeft: 56, backgroundColor: '#E5E5EA' },
  nutritionRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13 },
  nutritionLabel: { flex: 1, fontSize: 15, fontWeight: '400', color: '#1C1C1E' },
  nutritionValue: { fontSize: 15, fontWeight: '400', color: '#8E8E93', marginRight: 12 },
  nutritionPct: { fontSize: 13, fontWeight: '600', minWidth: 36, textAlign: 'right' },
  nutritionWarning: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingHorizontal: 16, paddingTop: 10 },
  nutritionWarningText: { flex: 1, fontSize: 13, color: '#FF9500', lineHeight: 18 },
  giWarning: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginHorizontal: 16, marginTop: 8, backgroundColor: '#FFF8EC', borderRadius: 10, padding: 12, borderLeftWidth: 3, borderLeftColor: '#FF9500' },
  giWarningText: { flex: 1, fontSize: 13, color: '#B06A00', lineHeight: 18 },
  voiceRow: { paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  micButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: '#007AFF' },
  micButtonActive: { backgroundColor: '#FF3B30', borderColor: '#FF3B30' },
  micText: { fontSize: 14, fontWeight: '600', color: '#007AFF' },
  micTextActive: { color: '#FFFFFF' },
  voiceAnswer: { fontSize: 15, fontWeight: '400', color: '#1C1C1E', lineHeight: 22, flex: 1 },
  answer: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 23,
  },
});
