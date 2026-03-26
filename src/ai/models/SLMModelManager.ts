import * as FileSystem from 'expo-file-system';

let MMKVImpl: any;
let kv: any;

const getMMKV = () => {
  if (!MMKVImpl) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require('react-native-mmkv');
      MMKVImpl = mod?.MMKV ?? mod?.default?.MMKV ?? mod?.default ?? mod;
    } catch {
      throw new Error('react-native-mmkv is required for SLM model readiness flag');
    }
  }

  if (typeof MMKVImpl !== 'function') {
    throw new Error('react-native-mmkv MMKV export is not a constructor in this runtime');
  }

  return new MMKVImpl();
};

const getKV = () => {
  if (!kv) {
    kv = getMMKV();
  }
  return kv;
};

export const SLM_MODEL_URL =
  'https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q4_k_m.gguf';

// Approximate size for UI display only (bytes)
export const SLM_MODEL_SIZE_BYTES = 1100 * 1024 * 1024;

export const LOCAL_SLM_PATH = `${(FileSystem as any).documentDirectory}models/qwen2.5-1.5b-instruct-q4_k_m.gguf`;

const assertQuantizedModel = () => {
  // Defensive check: ensure path matches expected quant variant.
  if (!LOCAL_SLM_PATH.toLowerCase().includes('q4')) {
    throw new Error('SLM model path does not appear to be a Q4 quantized model');
  }
};

const READY_KEY = 'slm_model_ready';
const RESUME_KEY = 'slm_model_resume';

export const isSLMReady = (): boolean => {
  try {
    return getKV().getBoolean(READY_KEY) === true;
  } catch {
    return false;
  }
};

const assertFileSystemReady = () => {
  if (!(FileSystem as any).documentDirectory) {
    throw new Error('expo-file-system documentDirectory is not available in this runtime');
  }
};

const ensureModelsDir = async (): Promise<{ dir: string; modelPath: string }> => {
  assertFileSystemReady();
  const dir = `${(FileSystem as any).documentDirectory}models/`;
  await (FileSystem as any).makeDirectoryAsync(dir, { intermediates: true }).catch(() => undefined);
  return { dir, modelPath: LOCAL_SLM_PATH };
};

const fileExistsNonEmpty = async (path: string): Promise<boolean> => {
  const info = await (FileSystem as any).getInfoAsync(path);
  return Boolean(info?.exists && typeof info.size === 'number' && info.size > 0);
};

export const checkSLMExists = async (): Promise<boolean> => {
  assertQuantizedModel();
  const { modelPath } = await ensureModelsDir();
  return await fileExistsNonEmpty(modelPath);
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const downloadWithRetry = async (opts: {
  url: string;
  localPath: string;
  resumeKey: string;
  onProgress: (pct0to100: number) => void;
  retries?: number;
}): Promise<void> => {
  assertFileSystemReady();
  const retries = opts.retries ?? 3;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const existing = await (FileSystem as any).getInfoAsync(opts.localPath);
      if (existing?.exists && existing.size && existing.size > 0) {
        getKV().delete(opts.resumeKey);
        opts.onProgress(100);
        return;
      }

      const resumeStr = getKV().getString(opts.resumeKey);
      const resumeData = resumeStr ? JSON.parse(resumeStr) : undefined;

      const downloadResumable = (FileSystem as any).createDownloadResumable(
        opts.url,
        opts.localPath,
        {},
        (progress: any) => {
          const totalBytesWritten = progress?.totalBytesWritten ?? 0;
          const totalBytesExpectedToWrite = progress?.totalBytesExpectedToWrite ?? 0;
          const ratio = totalBytesExpectedToWrite ? totalBytesWritten / totalBytesExpectedToWrite : 0;
          const pct = Math.max(0, Math.min(100, Math.floor(ratio * 100)));
          opts.onProgress(pct);
        },
        resumeData,
      );

      const persistResumeData = async () => {
        try {
          const savable = await downloadResumable.savable();
          if (savable?.resumeData != null) {
            getKV().set(opts.resumeKey, JSON.stringify(savable.resumeData));
          }
        } catch {
          // ignore
        }
      };

      const persistInterval = setInterval(() => {
        persistResumeData();
      }, 2500);

      try {
        const result = resumeData ? await downloadResumable.resumeAsync() : await downloadResumable.downloadAsync();
        if (!result?.uri) {
          throw new Error('Download did not return a file uri');
        }
      } finally {
        clearInterval(persistInterval);
        await persistResumeData();
      }

      if (!(await fileExistsNonEmpty(opts.localPath))) {
        throw new Error('Downloaded file is missing or empty');
      }

      getKV().delete(opts.resumeKey);
      opts.onProgress(100);
      return;
    } catch (e) {
      if (attempt >= retries) throw e;
      const backoffMs = 1000 * Math.pow(2, attempt - 1);
      await sleep(backoffMs);
    }
  }
};

export const downloadSLM = async (onProgress: (pct0to100: number) => void): Promise<void> => {
  const { modelPath } = await ensureModelsDir();

  let pct = 0;
  const emit = () => onProgress(pct);
  emit();

  await downloadWithRetry({
    url: SLM_MODEL_URL,
    localPath: modelPath,
    resumeKey: RESUME_KEY,
    onProgress: (p) => {
      pct = p;
      emit();
    },
  });

  const exists = await checkSLMExists();
  if (exists) {
    getKV().set(READY_KEY, true);
  } else {
    getKV().delete(READY_KEY);
    throw new Error('SLM model download finished but the model file is missing');
  }
};

export const deleteSLM = async (): Promise<void> => {
  const { modelPath } = await ensureModelsDir();
  await (FileSystem as any).deleteAsync(modelPath, { idempotent: true }).catch(() => undefined);
  getKV().delete(READY_KEY);
  getKV().delete(RESUME_KEY);
};

export const SLMModelManager = {
  isSLMReady,
  checkSLMExists,
  downloadSLM,
  deleteSLM,
};
