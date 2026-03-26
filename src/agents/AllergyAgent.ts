import { Q } from '@nozbe/watermelondb';
import { Agent, AgentResult, AgentType, Task } from './core/types';
import database from '../database/DatabaseManager';
import Allergy from '../database/models/Allergy';
import HealthProfile from '../database/models/HealthProfile';
import { TextProcessor } from '../ai/preprocessing/TextProcessor';
import { EncryptionService } from '../services/EncryptionService';

export type AllergenSeverity = 'mild' | 'moderate' | 'severe' | 'unknown';

export type AllergenMatch = {
  allergen: string;
  ingredient: string;
  severity: AllergenSeverity;
  matchType: 'exact' | 'alias' | 'fuzzy';
  confidence: number;
};

export type CrossReactivityWarning = {
  userAllergy: string;
  ingredientAllergen: string;
  reason: string;
  severity: AllergenSeverity;
};

export type AllergyAgentResult = {
  matchedAllergens: AllergenMatch[];
  crossReactivityWarnings: CrossReactivityWarning[];
  userAllergies: Array<{ allergen: string; severity: AllergenSeverity }>;
};

type AllergenNode = {
  canonical: string;
  aliases: string[];
  cross: string[];
};

const healthProfiles = database.collections.get<HealthProfile>('health_profiles');
const allergiesCollection = database.collections.get<Allergy>('allergies');

const normalize = (s: string) =>
  (s || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/[ ]{2,}/g, ' ')
    .trim();

const splitIngredients = (ingredients: string): string[] => {
  const cleaned = ingredients
    .replace(/[\(\)\[\]{}]/g, ' ')
    .replace(/[\r\n]+/g, ' ');
  const parts = cleaned.split(/[,;:.\u2022\u00b7]/g).map((p) => p.trim());
  const out: string[] = [];
  for (const p of parts) {
    if (!p) continue;
    if (p.length > 180) {
      out.push(...p.split(/\s{2,}|\s-\s/g).map((x) => x.trim()).filter(Boolean));
    } else {
      out.push(p);
    }
  }
  return out;
};

const levenshtein = (a: string, b: string): number => {
  const s = a || '';
  const t = b || '';
  if (s === t) return 0;
  if (!s.length) return t.length;
  if (!t.length) return s.length;

  const v0 = new Array(t.length + 1);
  const v1 = new Array(t.length + 1);
  for (let i = 0; i < v0.length; i++) v0[i] = i;

  for (let i = 0; i < s.length; i++) {
    v1[0] = i + 1;
    for (let j = 0; j < t.length; j++) {
      const cost = s[i] === t[j] ? 0 : 1;
      v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost);
    }
    for (let j = 0; j < v0.length; j++) v0[j] = v1[j];
  }
  return v1[t.length];
};

const toSeverity = (raw: any): AllergenSeverity => {
  const s = String(raw || '').toLowerCase().trim();
  if (s === 'severe' || s === 'high') return 'severe';
  if (s === 'moderate' || s === 'medium') return 'moderate';
  if (s === 'mild' || s === 'low') return 'mild';
  return 'unknown';
};

const severityRank: Record<AllergenSeverity, number> = {
  unknown: 0,
  mild: 1,
  moderate: 2,
  severe: 3,
};

const GRAPH: AllergenNode[] = [
  {
    canonical: 'peanut',
    aliases: ['peanut', 'peanuts', 'groundnut', 'arachis', 'peanut flour', 'peanut oil'],
    cross: ['tree_nut', 'soy', 'lupin'],
  },
  {
    canonical: 'tree_nut',
    aliases: [
      'tree nut',
      'tree nuts',
      'almond',
      'almonds',
      'hazelnut',
      'hazelnuts',
      'walnut',
      'walnuts',
      'cashew',
      'cashews',
      'pistachio',
      'pistachios',
      'pecan',
      'pecans',
      'brazil nut',
      'macadamia',
      'pine nut',
    ],
    cross: ['peanut'],
  },
  {
    canonical: 'wheat',
    aliases: ['wheat', 'wheat flour', 'semolina', 'durum', 'spelt', 'kamut', 'farina'],
    cross: ['barley', 'rye', 'oats', 'gluten'],
  },
  {
    canonical: 'barley',
    aliases: ['barley', 'malt', 'malt extract', 'malt syrup', 'barley flour'],
    cross: ['wheat', 'rye', 'gluten'],
  },
  {
    canonical: 'rye',
    aliases: ['rye', 'rye flour'],
    cross: ['wheat', 'barley', 'gluten'],
  },
  {
    canonical: 'oats',
    aliases: ['oat', 'oats', 'oat flour'],
    cross: ['wheat', 'barley', 'gluten'],
  },
  {
    canonical: 'gluten',
    aliases: ['gluten', 'gluten free'],
    cross: ['wheat', 'barley', 'rye', 'oats'],
  },
  {
    canonical: 'milk',
    aliases: ['milk', 'dairy', 'lactose', 'whey', 'casein', 'butter', 'ghee', 'cream', 'cheese', 'yogurt'],
    cross: ['goat_milk', 'sheep_milk'],
  },
  {
    canonical: 'egg',
    aliases: ['egg', 'eggs', 'albumen', 'ovalbumin', 'egg white', 'egg yolk'],
    cross: [],
  },
  {
    canonical: 'soy',
    aliases: ['soy', 'soya', 'soybean', 'edamame', 'tofu', 'tempeh', 'soy lecithin', 'miso'],
    cross: ['peanut'],
  },
  {
    canonical: 'sesame',
    aliases: ['sesame', 'sesame seed', 'tahini'],
    cross: ['peanut', 'tree_nut'],
  },
  {
    canonical: 'fish',
    aliases: ['fish', 'salmon', 'tuna', 'cod', 'anchovy', 'sardine', 'tilapia'],
    cross: ['shellfish'],
  },
  {
    canonical: 'shellfish',
    aliases: ['shellfish', 'shrimp', 'prawn', 'crab', 'lobster', 'clam', 'mussel', 'oyster', 'scallop'],
    cross: ['fish'],
  },
  {
    canonical: 'mustard',
    aliases: ['mustard', 'mustard seed'],
    cross: [],
  },
  {
    canonical: 'celery',
    aliases: ['celery', 'celeriac'],
    cross: [],
  },
];

const canonicalByAlias = (() => {
  const map = new Map<string, string>();
  for (const node of GRAPH) {
    map.set(normalize(node.canonical), node.canonical);
    for (const a of node.aliases) map.set(normalize(a), node.canonical);
  }
  return map;
})();

const nodesByCanonical = (() => {
  const map = new Map<string, AllergenNode>();
  for (const node of GRAPH) map.set(node.canonical, node);
  return map;
})();

const resolveCanonical = (s: string): string => {
  const n = normalize(s);
  return canonicalByAlias.get(n) ?? n;
};

const fuzzyMatch = (ingredientNorm: string, aliasNorm: string): { ok: boolean; confidence: number } => {
  if (!ingredientNorm || !aliasNorm) return { ok: false, confidence: 0 };

  if (ingredientNorm === aliasNorm) return { ok: true, confidence: 1 };
  if (ingredientNorm.includes(aliasNorm)) return { ok: true, confidence: 0.95 };

  const ingTokens = ingredientNorm.split(' ').filter(Boolean);
  const aliasTokens = aliasNorm.split(' ').filter(Boolean);

  for (const t of ingTokens) {
    for (const a of aliasTokens) {
      if (t === a) return { ok: true, confidence: 0.9 };
      if (t.length >= 4 && a.length >= 4) {
        const d = levenshtein(t, a);
        const maxLen = Math.max(t.length, a.length);
        const ratio = maxLen > 0 ? d / maxLen : 1;
        if (d <= 1 && ratio <= 0.2) return { ok: true, confidence: 0.75 };
        if (d <= 2 && ratio <= 0.25) return { ok: true, confidence: 0.6 };
      }
    }
  }

  return { ok: false, confidence: 0 };
};

export class AllergyAgent implements Agent {
  private async getHealthProfileIdForUser(userId: string): Promise<string | null> {
    const profiles = await healthProfiles.query(Q.where('user_id', userId)).fetch();
    return profiles?.[0]?.id ?? null;
  }

  private async getUserAllergies(opts: { userId?: string | null; healthProfileId?: string | null }) {
    const hpId =
      (opts.healthProfileId && String(opts.healthProfileId)) ||
      (opts.userId ? await this.getHealthProfileIdForUser(String(opts.userId)) : null);

    if (!hpId) return [] as Array<{ allergen: string; severity: AllergenSeverity }>;

    const rows = await allergiesCollection.query(Q.where('health_profile_id', hpId)).fetch();

    const out: Array<{ allergen: string; severity: AllergenSeverity }> = [];
    for (const r of rows as any[]) {
      const name = await EncryptionService.maybeDecrypt(r.name);
      out.push({ allergen: resolveCanonical(String(name || '')), severity: toSeverity(r.severity) });
    }
    return out;
  }

  analyzeIngredients(params: {
    ingredientsText: string;
    userAllergies: Array<{ allergen: string; severity: AllergenSeverity }>;
  }): AllergyAgentResult {
    const ingredientsText = params.ingredientsText || '';
    const userAllergies = params.userAllergies || [];

    const normalized = TextProcessor.normalizeText(ingredientsText);
    const items = splitIngredients(normalized.normalized);

    const userSeverityByAllergen = new Map<string, AllergenSeverity>();
    for (const a of userAllergies) {
      const key = resolveCanonical(a.allergen);
      const prev = userSeverityByAllergen.get(key) ?? 'unknown';
      userSeverityByAllergen.set(key, severityRank[a.severity] > severityRank[prev] ? a.severity : prev);
    }

    const matches: AllergenMatch[] = [];
    const matchedCanonicals = new Set<string>();

    for (const ingredient of items) {
      const ingNorm = normalize(ingredient);
      if (!ingNorm) continue;

      for (const node of GRAPH) {
        const canonical = node.canonical;
        const aliases = [node.canonical, ...node.aliases];

        for (const alias of aliases) {
          const aliasNorm = normalize(alias);
          const { ok, confidence } = fuzzyMatch(ingNorm, aliasNorm);
          if (!ok) continue;

          const matchType: AllergenMatch['matchType'] =
            ingNorm === aliasNorm
              ? 'exact'
              : ingNorm.includes(aliasNorm)
                ? aliasNorm === normalize(canonical)
                  ? 'exact'
                  : 'alias'
                : 'fuzzy';

          const severity = userSeverityByAllergen.get(canonical) ?? 'unknown';

          matches.push({
            allergen: canonical,
            ingredient,
            severity,
            matchType,
            confidence,
          });
          matchedCanonicals.add(canonical);
          break;
        }
      }
    }

    const bestByAllergen = new Map<string, AllergenMatch>();
    for (const m of matches) {
      const prev = bestByAllergen.get(m.allergen);
      if (!prev) {
        bestByAllergen.set(m.allergen, m);
        continue;
      }
      const prevScore = prev.confidence * 10 + severityRank[prev.severity];
      const score = m.confidence * 10 + severityRank[m.severity];
      if (score > prevScore) bestByAllergen.set(m.allergen, m);
    }

    const dedupedMatches = Array.from(bestByAllergen.values()).sort((a, b) => {
      const sa = severityRank[a.severity];
      const sb = severityRank[b.severity];
      if (sb !== sa) return sb - sa;
      return b.confidence - a.confidence;
    });

    const warnings: CrossReactivityWarning[] = [];

    const userAllergens = Array.from(userSeverityByAllergen.keys());
    const ingredientAllergens = Array.from(matchedCanonicals);

    for (const ua of userAllergens) {
      const node = nodesByCanonical.get(ua);
      if (!node) continue;
      for (const ia of ingredientAllergens) {
        if (ia === ua) continue;
        if (node.cross.includes(ia)) {
          warnings.push({
            userAllergy: ua,
            ingredientAllergen: ia,
            reason: `${ia} is commonly cross-reactive with ${ua}`,
            severity: userSeverityByAllergen.get(ua) ?? 'unknown',
          });
        }
      }
    }

    const dedupWarnings = new Map<string, CrossReactivityWarning>();
    for (const w of warnings) {
      const key = `${w.userAllergy}::${w.ingredientAllergen}`;
      const prev = dedupWarnings.get(key);
      if (!prev) {
        dedupWarnings.set(key, w);
        continue;
      }
      if (severityRank[w.severity] > severityRank[prev.severity]) dedupWarnings.set(key, w);
    }

    return {
      matchedAllergens: dedupedMatches,
      crossReactivityWarnings: Array.from(dedupWarnings.values()).sort(
        (a, b) => severityRank[b.severity] - severityRank[a.severity],
      ),
      userAllergies,
    };
  }

  async process(task: Task): Promise<AgentResult> {
    try {
      const ingredientsText = task?.payload?.ingredientsText as string | undefined;
      const userId = task?.payload?.userId as string | undefined;
      const healthProfileId = task?.payload?.healthProfileId as string | undefined;

      if (!ingredientsText) {
        return {
          agent: AgentType.ANALYSIS,
          result: null,
          error: new Error('AllergyAgent requires payload.ingredientsText'),
        };
      }

      const userAllergies = await this.getUserAllergies({ userId: userId ?? null, healthProfileId: healthProfileId ?? null });
      const result = this.analyzeIngredients({ ingredientsText, userAllergies });

      return {
        agent: AgentType.ANALYSIS,
        result,
      };
    } catch (error) {
      return {
        agent: AgentType.ANALYSIS,
        result: null,
        error,
      };
    }
  }
}
