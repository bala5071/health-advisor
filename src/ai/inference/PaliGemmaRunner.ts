import { Platform } from 'react-native';

export type PaliGemmaResult = {
  productName: string | null;
  productType: string | null;
  barcode: string | null;
  rawText?: string;
};

export type ModelDownloadProgress = {
  totalBytesWritten: number;
  totalBytesExpectedToWrite: number;
  progress: number;
};

type RunnerOptions = {
  modelUrl: string;
  modelFileName?: string;
  onDownloadProgress?: (p: ModelDownloadProgress) => void;
};

let cachedSession: any | null = null;
let cachedSessionModelPath: string | null = null;

const extractBarcode = (text: string): string | null => {
  const match = text.match(/\b(\d{8,14})\b/);
  return match?.[1] ?? null;
};

const extractField = (text: string, field: string): string | null => {
  const re = new RegExp(`(?:^|\\n)\\s*${field}\\s*[:=-]\\s*(.+)`, 'i');
  const m = text.match(re);
  if (!m?.[1]) return null;
  const value = m[1].trim();
  if (!value || value.toLowerCase() === 'null' || value.toLowerCase() === 'unknown') return null;
  return value;
};

export class PaliGemmaRunner {
  private options: RunnerOptions;

  constructor(options?: Partial<RunnerOptions>) {
    this.options = {
      modelUrl: options?.modelUrl ?? (process.env.EXPO_PUBLIC_PALIGEMMA_MODEL_URL as string | undefined) ?? '',
      modelFileName: options?.modelFileName ?? 'paligemma.quant.onnx',
      onDownloadProgress: options?.onDownloadProgress,
    };
  }

  private async getFileSystem() {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      return require('expo-file-system') as any;
    } catch {
      throw new Error('expo-file-system is required for model download/caching. Install it with: npx expo install expo-file-system');
    }
  }

  private async getOrt() {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      return require('onnxruntime-react-native') as any;
    } catch {
      throw new Error(
        'onnxruntime-react-native is required for on-device inference and requires a development build (not Expo Go). Ensure it is installed and you are running a dev build.',
      );
    }
  }

  private async ensureModelDownloaded(): Promise<string> {
    if (!this.options.modelUrl) {
      throw new Error(
        'PaliGemmaRunner requires a model URL. Provide options.modelUrl or set EXPO_PUBLIC_PALIGEMMA_MODEL_URL to a direct HTTPS URL to the quantized ONNX model.',
      );
    }

    const FileSystem: any = await this.getFileSystem();
    const dir = `${FileSystem.documentDirectory}models/`;
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => undefined);

    const modelPath = `${dir}${this.options.modelFileName}`;
    const info = await FileSystem.getInfoAsync(modelPath);
    if (info.exists && info.size && info.size > 0) {
      return modelPath;
    }

    const downloadResumable = FileSystem.createDownloadResumable(
      this.options.modelUrl,
      modelPath,
      {},
      (progress: any) => {
        const totalBytesWritten = progress.totalBytesWritten ?? 0;
        const totalBytesExpectedToWrite = progress.totalBytesExpectedToWrite ?? 0;
        const ratio = totalBytesExpectedToWrite
          ? totalBytesWritten / totalBytesExpectedToWrite
          : 0;

        this.options.onDownloadProgress?.({
          totalBytesWritten,
          totalBytesExpectedToWrite,
          progress: ratio,
        });
      },
    );

    const result = await downloadResumable.downloadAsync();
    if (!result?.uri) {
      throw new Error('Failed to download model.');
    }

    return modelPath;
  }

  private async getSession(modelPath: string) {
    if (cachedSession && cachedSessionModelPath === modelPath) return cachedSession;

    const ort = await this.getOrt();

    if (Platform.OS === 'web') {
      throw new Error('onnxruntime-react-native does not run on web. Use native iOS/Android.');
    }

    const session = await ort.InferenceSession.create(modelPath);
    cachedSession = session;
    cachedSessionModelPath = modelPath;
    return session;
  }

  private formatResult(rawText: string): PaliGemmaResult {
    const productName = extractField(rawText, 'product') ?? extractField(rawText, 'product_name');
    const productType = extractField(rawText, 'type') ?? extractField(rawText, 'category');
    const barcode = extractField(rawText, 'barcode') ?? extractBarcode(rawText);

    return {
      productName,
      productType,
      barcode,
      rawText,
    };
  }

  private async runModelTextOnly(session: any, prompt: string): Promise<string> {
    const ort = await this.getOrt();
    const inputNames = session?.inputNames ?? [];
    const outputNames = session?.outputNames ?? [];

    const hasTextInput = inputNames.includes('text') || inputNames.includes('prompt');
    if (!hasTextInput) {
      throw new Error(
        `Model signature mismatch. Expected a text input named "text" or "prompt" for a minimal runner. Inputs: ${JSON.stringify(
          inputNames,
        )}. Outputs: ${JSON.stringify(outputNames)}. Provide a model wrapper that matches your ONNX export (tokenizer + image tensor inputs).`,
      );
    }

    const inputName = inputNames.includes('prompt') ? 'prompt' : 'text';
    const feeds: Record<string, any> = {
      [inputName]: new ort.Tensor('string', [prompt], [1]),
    };

    const results = await session.run(feeds);
    const outName = outputNames.find((n: string) => typeof results?.[n]?.data?.[0] === 'string');
    const out = outName ? results[outName] : null;
    const value = out?.data?.[0];
    if (typeof value !== 'string') {
      throw new Error(
        `Model output mismatch. Expected a string output. Inputs: ${JSON.stringify(inputNames)}. Outputs: ${JSON.stringify(
          outputNames,
        )}.`,
      );
    }
    return value;
  }

  async run(imageUri: string): Promise<PaliGemmaResult> {
    const modelPath = await this.ensureModelDownloaded();
    const session = await this.getSession(modelPath);

    const detectionPrompt =
      'You are given an image of a packaged product. Identify the product name, product type/category, and barcode if visible. Return as lines: Product: <name>\nType: <type>\nBarcode: <digits or null>';
    const vqaPrompt =
      'Question: What is the product name and type? If a barcode is visible, return it. Answer as lines: Product: <name>\nType: <type>\nBarcode: <digits or null>';

    // This runner is implemented to support ONNX exports that accept a direct prompt.
    // For full PaliGemma vision inference (image + tokenizer), we need the exact ONNX model signature.
    // Until you provide that signature, we surface a clear error listing input/output names.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _ = imageUri;

    const text1 = await this.runModelTextOnly(session, detectionPrompt);
    const text2 = await this.runModelTextOnly(session, vqaPrompt);

    const merged = `${text1}\n${text2}`;
    return this.formatResult(merged);
  }
}
