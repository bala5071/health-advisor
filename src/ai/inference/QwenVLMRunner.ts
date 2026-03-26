import {
  checkModelsExist,
  LOCAL_MAIN_PATH,
  LOCAL_MMPROJ_PATH,
} from '../models/QwenModelManager';

type LlamaContext = any;

type OpenAIMessage = {
  role: 'user' | 'assistant' | 'system';
  content:
    | string
    | Array<
        | { type: 'text'; text: string }
        | { type: 'image_url'; image_url: { url: string } }
      >;
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

    const exists = await checkModelsExist();
    if (!exists.main || !exists.mmproj) {
      console.log('QwenVLMRunner.loadModel: missing model files');
      throw new Error('Models not downloaded');
    }

    const start = Date.now();

    const initLlama = this.getInitLlama();
    const ctx = await (initLlama as any)({
      model: LOCAL_MAIN_PATH,
      mmproj: LOCAL_MMPROJ_PATH,
      n_ctx: 4096,
      n_gpu_layers: 99,
    });

    const elapsed = Date.now() - start;
    console.log(`QwenVLMRunner model loaded in ${elapsed}ms`);

    console.log('QwenVLMRunner.loadModel: complete');

    this.context = ctx;
    this.isLoaded = true;
  }

  async runVQA(imageBase64: string, question: string): Promise<string> {
    if (!this.isLoaded || !this.context) {
      throw new Error('Model not loaded');
    }

    try {
      console.log('QwenVLMRunner.runVQA: start', {
        question,
        imageBytes: typeof imageBase64 === 'string' ? imageBase64.length : 0,
      });
      const messages: OpenAIMessage[] = [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
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
        max_tokens: 200,
        temperature: 0.1,
      });

      const text = result?.text;
      console.log('QwenVLMRunner.runVQA: complete', {
        textPreview: typeof text === 'string' ? text.slice(0, 160) : '',
      });
      return typeof text === 'string' ? text : '';
    } catch {
      console.log('QwenVLMRunner.runVQA: failed');
      return '';
    }
  }

  async unloadModel(): Promise<void> {
    console.log('QwenVLMRunner.unloadModel: start');
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
