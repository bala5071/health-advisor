import { Q } from '@nozbe/watermelondb';
import database from '../database/DatabaseManager';
import USDAFood from '../database/models/USDAFood';
import HealthProfile from '../database/models/HealthProfile';

export type OCRNutritionFact = {
  name: string;
  value: string;
};

export type NutritionFlags = {
  highSodium?: boolean;
  highSugar?: boolean;
  highSaturatedFat?: boolean;
};

export type DailyValueComparison = {
  nutrient: string;
  amount: number;
  unit: 'g' | 'mg' | 'kcal';
  dvAmount: number;
  dvUnit: 'g' | 'mg' | 'kcal';
  percentDV: number;
};

export type NormalizedNutritionFacts = {
  caloriesKcal?: number;
  proteinG?: number;
  totalCarbsG?: number;
  totalSugarsG?: number;
  fiberG?: number;
  totalFatG?: number;
  saturatedFatG?: number;
  sodiumMg?: number;
};

export type NutritionAgentResult = {
  nutrition: NormalizedNutritionFacts;
  comparisons: DailyValueComparison[];
  flags: NutritionFlags;
  dietaryScore: number;
  matchedUsdaFood?: {
    fdcId: number;
    name: string;
    nutrients: NormalizedNutritionFacts;
  } | null;
};

const usdaFoodsCollection = database.collections.get<USDAFood>('usda_foods');
const healthProfiles = database.collections.get<HealthProfile>('health_profiles');

// Minimal compressed subset (per 100g) – small enough to embed directly.
const USDA_SEED: Array<{ fdcId: number; name: string; nutrients: NormalizedNutritionFacts }> = [
  {
    fdcId: 171688,
    name: 'Apple, raw, with skin',
    nutrients: {
      caloriesKcal: 52,
      proteinG: 0.26,
      totalCarbsG: 13.81,
      totalSugarsG: 10.39,
      fiberG: 2.4,
      totalFatG: 0.17,
      saturatedFatG: 0.03,
      sodiumMg: 1,
    },
  },
  {
    fdcId: 173944,
    name: 'Banana, raw',
    nutrients: {
      caloriesKcal: 89,
      proteinG: 1.09,
      totalCarbsG: 22.84,
      totalSugarsG: 12.23,
      fiberG: 2.6,
      totalFatG: 0.33,
      saturatedFatG: 0.11,
      sodiumMg: 1,
    },
  },
  {
    fdcId: 171705,
    name: 'Chicken breast, roasted',
    nutrients: {
      caloriesKcal: 165,
      proteinG: 31.02,
      totalCarbsG: 0,
      totalSugarsG: 0,
      fiberG: 0,
      totalFatG: 3.57,
      saturatedFatG: 1.01,
      sodiumMg: 74,
    },
  },
  {
    fdcId: 170379,
    name: 'Milk, whole',
    nutrients: {
      caloriesKcal: 61,
      proteinG: 3.15,
      totalCarbsG: 4.8,
      totalSugarsG: 5.05,
      fiberG: 0,
      totalFatG: 3.25,
      saturatedFatG: 1.86,
      sodiumMg: 43,
    },
  },
  {
    fdcId: 168912,
    name: 'Bread, white',
    nutrients: {
      caloriesKcal: 266,
      proteinG: 7.64,
      totalCarbsG: 49.42,
      totalSugarsG: 5.0,
      fiberG: 2.7,
      totalFatG: 3.29,
      saturatedFatG: 0.71,
      sodiumMg: 491,
    },
  },
];

let seedingPromise: Promise<void> | null = null;

const toSearchName = (name: string) =>
  (name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/[ ]{2,}/g, ' ')
    .trim();

const ensureUsdaSeeded = async (): Promise<void> => {
  if (seedingPromise) return seedingPromise;

  seedingPromise = (async () => {
    const existing = await usdaFoodsCollection.query().fetchCount();
    if (existing > 0) return;

    await database.write(async () => {
      for (const item of USDA_SEED) {
        await usdaFoodsCollection.create((row: any) => {
          row.fdcId = item.fdcId;
          row.name = item.name;
          row.searchName = toSearchName(item.name);
          row.nutrientsJson = JSON.stringify(item.nutrients);
          (row as any)._raw.created_at ??= Date.now();
        });
      }
    });
  })();

  return seedingPromise;
};

const parseNumber = (raw: string): number | null => {
  const m = (raw || '').replace(',', '.').match(/-?\d+(?:\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
};

const parseAmountTo = (value: string, target: 'g' | 'mg' | 'kcal'): number | null => {
  const v = (value || '').trim();
  const n = parseNumber(v);
  if (n == null) return null;

  const lower = v.toLowerCase();
  const hasMg = /\bmg\b/.test(lower);
  const hasG = /\bg\b/.test(lower);
  const hasKcal = /\bkcal\b/.test(lower);
  const hasKj = /\bkj\b/.test(lower);

  if (target === 'kcal') {
    if (hasKcal) return n;
    if (hasKj) return Math.round(n / 4.184);
    return n;
  }

  if (target === 'mg') {
    if (hasMg) return n;
    if (hasG) return Math.round(n * 1000);
    return n;
  }

  // target === 'g'
  if (hasG) return n;
  if (hasMg) return n / 1000;
  return n;
};

const normalizeKey = (name: string) =>
  (name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

export class NutritionAgent {
  parseNutritionFacts(nutritionFacts: OCRNutritionFact[]): NormalizedNutritionFacts {
    try {
      const out: NormalizedNutritionFacts = {};

      for (const fact of nutritionFacts || []) {
        const key = normalizeKey(fact.name);
        const value = fact.value || '';

        if (key.includes('calories') || key === 'calorie') {
          const kcal = parseAmountTo(value, 'kcal');
          if (kcal != null) out.caloriesKcal = kcal;
          continue;
        }

        if (key.includes('protein')) {
          const g = parseAmountTo(value, 'g');
          if (g != null) out.proteinG = g;
          continue;
        }

        if (key.includes('sodium') || key.includes('salt')) {
          const mg = parseAmountTo(value, 'mg');
          if (mg != null) out.sodiumMg = mg;
          continue;
        }

        if (key.includes('saturated')) {
          const g = parseAmountTo(value, 'g');
          if (g != null) out.saturatedFatG = g;
          continue;
        }

        if (key.includes('fat')) {
          const g = parseAmountTo(value, 'g');
          if (g != null) out.totalFatG = g;
          continue;
        }

        if (key.includes('fiber') || key.includes('fibre')) {
          const g = parseAmountTo(value, 'g');
          if (g != null) out.fiberG = g;
          continue;
        }

        if (key.includes('sugars') || key.includes('sugar')) {
          const g = parseAmountTo(value, 'g');
          if (g != null) out.totalSugarsG = g;
          continue;
        }

        if (key.includes('carb') || key.includes('carbohydrate')) {
          const g = parseAmountTo(value, 'g');
          if (g != null) out.totalCarbsG = g;
          continue;
        }
      }

      return out;
    } catch {
      return {};
    }
  }

  compareAgainstDailyValues(nutrition: NormalizedNutritionFacts): DailyValueComparison[] {
    // Standard FDA DVs for a 2,000 calorie diet.
    const dv = {
      caloriesKcal: { amount: 2000, unit: 'kcal' as const },
      totalFatG: { amount: 78, unit: 'g' as const },
      saturatedFatG: { amount: 20, unit: 'g' as const },
      sodiumMg: { amount: 2300, unit: 'mg' as const },
      totalCarbsG: { amount: 275, unit: 'g' as const },
      fiberG: { amount: 28, unit: 'g' as const },
      totalSugarsG: { amount: 50, unit: 'g' as const },
      proteinG: { amount: 50, unit: 'g' as const },
    };

    const add = (
      nutrient: string,
      amount: number | undefined,
      unit: 'g' | 'mg' | 'kcal',
      dvAmount: number,
      dvUnit: 'g' | 'mg' | 'kcal',
    ): DailyValueComparison | null => {
      if (typeof amount !== 'number' || !Number.isFinite(amount)) return null;
      const pct = dvAmount > 0 ? (amount / dvAmount) * 100 : 0;
      return {
        nutrient,
        amount,
        unit,
        dvAmount,
        dvUnit,
        percentDV: Math.max(0, Math.min(999, Math.round(pct))),
      };
    };

    const out: DailyValueComparison[] = [];

    const map: Array<[keyof NormalizedNutritionFacts, string, 'g' | 'mg' | 'kcal']> = [
      ['caloriesKcal', 'calories', 'kcal'],
      ['proteinG', 'protein', 'g'],
      ['totalCarbsG', 'carbohydrate', 'g'],
      ['totalSugarsG', 'sugars', 'g'],
      ['fiberG', 'fiber', 'g'],
      ['totalFatG', 'fat', 'g'],
      ['saturatedFatG', 'saturated_fat', 'g'],
      ['sodiumMg', 'sodium', 'mg'],
    ];

    for (const [key, label, unit] of map) {
      const dvKey = key as keyof typeof dv;
      const row = add(label, nutrition[key], unit, dv[dvKey].amount, dv[dvKey].unit);
      if (row) out.push(row);
    }

    return out;
  }

  flagThresholds(nutrition: NormalizedNutritionFacts, comparisons: DailyValueComparison[]): NutritionFlags {
    const by = (name: string) => comparisons.find((c) => c.nutrient === name);

    const sodium = by('sodium');
    const sugars = by('sugars');
    const satfat = by('saturated_fat');

    // Reasonable heuristics per serving when serving size is unknown.
    const highSodium = (sodium?.percentDV ?? 0) >= 20 || (nutrition.sodiumMg ?? 0) >= 600;
    const highSugar = (sugars?.percentDV ?? 0) >= 20 || (nutrition.totalSugarsG ?? 0) >= 15;
    const highSaturatedFat = (satfat?.percentDV ?? 0) >= 20 || (nutrition.saturatedFatG ?? 0) >= 5;

    return {
      ...(highSodium ? { highSodium: true } : null),
      ...(highSugar ? { highSugar: true } : null),
      ...(highSaturatedFat ? { highSaturatedFat: true } : null),
    };
  }

  computeDietaryScore(nutrition: NormalizedNutritionFacts, flags: NutritionFlags, healthGoalsText?: string | null): number {
    try {
      let score = 100;

      const goals = (healthGoalsText || '').toLowerCase();
      const wantsLowSodium = goals.includes('low sodium') || goals.includes('hypertension') || goals.includes('heart');
      const wantsLowSugar = goals.includes('low sugar') || goals.includes('diabetes') || goals.includes('weight');
      const wantsHighProtein = goals.includes('muscle') || goals.includes('high protein');
      const wantsHighFiber = goals.includes('fiber') || goals.includes('gut');

      const sodiumPenalty = flags.highSodium ? (wantsLowSodium ? 25 : 15) : 0;
      const sugarPenalty = flags.highSugar ? (wantsLowSugar ? 25 : 15) : 0;
      const satFatPenalty = flags.highSaturatedFat ? 20 : 10;

      score -= sodiumPenalty;
      score -= sugarPenalty;
      if (flags.highSaturatedFat) score -= satFatPenalty;

      const fiber = nutrition.fiberG ?? 0;
      const protein = nutrition.proteinG ?? 0;

      if (fiber >= 5) score += wantsHighFiber ? 10 : 5;
      if (protein >= 10) score += wantsHighProtein ? 10 : 5;

      // Mild penalty for very high calories per serving if available.
      const kcal = nutrition.caloriesKcal ?? 0;
      if (kcal >= 400) score -= goals.includes('weight') ? 10 : 5;

      score = Math.max(0, Math.min(100, Math.round(score)));
      return score;
    } catch {
      return 50;
    }
  }

  async lookupUsdaFoodByName(name: string): Promise<NutritionAgentResult['matchedUsdaFood']> {
    try {
      await ensureUsdaSeeded();
      const s = toSearchName(name);
      if (!s) return null;

      // Simple search: exact search_name match first, else contains.
      const exact = await usdaFoodsCollection.query(Q.where('search_name', s)).fetch();
      const row = exact?.[0];
      if (row) {
        return {
          fdcId: Number(row.fdcId),
          name: String(row.name),
          nutrients: JSON.parse(String(row.nutrientsJson || '{}')),
        };
      }

      // Contains match (fetch all small seeded list)
      const all = await usdaFoodsCollection.query().fetch();
      const contains = all.find((r: any) => String(r.searchName || '').includes(s) || s.includes(String(r.searchName || '')));
      if (!contains) return null;
      return {
        fdcId: Number((contains as any).fdcId),
        name: String((contains as any).name),
        nutrients: JSON.parse(String((contains as any).nutrientsJson || '{}')),
      };
    } catch {
      return null;
    }
  }

  async getUserHealthGoals(userId?: string | null): Promise<string | null> {
    try {
      if (!userId) return null;
      const profile = await healthProfiles.query(Q.where('user_id', userId)).fetch();
      const p = profile?.[0];
      const v = (p as any)?.healthGoals;
      return typeof v === 'string' ? v : null;
    } catch {
      return null;
    }
  }

  async analyze(opts: {
    ocrNutritionFacts: OCRNutritionFact[];
    userId?: string | null;
    healthGoalsOverride?: string | null;
    productNameForLookup?: string | null;
  }): Promise<NutritionAgentResult> {
    try {
      const nutrition = this.parseNutritionFacts(opts.ocrNutritionFacts);
      const comparisons = this.compareAgainstDailyValues(nutrition);
      const flags = this.flagThresholds(nutrition, comparisons);

      const goals =
        (typeof opts.healthGoalsOverride === 'string' ? opts.healthGoalsOverride : null) ??
        (await this.getUserHealthGoals(opts.userId ?? null));

      const dietaryScore = this.computeDietaryScore(nutrition, flags, goals);

      const matchedUsdaFood = opts.productNameForLookup
        ? await this.lookupUsdaFoodByName(opts.productNameForLookup)
        : null;

      return {
        nutrition,
        comparisons,
        flags,
        dietaryScore,
        matchedUsdaFood,
      };
    } catch {
      return {
        nutrition: {},
        comparisons: [],
        flags: {},
        dietaryScore: 0,
        matchedUsdaFood: null,
      };
    }
  }
}
