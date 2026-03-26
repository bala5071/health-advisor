import { Agent, AgentResult, AgentType, Task } from './core/types';
import { TextProcessor } from '../ai/preprocessing/TextProcessor';

export type NutritionFact = {
  name: string;
  value: string;
};

export type OCRParsedResult = {
  text: string;
  ingredients: string | null;
  nutritionFacts: NutritionFact[];
  expiryDates: string[];
  allergens: string[];
};

const STOP_HEADERS = [
  'nutrition facts',
  'nutrition information',
  'supplement facts',
  'ingredients',
  'contains',
  'allergen',
  'warning',
  'storage',
  'directions',
  'serving size',
  'servings per',
  'best before',
  'expiry',
  'exp',
];

const nutrientPatterns: Array<{ name: string; re: RegExp }> = [
  { name: 'calories', re: /\bcalories\b\s*[:\-]?\s*(\d{1,4})\b/i },
  { name: 'energy', re: /\benergy\b\s*[:\-]?\s*(\d{1,5}(?:\.\d+)?)\s*(kcal|kj)\b/i },
  { name: 'fat', re: /\btotal\s+fat\b\s*[:\-]?\s*(\d{1,4}(?:\.\d+)?)\s*g\b/i },
  { name: 'saturated_fat', re: /\bsat(?:urated)?\s+fat\b\s*[:\-]?\s*(\d{1,4}(?:\.\d+)?)\s*g\b/i },
  { name: 'trans_fat', re: /\btrans\s+fat\b\s*[:\-]?\s*(\d{1,4}(?:\.\d+)?)\s*g\b/i },
  { name: 'cholesterol', re: /\bcholesterol\b\s*[:\-]?\s*(\d{1,5}(?:\.\d+)?)\s*mg\b/i },
  { name: 'sodium', re: /\bsodium\b\s*[:\-]?\s*(\d{1,5}(?:\.\d+)?)\s*mg\b/i },
  { name: 'carbohydrate', re: /\btotal\s+carb(?:ohydrate)?s?\b\s*[:\-]?\s*(\d{1,4}(?:\.\d+)?)\s*g\b/i },
  { name: 'fiber', re: /\b(?:dietary\s+)?fiber\b\s*[:\-]?\s*(\d{1,4}(?:\.\d+)?)\s*g\b/i },
  { name: 'sugars', re: /\b(?:total\s+)?sugars\b\s*[:\-]?\s*(\d{1,4}(?:\.\d+)?)\s*g\b/i },
  { name: 'protein', re: /\bprotein\b\s*[:\-]?\s*(\d{1,4}(?:\.\d+)?)\s*g\b/i },
];

const expiryRegexes = [
  /\b\d{2}\/\d{4}\b/g, // MM/YYYY
  /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g, // DD/MM/YYYY or MM/DD/YYYY
];

const containsLineRegex = /\bcontains\b\s*[:\-]?\s*(.+)$/i;

function parseIngredients(lines: string[]): string | null {
  const idx = TextProcessor.findLineIndex(lines, (l) => /^ingredients\b/i.test(l));
  if (idx < 0) return null;

  const first = lines[idx];
  const afterColon = first.split(/ingredients\s*[:\-]?/i)[1];
  const collected: string[] = [];
  if (afterColon && afterColon.trim()) collected.push(afterColon.trim());

  for (let i = idx + 1; i < lines.length; i++) {
    const lower = lines[i].toLowerCase();
    if (STOP_HEADERS.some((h) => lower.startsWith(h) || lower === h)) break;
    if (/^\w+\s*:?$/.test(lines[i]) && STOP_HEADERS.includes(lower.replace(/:$/, ''))) break;
    collected.push(lines[i]);
    if (collected.join(' ').length > 1200) break;
  }

  const flat = TextProcessor.toFlatText(collected);
  return flat || null;
}

function parseNutritionFacts(lines: string[]): NutritionFact[] {
  const facts: NutritionFact[] = [];
  const seen = new Set<string>();

  const add = (name: string, value: string) => {
    if (seen.has(name)) return;
    seen.add(name);
    facts.push({ name, value });
  };

  for (const line of lines) {
    for (const p of nutrientPatterns) {
      const m = line.match(p.re);
      if (m) {
        const value = (m[1] ? String(m[1]) : '').trim();
        const unit = m[2] ? String(m[2]).trim() : '';
        add(p.name, unit ? `${value} ${unit}` : value);
      }
    }

    // Generic nutrient fallback: "Vitamin C 60 mg"
    const generic = line.match(/\b([A-Za-z][A-Za-z\s]{2,25})\b\s*(\d{1,5}(?:\.\d+)?)\s*(mg|g|mcg|µg|kcal|kj)\b/i);
    if (generic) {
      const name = generic[1].trim().toLowerCase().replace(/\s+/g, '_');
      const value = `${generic[2]} ${generic[3]}`;
      add(name, value);
    }
  }

  return facts;
}

function parseExpiryDates(text: string): string[] {
  const found = new Set<string>();
  for (const re of expiryRegexes) {
    const matches = text.match(re);
    if (matches) {
      for (const m of matches) {
        found.add(m);
      }
    }
  }

  // Also capture lines like "EXP 06/2026"
  const expTagged = text.match(/\b(?:exp|expiry|best\s+before|use\s+by)\b[^\n\r\d]*(\d{2}\/\d{4}|\d{1,2}\/\d{1,2}\/\d{2,4})/gi);
  if (expTagged) {
    for (const entry of expTagged) {
      const m = entry.match(/(\d{2}\/\d{4}|\d{1,2}\/\d{1,2}\/\d{2,4})/);
      if (m?.[1]) found.add(m[1]);
    }
  }

  return Array.from(found);
}

function parseAllergens(lines: string[]): string[] {
  const allergens: string[] = [];

  for (const line of lines) {
    const m = line.match(containsLineRegex);
    if (m?.[1]) {
      allergens.push(m[1].trim());
    }
  }

  // Heuristic keyword scan
  const allergenKeywords = ['milk', 'soy', 'wheat', 'gluten', 'egg', 'peanut', 'tree nut', 'nuts', 'fish', 'shellfish', 'sesame'];
  const flat = lines.join(' ').toLowerCase();
  const hits: string[] = [];
  for (const k of allergenKeywords) {
    if (flat.includes(k)) hits.push(k);
  }

  if (hits.length > 0) {
    allergens.push(`keywords:${hits.join(',')}`);
  }

  return Array.from(new Set(allergens.filter(Boolean)));
}

async function recognizeText(imageUri: string): Promise<string> {
  // Use dynamic import so the app can still run without this native module.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('@react-native-ml-kit/text-recognition');
  const TextRecognition = mod?.default ?? mod?.TextRecognition ?? mod;
  if (!TextRecognition?.recognize) {
    throw new Error('TextRecognition module is not available');
  }

  const result = await TextRecognition.recognize(imageUri);
  if (typeof result === 'string') return result;
  if (typeof result?.text === 'string') return result.text;

  // Some versions return blocks/lines
  if (Array.isArray(result?.blocks)) {
    const parts: string[] = [];
    for (const b of result.blocks) {
      if (typeof b?.text === 'string') parts.push(b.text);
    }
    return parts.join('\n');
  }

  return '';
}

export class OCRAgent implements Agent {
  async process(task: Task): Promise<AgentResult> {
    try {
      const imageUri = task?.payload?.imageUri as string | undefined;
      if (!imageUri) {
        return {
          agent: AgentType.OCR,
          result: null,
          error: new Error('OCRAgent requires payload.imageUri'),
        };
      }

      const text = await recognizeText(imageUri);
      const normalized = TextProcessor.normalizeText(text);

      const ingredients = parseIngredients(normalized.lines);
      const nutritionFacts = parseNutritionFacts(normalized.lines);
      const expiryDates = parseExpiryDates(normalized.normalized);
      const allergens = parseAllergens(normalized.lines);

      const parsed: OCRParsedResult = {
        text: normalized.normalized,
        ingredients,
        nutritionFacts,
        expiryDates,
        allergens,
      };

      return {
        agent: AgentType.OCR,
        result: parsed,
      };
    } catch (error) {
      return {
        agent: AgentType.OCR,
        result: null,
        error,
      };
    }
  }
}
