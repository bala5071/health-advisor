// NOTE: Agents are lazy-required inside processImage to reduce cold-start time.

export type PipelineStep =
  | 'starting'
  | 'detecting_product'
  | 'extracting_text'
  | 'barcode_lookup'
  | 'checking_nutrition'
  | 'checking_allergies'
  | 'generating_recommendation'
  | 'speaking'
  | 'saving'
  | 'complete';

type StepFn = (s: PipelineStep) => void;

const extractBarcodeFromText = (text: string): string | null => {
  const m = String(text || '').match(/\b(\d{8,14})\b/);
  return m?.[1] ?? null;
};

const lookupBarcode = async (_barcode: string | null): Promise<any | null> => {
  // Placeholder: you can wire this to OpenFoodFacts or your backend later.
  return null;
};

class AgentOrchestrator {
  async processImage(
    imageUri: string,
    opts?: {
      userId?: string | null;
      onStep?: StepFn;
    },
  ): Promise<any> {
    const t0 = Date.now();
    const step = (s: PipelineStep) => {
      try {
        opts?.onStep?.(s);
      } catch {
        // ignore
      }
    };

    const logStep = (name: string, startedAt: number) => {
      const ms = Date.now() - startedAt;
      console.log(`[pipeline] ${name} ${ms}ms`);
    };

    step('starting');

    // Lazy require agents/services
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { VisionAgent } = require('../VisionAgent') as typeof import('../VisionAgent');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { OCRAgent } = require('../OCRAgent') as typeof import('../OCRAgent');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { NutritionAgent } = require('../NutritionAgent') as typeof import('../NutritionAgent');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { AllergyAgent } = require('../AllergyAgent') as typeof import('../AllergyAgent');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { HealthAdvisorAgent } = require('../HealthAdvisorAgent') as typeof import('../HealthAdvisorAgent');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { VoiceAgent } = require('../VoiceAgent') as typeof import('../VoiceAgent');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { HealthTrackerAgent } = require('../HealthTrackerAgent') as typeof import('../HealthTrackerAgent');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { NotificationService } = require('../../services/NotificationService') as typeof import('../../services/NotificationService');

    const visionAgent = new VisionAgent();
    const ocrAgent = new OCRAgent();
    const nutritionAgent = new NutritionAgent();
    const allergyAgent = new AllergyAgent();
    const healthAdvisorAgent = new HealthAdvisorAgent();
    const voiceAgent = new VoiceAgent();

    // Parallelize Vision + OCR to reduce overall pipeline time
    const tv = Date.now();
    step('detecting_product');
    const visionPromise = visionAgent.process({
      id: 'vision',
      type: (undefined as any),
      payload: { imageUri },
      priority: 1,
    } as any);

    const tocr = Date.now();
    step('extracting_text');
    const ocrPromise = ocrAgent.process({
      id: 'ocr',
      type: (undefined as any),
      payload: { imageUri },
      priority: 1,
    } as any);

    step('barcode_lookup');
    const barcodePromise = ocrPromise
      .then((r) => extractBarcodeFromText(r?.result?.text ?? ''))
      .then((barcode) => lookupBarcode(barcode));

    const [visionRes, ocrRes, barcodeLookup] = await Promise.all([visionPromise, ocrPromise, barcodePromise]);
    logStep('vision', tv);
    logStep('ocr', tocr);

    const visionResult = visionRes?.result;
    if (!visionResult?.productDetected) {
      step('complete');
      console.log(`[pipeline] total ${Date.now() - t0}ms`);
      return { visionResult };
    }
    const ocrResult = ocrRes?.result;

    const ingredientsText = String(ocrResult?.ingredients || '');

    step('checking_nutrition');
    const tnut = Date.now();
    const nutritionPromise = nutritionAgent.analyze({
      ocrNutritionFacts: ocrResult?.nutritionFacts ?? [],
      userId: opts?.userId ?? null,
      productNameForLookup: visionResult?.productName ?? null,
    });

    step('checking_allergies');
    const tall = Date.now();
    const allergyPromise = allergyAgent.process({
      id: 'allergy',
      type: (undefined as any),
      payload: {
        ingredientsText,
        userId: opts?.userId ?? null,
      },
      priority: 1,
    } as any);

    const [nutritionResult, allergyRes] = await Promise.all([nutritionPromise, allergyPromise]);
    logStep('nutrition', tnut);
    logStep('allergy', tall);
    const allergyResult = allergyRes?.result;

    try {
      const matches = Array.isArray(allergyResult?.matchedAllergens) ? allergyResult.matchedAllergens : [];
      const severe = matches.filter((m: any) => String(m?.severity || '').toLowerCase() === 'severe');
      if (severe.length > 0 && opts?.userId) {
        NotificationService.triggerSevereAllergenAlert({
          userId: opts.userId,
          allergenNames: severe.map((s: any) => String(s?.allergen || '')).filter(Boolean),
        }).catch(() => undefined);
      }
    } catch {
      // ignore
    }

    step('generating_recommendation');
    const tadvice = Date.now();
    const recommendationRes = await healthAdvisorAgent.process({
      id: 'advisor',
      type: (undefined as any),
      payload: {
        userId: opts?.userId ?? null,
        analysis: {
          visionResult,
          ocrResult,
          barcodeLookup,
          nutritionResult,
          allergyResult,
        },
      },
      priority: 1,
    } as any);

    const recommendation = recommendationRes?.result;
    logStep('health_advisor', tadvice);

    const fullResult = {
      userId: opts?.userId ?? null,
      visionResult,
      ocrResult,
      barcodeLookup,
      nutritionResult,
      allergyResult,
      recommendation,
    };

    // Fire-and-forget: voice
    step('speaking');
    const tvoice = Date.now();
    voiceAgent
      .process({
        id: 'voice',
        type: (undefined as any),
        payload: { recommendation },
        priority: 1,
      } as any)
      .catch(() => undefined);
    logStep('voice_start', tvoice);

    // Fire-and-forget: save (tracker)
    if (opts?.userId) {
      step('saving');
      HealthTrackerAgent.logScan({
        userId: opts.userId,
        type: 'product_scan',
        scanPayload: fullResult,
        verdict: recommendation?.verdict,
        userAction: 'unknown',
      }).catch(() => undefined);
    }

    step('complete');
    console.log(`[pipeline] total ${Date.now() - t0}ms`);
    return fullResult;
  }
}

export const agentOrchestrator = new AgentOrchestrator();
