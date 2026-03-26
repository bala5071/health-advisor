import { imageProcessor } from '../ai/preprocessing/ImageProcessor';
import { qwenVLMRunner } from '../ai/inference/QwenVLMRunner';
import { Agent, AgentResult, AgentType, Task } from './core/types';

export type VisionResult = {
  productDetected: boolean;
  productName?: string;
  productType?: 'food' | 'medicine' | 'supplement' | 'cosmetic' | 'other';
  confidence?: number;
  rawAnswers?: string[];
  reason?: 'too_dark' | 'too_blurry' | 'too_small';
};

type VisionTraceEvent = {
  step: string;
  atMs: number;
  data?: any;
};

const normalizeYesNo = (value: string): 'YES' | 'NO' | 'UNKNOWN' => {
  const v = (value || '').trim().toUpperCase();
  if (v === 'YES') return 'YES';
  if (v === 'NO') return 'NO';
  if (v.includes('YES')) return 'YES';
  if (v.includes('NO')) return 'NO';
  return 'UNKNOWN';
};

const normalizeProductType = (
  value: string,
): VisionResult['productType'] | null => {
  const v = (value || '').trim().toLowerCase();
  const one = v.split(/\s|\n|\r|\t|\.|,|;/).filter(Boolean)[0] || '';
  if (one === 'food') return 'food';
  if (one === 'medicine') return 'medicine';
  if (one === 'supplement') return 'supplement';
  if (one === 'cosmetic') return 'cosmetic';
  if (one === 'other') return 'other';
  return null;
};

const isClearShortAnswer = (value: string): boolean => {
  const v = (value || '').trim();
  if (!v) return false;
  if (v.length > 120) return false;
  if (/^(unknown|n\/?a|none|null)$/i.test(v)) return false;
  return true;
};

export class VisionAgent implements Agent {
  static onTrace: ((e: VisionTraceEvent) => void) | null = null;

  async process(task: Task): Promise<AgentResult> {
    try {
      const imageUri = task?.payload?.imageUri as string | undefined;
      if (!imageUri) {
        return {
          agent: AgentType.VISION,
          result: null,
          error: new Error('VisionAgent requires payload.imageUri'),
        };
      }

      const result = await this.analyze(imageUri);
      return {
        agent: AgentType.VISION,
        result,
      };
    } catch (error) {
      return {
        agent: AgentType.VISION,
        result: null,
        error,
      };
    }
  }

  async analyze(imageUri: string): Promise<VisionResult> {
    let unloadRequested = false;
    const rawAnswers: string[] = [];
    const startedAt = Date.now();

    const trace = (step: string, data?: any) => {
      try {
        VisionAgent.onTrace?.({ step, atMs: Date.now() - startedAt, data });
      } catch {
        // ignore
      }
    };

    try {
      console.log('VisionAgent.analyze: start', { imageUri });
      trace('start', { imageUri });
      // STEP 1 — Quality check
      console.log('VisionAgent.analyze: STEP1 quality check');
      trace('checking_quality');
      const quality = await imageProcessor.assessQuality(imageUri);
      console.log('VisionAgent.analyze: quality result', quality);
      trace('quality_result', quality);
      if (!quality?.isUsable) {
        return {
          productDetected: false,
          reason: quality?.reason,
        };
      }

      // STEP 2 — Preprocess
      console.log('VisionAgent.analyze: STEP2 resize');
      trace('resize');
      const resizedUri = await imageProcessor.resizeForQwen(imageUri);
      console.log('VisionAgent.analyze: resizedUri', { resizedUri });
      trace('resized', { resizedUri });
      console.log('VisionAgent.analyze: STEP2 base64');
      trace('base64');
      const base64 = await imageProcessor.imageToBase64(resizedUri);
      console.log('VisionAgent.analyze: base64 length', { bytes: base64?.length ?? 0 });
      trace('base64_ready', { bytes: base64?.length ?? 0 });
      if (!base64) {
        return { productDetected: false };
      }

      // STEP 3 — Load model (if not loaded)
      console.log('VisionAgent.analyze: STEP3 load model', { isLoaded: qwenVLMRunner.isLoaded });
      trace('loading_model', { isLoaded: qwenVLMRunner.isLoaded });
      if (!qwenVLMRunner.isLoaded) {
        await qwenVLMRunner.loadModel();
        unloadRequested = true;
      } else {
        unloadRequested = true;
      }

      console.log('VisionAgent.analyze: model ready');
      trace('model_ready');

      // STEP 4 — Run 3 VQA questions in sequence
      const q1 =
        'Is there a food product, medicine, supplement, or \n     consumer health product in this image? \n     Answer with only: YES or NO';
      console.log('VisionAgent.analyze: STEP4 Q1');
      trace('q1');
      const a1 = await qwenVLMRunner.runVQA(base64, q1);
      console.log('VisionAgent.analyze: A1', a1);
      trace('a1', a1);
      rawAnswers.push(a1);

      const yesNo = normalizeYesNo(a1);
      console.log('VisionAgent.analyze: Q1 parsed', { yesNo });
      trace('q1_parsed', { yesNo });
      if (yesNo !== 'YES') {
        const confidence = yesNo === 'NO' ? 0.9 : 0.6;
        return {
          productDetected: false,
          confidence,
          rawAnswers,
        };
      }

      const q2 =
        'What is the exact product name shown on the label? \n     Answer in 10 words or less.';
      console.log('VisionAgent.analyze: STEP4 Q2');
      trace('q2');
      const a2 = await qwenVLMRunner.runVQA(base64, q2);
      console.log('VisionAgent.analyze: A2', a2);
      trace('a2', a2);
      rawAnswers.push(a2);

      const q3 =
        'What type of product is this? \n     Answer with exactly one word from: \n     food / medicine / supplement / cosmetic / other';
      console.log('VisionAgent.analyze: STEP4 Q3');
      trace('q3');
      const a3 = await qwenVLMRunner.runVQA(base64, q3);
      console.log('VisionAgent.analyze: A3', a3);
      trace('a3', a3);
      rawAnswers.push(a3);

      // STEP 5 — Parse answers into VisionResult
      const productName = (a2 || '').trim();
      const parsedType = normalizeProductType(a3);
      const nameClear = isClearShortAnswer(productName);
      const typeClear = parsedType != null;

      console.log('VisionAgent.analyze: STEP5 parsed', {
        productName,
        parsedType,
        nameClear,
        typeClear,
      });
      trace('parsed', { productName, parsedType, nameClear, typeClear });

      const confidence = nameClear && typeClear ? 0.9 : 0.6;

      const result: VisionResult = {
        productDetected: true,
        confidence,
        rawAnswers,
      };

      if (nameClear) result.productName = productName;
      if (parsedType) result.productType = parsedType;

      console.log('VisionAgent.analyze: complete', result);
      trace('complete', result);
      return result;
    } catch {
      console.log('VisionAgent.analyze: failed');
      trace('failed');
      return { productDetected: false };
    } finally {
      // STEP 6 — Unload model after analysis to free RAM
      console.log('VisionAgent.analyze: STEP6 unload', { unloadRequested });
      trace('unload', { unloadRequested });
      if (unloadRequested) {
        await qwenVLMRunner.unloadModel().catch(() => undefined);
      }

      console.log('VisionAgent.analyze: end');
      trace('end');
    }
  }
}
