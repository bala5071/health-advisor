import {
  checkModelsExist,
  getLocalMainPath,
  getLocalMmprojPath,
} from '../models/QwenModelManager';

type LlamaContext = any;

const SAFE_N_CTX = 768;
const SAFE_N_BATCH = 64;
const SAFE_N_GPU_LAYERS = 0;
const SAFE_IMAGE_MAX_TOKENS = 256;

type OpenAIMessage = {
  role: 'user' | 'assistant' | 'system';
  content:
    | string
    | Array<
        | { type: 'text'; text: string }
        | { type: 'image_url'; image_url: { url: string } }
      >;
};

const normalizeImageUri = (uri: string): string => {
  if (!uri) return uri;
  if (/^file:\/\//i.test(uri)) return uri;
  if (uri.startsWith('/')) return `file://${uri}`;
  return uri;
};

class QwenVLMRunnerSingleton {
  context: LlamaContext | null = null;
  isLoaded = false;

  private getInitLlama() {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require('llama.rn');
      return mod?.initLlama ?? mod?.default ?? mod;
    } catch {
      throw new Error('llama.rn native module is unavailable in this runtime');
    }
  }

  async loadModel(): Promise<void> {
    console.log('QwenVLMRunner.loadModel: start');
    if (this.isLoaded && this.context) return;

    const mainPath = getLocalMainPath();
    const mmprojPath = getLocalMmprojPath();

    try {
      const exists = await checkModelsExist();
      if (!exists.main || !exists.mmproj) {
        console.log('QwenVLMRunner.loadModel: missing model files', { exists, mainPath, mmprojPath });
        throw new Error('Models not downloaded');
      }

      const start = Date.now();

      const initLlama = this.getInitLlama();
      const ctx = await (initLlama as any)({
        model: mainPath,
        mmproj: mmprojPath,
        n_ctx: SAFE_N_CTX,
        n_batch: SAFE_N_BATCH,
        n_gpu_layers: SAFE_N_GPU_LAYERS,
      });

      if (typeof (ctx as any)?.initMultimodal === 'function') {
        const mmEnabled = await (ctx as any).initMultimodal({
          path: mmprojPath,
          use_gpu: false,
          image_max_tokens: SAFE_IMAGE_MAX_TOKENS,
        });
        console.log('QwenVLMRunner.loadModel: multimodal initialized', { mmEnabled });
      }

      const elapsed = Date.now() - start;
      console.log(`QwenVLMRunner model loaded in ${elapsed}ms`);

      console.log('QwenVLMRunner.loadModel: complete');

      this.context = ctx;
      this.isLoaded = true;
    } catch (error: unknown) {
      const message = String((error as any)?.message || error || '');
      this.context = null;
      this.isLoaded = false;
      console.log('QwenVLMRunner.loadModel: failed', {
        message,
        mainPath,
        mmprojPath,
      });
      throw error;
    }
  }

  async runVQA(imageUri: string, question: string): Promise<string> {
    if (!this.isLoaded || !this.context) {
      throw new Error('Model not loaded');
    }

    try {
      const sourceImageUri = normalizeImageUri(imageUri);
      console.log('QwenVLMRunner.runVQA: start', {
        question,
        imageUri: sourceImageUri,
      });
      const messages: OpenAIMessage[] = [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: sourceImageUri,
              },
            },
            {
              type: 'text',
              text: question,
            },
          ],
        },
      ];

      const result = await (this.context as any).completion({
        messages,
        max_tokens: 96,
        temperature: 0.0,
      });

      const text = result?.text;
      console.log('QwenVLMRunner.runVQA: complete', {
        textPreview: typeof text === 'string' ? text.slice(0, 160) : '',
      });
      return typeof text === 'string' ? text : '';
    } catch (error: unknown) {
      console.log('QwenVLMRunner.runVQA: failed', {
        message: String((error as any)?.message || error || ''),
      });
      return '';
    }
  }

  async unloadModel(): Promise<void> {
    console.log('QwenVLMRunner.unloadModel: start');
    try {
      await (this.context as any)?.releaseMultimodal?.();
    } catch {
      // ignore
    }

    try {
      await (this.context as any)?.release?.();
    } catch {
      // ignore
    }

    this.context = null;
    this.isLoaded = false;

    console.log('Model unloaded, memory freed');
    console.log('QwenVLMRunner.unloadModel: complete');
  }
}

export class QwenVLMRunner {
  private static instance: QwenVLMRunnerSingleton | null = null;

  static getInstance(): QwenVLMRunnerSingleton {
    if (!QwenVLMRunner.instance) {
      QwenVLMRunner.instance = new QwenVLMRunnerSingleton();
    }
    return QwenVLMRunner.instance;
  }
}

export const qwenVLMRunner = QwenVLMRunner.getInstance();
