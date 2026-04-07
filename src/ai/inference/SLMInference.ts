import { checkSLMExists, LOCAL_SLM_PATH } from '../models/SLMModelManager';

type LlamaContext = any;

type CompletionResult = {
  text?: string;
};

export type HealthAdvisorVerdict = 'APPROVED' | 'CAUTION' | 'AVOID';

export type HealthAdvisorOutput = {
  verdict: HealthAdvisorVerdict;
  explanation: string;
  alternatives: string[];
};

export type SLMRunOptions = {
  maxTokens?: number;
  temperature?: number;
  onToken?: (token: string) => void;
};

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

const extractJsonObject = (raw: string): any | null => {
  if (!raw) return null;
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  const candidate = raw.slice(start, end + 1);
  try {
    return JSON.parse(candidate);
  } catch {
    // Try to recover from trailing commas / code fences
    const cleaned = candidate
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .replace(/,\s*}/g, '}')
      .replace(/,\s*]/g, ']');
    try {
      return JSON.parse(cleaned);
    } catch {
      return null;
    }
  }
};

export const parseHealthAdvisorOutput = (rawText: string): { output: HealthAdvisorOutput | null; confidence: number } => {
  const json = extractJsonObject(rawText);
  if (!json || typeof json !== 'object') {
    return { output: null, confidence: 0.2 };
  }

  const verdict = String((json as any).verdict || '').toUpperCase();
  const explanation = (json as any).explanation;
  const alternatives = (json as any).alternatives;

  const verdictOk = verdict === 'APPROVED' || verdict === 'CAUTION' || verdict === 'AVOID';
  const explanationOk = typeof explanation === 'string' && explanation.trim().length >= 10;
  const alternativesOk = Array.isArray(alternatives) && alternatives.every((a) => typeof a === 'string');

  const base = 0.35 + (verdictOk ? 0.25 : 0) + (explanationOk ? 0.25 : 0) + (alternativesOk ? 0.15 : 0);

  if (!verdictOk || !explanationOk) {
    return { output: null, confidence: clamp01(base) };
  }

  return {
    output: {
      verdict: verdict as HealthAdvisorVerdict,
      explanation: String(explanation).trim(),
      alternatives: alternativesOk ? alternatives.map((a: any) => String(a)) : [],
    },
    confidence: clamp01(base),
  };
};

export const buildHealthAdvisorPrompt = (opts: {
  userProfile?: any;
  analysisResults: any;
  retrievedContext?: string | null;
}): string => {
  const profile = opts.userProfile ?? null;
  const analysis = opts.analysisResults ?? null;
  const retrievedContext = typeof opts.retrievedContext === 'string' ? opts.retrievedContext : '';

  const system =
    'You are a careful health advisor. You must be conservative and avoid giving medical diagnosis. ' +
    'You provide product health guidance based on the user profile and analysis inputs.';

  // Build explicit nutrition flag summary so model cannot hallucinate concerns
  const flags = analysis?.nutritionResult?.flags ?? {};
  const nutrition = analysis?.nutritionResult?.nutrition ?? {};

  const sodiumMg = nutrition.sodiumMg ?? null;
  const sugarG = nutrition.totalSugarsG ?? null;
  const satFatG = nutrition.saturatedFatG ?? null;

  const flagSummary = [
    `- Sodium: ${sodiumMg !== null ? `${sodiumMg}mg` : 'unknown'} — ${flags.highSodium ? '⚠ HIGH (mention this concern)' : '✓ NOT high (do NOT mention sodium as a concern)'}`,
    `- Sugar: ${sugarG !== null ? `${sugarG}g` : 'unknown'} — ${flags.highSugar ? '⚠ HIGH (mention this concern)' : '✓ NOT high (do NOT mention sugar as a concern)'}`,
    `- Saturated fat: ${satFatG !== null ? `${satFatG}g` : 'unknown'} — ${flags.highSaturatedFat ? '⚠ HIGH (mention this concern)' : '✓ NOT high (do NOT mention saturated fat as a concern)'}`,
  ].join('\n');

  const instructions =
    `Return ONLY valid JSON with the following schema:\n` +
    `{\n  "verdict": "APPROVED" | "CAUTION" | "AVOID",\n  "explanation": string,\n  "alternatives": string[]\n}\n\n` +
    `STRICT RULES — follow exactly:\n` +
    `1. If any severe allergen match is present, verdict MUST be "AVOID".\n` +
    `2. ONLY mention a nutrient as a concern if it is marked ⚠ HIGH in NUTRITION_FLAGS below.\n` +
    `3. If a nutrient is marked ✓ NOT high, you MUST NOT mention it as a concern, even if the user has a related condition.\n` +
    `4. Base verdict on allergen severity first, then flagged nutrients, then overall profile.\n` +
    `5. Explanation must be 2-6 sentences, plain language, actionable.\n` +
    `6. Alternatives: 1-3 short suggestions.\n\n` +
    `NUTRITION_FLAGS (ground truth — do not override):\n${flagSummary}`;

  const payload = {
    user_profile: profile,
    analysis,
  };

  return `${system}\n\n${instructions}\n\nRETRIEVED_CONTEXT:\n${retrievedContext || 'none'}\n\nINPUT_JSON:\n${JSON.stringify(payload)}`;
};

export const buildHealthAdvisorQAPrompt = (opts: {
  userProfile?: any;
  scanContext: any;
  question: string;
  retrievedContext?: string | null;
}): string => {
  const retrievedContext = typeof opts.retrievedContext === 'string' ? opts.retrievedContext : '';
  const system =
    'You are a careful health advisor. You must be conservative and avoid giving medical diagnosis. ' +
    'Answer the user\'s follow-up question using the scan context and retrieved rules.';

  const instructions =
    'Answer in 2-4 sentences. Be specific and reference available nutrition/allergen info when relevant. ' +
    'If information is missing, say what is missing and give a safe suggestion.';

  const payload = {
    user_profile: opts.userProfile ?? null,
    scan_context: opts.scanContext ?? null,
    question: String(opts.question || '').trim(),
  };

  return `${system}\n\n${instructions}\n\nRETRIEVED_CONTEXT:\n${retrievedContext || 'none'}\n\nINPUT_JSON:\n${JSON.stringify(payload)}`;
};

class SLMInferenceSingleton {
  context: LlamaContext | null = null;
  isLoaded = false;

  private getInitLlama() {
    try {
      // Lazy require so route modules don't crash at import time in runtimes without native llama.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require('llama.rn');
      return mod?.initLlama ?? mod?.default ?? mod;
    } catch {
      throw new Error(
        'llama.rn native module is unavailable in this runtime (e.g., Expo Go). Use a development build with llama.rn installed.',
      );
    }
  }

  async loadModel(): Promise<void> {
    if (this.isLoaded && this.context) return;

    const exists = await checkSLMExists();
    if (!exists) {
      throw new Error('SLM model is not downloaded');
    }

    const start = Date.now();
    const initLlama = this.getInitLlama();
    const ctx = await (initLlama as any)({
      model: LOCAL_SLM_PATH,
      n_ctx: 4096,
      n_gpu_layers: 99,
    });

    console.log(`SLMInference model loaded in ${Date.now() - start}ms`);
    this.context = ctx;
    this.isLoaded = true;
  }

  async unloadModel(): Promise<void> {
    try {
      await (this.context as any)?.release?.();
    } catch {
      // ignore
    }
    this.context = null;
    this.isLoaded = false;
  }

  async run(prompt: string, opts?: SLMRunOptions): Promise<{ text: string; parsed: HealthAdvisorOutput | null; confidence: number }> {
    if (!this.isLoaded || !this.context) throw new Error('SLM model not loaded');

    const maxTokens = opts?.maxTokens ?? 350;
    const temperature = opts?.temperature ?? 0.2;

    // Try streaming if supported by llama.rn build.
    if (opts?.onToken) {
      try {
        const result = await (this.context as any).completion({
          prompt,
          max_tokens: maxTokens,
          temperature,
          stream: true,
          onToken: (t: any) => {
            try {
              const token = typeof t === 'string' ? t : String(t?.token ?? t?.text ?? '');
              if (token) opts.onToken?.(token);
            } catch {
              // ignore
            }
          },
        });

        const text = typeof result?.text === 'string' ? result.text : '';
        const parsed = parseHealthAdvisorOutput(text);
        return { text, parsed: parsed.output, confidence: parsed.confidence };
      } catch {
        // fallback below
      }
    }

    const result: CompletionResult = await (this.context as any).completion({
      prompt,
      max_tokens: maxTokens,
      temperature,
    });

    const text = typeof result?.text === 'string' ? result.text : '';

    // If caller requested streaming but runtime doesn't support it, simulate by chunking.
    if (opts?.onToken && text) {
      for (let i = 0; i < text.length; i += 12) {
        opts.onToken(text.slice(i, i + 12));
      }
    }

    const parsed = parseHealthAdvisorOutput(text);
    return { text, parsed: parsed.output, confidence: parsed.confidence };
  }
}

export class SLMInference {
  private static instance: SLMInferenceSingleton | null = null;

  static getInstance(): SLMInferenceSingleton {
    if (!SLMInference.instance) SLMInference.instance = new SLMInferenceSingleton();
    return SLMInference.instance;
  }
}

export const slmInference = SLMInference.getInstance();
