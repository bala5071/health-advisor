export type DietaryThresholds = {
  sodiumMgPerDayFDA: number;
  addedSugarGPerDayFDA: number;
  saturatedFatGPerDayFDA: number;
  caloriesPerDayFDA: number;
};

export type ConditionFoodRule = {
  id: string;
  conditionKeywords: string[];
  title: string;
  guidance: string;
  relatedNutrients?: Array<'sodium' | 'sugar' | 'saturated_fat' | 'fiber' | 'protein' | 'fat' | 'carbs'>;
};

export type MedicationNutrientRule = {
  id: string;
  medicationKeywords: string[];
  title: string;
  guidance: string;
  interactionKeywords: string[];
};

export type HealthKnowledgeBaseData = {
  thresholds: DietaryThresholds;
  conditionFoodRules: ConditionFoodRule[];
  medicationNutrientRules: MedicationNutrientRule[];
};

const normalize = (s: string) =>
  (s || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/[ ]{2,}/g, ' ')
    .trim();

export const HEALTH_KB: HealthKnowledgeBaseData = {
  thresholds: {
    sodiumMgPerDayFDA: 2300,
    addedSugarGPerDayFDA: 50,
    saturatedFatGPerDayFDA: 20,
    caloriesPerDayFDA: 2000,
  },
  conditionFoodRules: [
    {
      id: 'htn_low_sodium',
      conditionKeywords: ['hypertension', 'high blood pressure', 'blood pressure', 'heart disease', 'heart'],
      title: 'Limit sodium for blood pressure/heart health',
      guidance:
        'Prefer low-sodium foods. High sodium intake can worsen blood pressure; aim to keep sodium lower, especially if the product is salty/processed.',
      relatedNutrients: ['sodium'],
    },
    {
      id: 'diabetes_low_sugar',
      conditionKeywords: ['diabetes', 'prediabetes', 'insulin resistance'],
      title: 'Limit added sugars for glucose control',
      guidance:
        'Avoid products with high added sugars. Choose low-sugar alternatives and pair carbs with fiber/protein to reduce glucose spikes.',
      relatedNutrients: ['sugar', 'fiber', 'protein', 'carbs'],
    },
    {
      id: 'kidney_sodium_phosphorus_general',
      conditionKeywords: ['kidney disease', 'ckd', 'renal'],
      title: 'Be cautious with processed foods in kidney disease',
      guidance:
        'Processed foods can be high in sodium and additives. Prefer simpler ingredient lists and lower sodium options; follow clinician guidance for individualized restrictions.',
      relatedNutrients: ['sodium'],
    },
    {
      id: 'hyperlipidemia_satfat',
      conditionKeywords: ['high cholesterol', 'hyperlipidemia', 'cholesterol'],
      title: 'Limit saturated fat for cholesterol',
      guidance:
        'High saturated fat intake can worsen LDL cholesterol. Prefer lower saturated fat options and include fiber-rich foods.',
      relatedNutrients: ['saturated_fat', 'fiber'],
    },
    {
      id: 'celiac_gluten',
      conditionKeywords: ['celiac', 'gluten'],
      title: 'Strict gluten avoidance',
      guidance:
        'If you have celiac disease or medically required gluten avoidance, avoid products containing wheat, barley, rye, or malt unless certified gluten-free.',
    },
  ],
  medicationNutrientRules: [
    {
      id: 'warfarin_vitk',
      medicationKeywords: ['warfarin', 'coumadin'],
      title: 'Vitamin K consistency with warfarin',
      guidance:
        'If you take warfarin, keep vitamin K intake consistent. Sudden increases (e.g., large servings of leafy greens) can affect INR. Coordinate with your clinician.',
      interactionKeywords: ['vitamin k', 'k1', 'k2', 'leafy greens', 'spinach', 'kale'],
    },
    {
      id: 'statins_grapefruit',
      medicationKeywords: ['atorvastatin', 'simvastatin', 'lovastatin', 'statin'],
      title: 'Avoid grapefruit with some statins',
      guidance:
        'Grapefruit can increase blood levels of certain statins, raising side effect risk. Avoid grapefruit/grapefruit juice unless your clinician says otherwise.',
      interactionKeywords: ['grapefruit'],
    },
    {
      id: 'maoi_tyramine',
      medicationKeywords: ['phenelzine', 'tranylcypromine', 'isocarboxazid', 'maoi'],
      title: 'Limit tyramine with MAOIs',
      guidance:
        'With MAOI medications, high-tyramine foods (aged/fermented) can cause dangerous blood pressure spikes. Avoid aged cheeses and fermented products.',
      interactionKeywords: ['tyramine', 'aged cheese', 'fermented', 'soy sauce', 'kimchi'],
    },
    {
      id: 'acei_high_potassium_general',
      medicationKeywords: ['lisinopril', 'enalapril', 'ramipril', 'ace inhibitor', 'arb', 'losartan', 'valsartan'],
      title: 'Potassium caution with ACEi/ARBs (general)',
      guidance:
        'Some blood pressure medicines can raise potassium. If you use potassium supplements or salt substitutes, discuss with your clinician.',
      interactionKeywords: ['potassium', 'salt substitute'],
    },
  ],
};

export const getDietaryThresholds = () => HEALTH_KB.thresholds;

export const retrieveHealthKbContext = (opts: {
  conditions: string[];
  medications: string[];
  analysisResults: any;
}): { contextText: string; matchedRuleIds: string[] } => {
  const condNorm = (opts.conditions || []).map(normalize).filter(Boolean);
  const medNorm = (opts.medications || []).map(normalize).filter(Boolean);
  const analysisText = normalize(JSON.stringify(opts.analysisResults ?? {}));

  const matchedRuleIds: string[] = [];
  const lines: string[] = [];

  const thresholds = getDietaryThresholds();
  lines.push('DIETARY_THRESHOLDS');
  lines.push(`- FDA sodium guideline: ${thresholds.sodiumMgPerDayFDA} mg/day`);
  lines.push(`- FDA added sugar guideline: ${thresholds.addedSugarGPerDayFDA} g/day`);
  lines.push(`- FDA saturated fat guideline: ${thresholds.saturatedFatGPerDayFDA} g/day`);

  for (const rule of HEALTH_KB.conditionFoodRules) {
    const hit = rule.conditionKeywords.some((k) => condNorm.some((c) => c.includes(normalize(k)) || normalize(k).includes(c))) ||
      rule.conditionKeywords.some((k) => analysisText.includes(normalize(k)));
    if (!hit) continue;

    matchedRuleIds.push(rule.id);
    lines.push(`CONDITION_RULE: ${rule.title}`);
    lines.push(`- ${rule.guidance}`);
  }

  for (const rule of HEALTH_KB.medicationNutrientRules) {
    const hit = rule.medicationKeywords.some((k) => medNorm.some((m) => m.includes(normalize(k)) || normalize(k).includes(m)));
    if (!hit) continue;

    matchedRuleIds.push(rule.id);
    lines.push(`MEDICATION_RULE: ${rule.title}`);
    lines.push(`- ${rule.guidance}`);

    const interactionHit = rule.interactionKeywords.some((k) => analysisText.includes(normalize(k)));
    if (interactionHit) {
      lines.push(`- Interaction keyword detected in analysis context: ${rule.interactionKeywords.join(', ')}`);
    }
  }

  const unique = Array.from(new Set(matchedRuleIds));
  return {
    contextText: lines.join('\n'),
    matchedRuleIds: unique,
  };
};
