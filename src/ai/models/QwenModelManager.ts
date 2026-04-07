import * as FileSystem from 'expo-file-system';

let MMKVImpl: any;
let kv: any;
const fallbackKV = new Map<string, string>();

let LegacyFileSystem: any;
const getFileSystem = () => {
  const fsAny = FileSystem as any;
  if (fsAny?.documentDirectory && typeof fsAny?.createDownloadResumable === 'function') {
    return fsAny;
  }

  if (!LegacyFileSystem) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      LegacyFileSystem = require('expo-file-system/legacy');
    } catch {
      LegacyFileSystem = null;
    }
  }

  return LegacyFileSystem ?? fsAny;
};

const getMMKV = () => {
  if (!MMKVImpl) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require('react-native-mmkv');
      MMKVImpl = mod?.MMKV ?? mod?.default?.MMKV ?? mod?.default ?? mod;
    } catch {
      throw new Error('react-native-mmkv is required for Qwen model readiness flag');
    }
  }

  if (typeof MMKVImpl !== 'function') {
    throw new Error('react-native-mmkv MMKV export is not a constructor in this runtime');
  }

  return new MMKVImpl();
};

const getKV = () => {
  if (!kv) {
    try {
      kv = getMMKV();
    } catch {
      kv = {
        getBoolean: (key: string) => fallbackKV.get(key) === 'true',
        getString: (key: string) => {
          const value = fallbackKV.get(key);
          return value == null ? undefined : value;
        },
        set: (key: string, value: unknown) => fallbackKV.set(key, String(value)),
        delete: (key: string) => fallbackKV.delete(key),
      };
    }
  }
  return kv;
};

export const MAIN_MODEL_URL =
  'https://huggingface.co/ggml-org/SmolVLM2-500M-Video-Instruct-GGUF/resolve/main/SmolVLM2-500M-Video-Instruct-Q8_0.gguf';
export const MMPROJ_URL =
  'https://huggingface.co/second-state/SmolVLM2-500M-Video-Instruct-GGUF/resolve/main/SmolVLM2-500M-Video-Instruct-mmproj-f16.gguf';

// Approximate sizes for UI display only (bytes)
export const MAIN_MODEL_SIZE_BYTES = 437 * 1024 * 1024;
export const MMPROJ_SIZE_BYTES = 200 * 1024 * 1024;
const MODEL_VARIANT = `${MAIN_MODEL_URL}|${MMPROJ_URL}`;
const MIN_READY_BYTES = 10 * 1024 * 1024;

const getDocumentDirectory = () => getFileSystem().documentDirectory ?? '';
export const getLocalMainPath = () => `${getDocumentDirectory()}models/smolvlm2-500m.gguf`;
export const getLocalMmprojPath = () => `${getDocumentDirectory()}models/smolvlm2-500m-mmproj.gguf`;
export const LOCAL_MAIN_PATH = getLocalMainPath();
export const LOCAL_MMPROJ_PATH = getLocalMmprojPath();

export const getQwenModelPaths = () => ({
  mainPath: getLocalMainPath(),
  mmprojPath: getLocalMmprojPath(),
});

const getMainPath = () => getLocalMainPath();
const getMmprojPath = () => getLocalMmprojPath();

const assertQuantizedModel = () => {
  const modelUrl = MAIN_MODEL_URL.toLowerCase();
  if (!(modelUrl.includes('.gguf') && (modelUrl.includes('q') || modelUrl.includes('smolvlm2')))) {
    throw new Error('Vision model URL does not appear to be a supported quantized GGUF model');
  }
};

const READY_KEY = 'qwen_models_ready';
const READY_VARIANT_KEY = 'qwen_models_ready_variant';
const RESUME_MAIN_KEY = 'qwen_models_resume_main';
const RESUME_MMPROJ_KEY = 'qwen_models_resume_mmproj';

export const areModelsReady = (): boolean => {
  try {
    const store = getKV();
    if (store.getBoolean(READY_KEY) !== true) {
      return false;
    }

    const readyVariant = store.getString(READY_VARIANT_KEY);
    return !readyVariant || readyVariant === MODEL_VARIANT;
  } catch {
    return false;
  }
};

const assertFileSystemReady = () => {
  if (!getFileSystem().documentDirectory) {
    throw new Error('expo-file-system documentDirectory is not available in this runtime');
  }
};

const ensureModelsDir = async (): Promise<{ dir: string; mainPath: string; mmprojPath: string }> => {
  assertFileSystemReady();
  const fs = getFileSystem();
  const dir = `${fs.documentDirectory}models/`;
  await fs.makeDirectoryAsync(dir, { intermediates: true }).catch(() => undefined);

  return {
    dir,
    mainPath: getMainPath(),
    mmprojPath: getMmprojPath(),
  };
};

const fileMatchesExpectedSize = async (path: string, expectedBytes: number): Promise<boolean> => {
  const info = await getFileSystem().getInfoAsync(path);
  const fileSize = typeof info?.size === 'number' ? info.size : 0;
  const minBytes = Math.floor(expectedBytes * 0.65);
  const maxBytes = Math.ceil(expectedBytes * 1.45);
  return Boolean(info?.exists && fileSize >= minBytes && fileSize <= maxBytes);
};

const fileExistsWithMinimumSize = async (path: string, minimumBytes: number): Promise<boolean> => {
  const info = await getFileSystem().getInfoAsync(path);
  const fileSize = typeof info?.size === 'number' ? info.size : 0;
  return Boolean(info?.exists && fileSize >= minimumBytes);
};

export const rehydrateQwenReadyFromDisk = async (minimumBytes = MIN_READY_BYTES): Promise<boolean> => {
  try {
    const { mainPath, mmprojPath } = await ensureModelsDir();
    const [mainPresent, mmprojPresent] = await Promise.all([
      fileExistsWithMinimumSize(mainPath, minimumBytes),
      fileExistsWithMinimumSize(mmprojPath, minimumBytes),
    ]);

    const ready = mainPresent && mmprojPresent;
    if (ready) {
      getKV().set(READY_KEY, true);
      getKV().set(READY_VARIANT_KEY, MODEL_VARIANT);
      return true;
    }

    return false;
  } catch {
    return false;
  }
};

export const checkModelsExist = async (): Promise<{ main: boolean; mmproj: boolean }> => {
  assertQuantizedModel();
  const { mainPath, mmprojPath } = await ensureModelsDir();
  const [main, mmproj] = await Promise.all([
    fileMatchesExpectedSize(mainPath, MAIN_MODEL_SIZE_BYTES),
    fileMatchesExpectedSize(mmprojPath, MMPROJ_SIZE_BYTES),
  ]);

  if (main && mmproj) {
    getKV().set(READY_KEY, true);
    getKV().set(READY_VARIANT_KEY, MODEL_VARIANT);
  } else {
    getKV().delete(READY_KEY);
    getKV().delete(READY_VARIANT_KEY);
  }

  return { main, mmproj };
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type ProgressFn = (main: number, mmproj: number) => void;

const downloadWithRetry = async (opts: {
  url: string;
  localPath: string;
  resumeKey: string;
  expectedBytes: number;
  onProgress: (pct0to100: number) => void;
  retries?: number;
}): Promise<void> => {
  assertFileSystemReady();
  const fs = getFileSystem();
  const retries = opts.retries ?? 3;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const existing = await fs.getInfoAsync(opts.localPath);
      if (existing?.exists && existing.size && existing.size > 0) {
        if (await fileMatchesExpectedSize(opts.localPath, opts.expectedBytes)) {
          getKV().delete(opts.resumeKey);
          opts.onProgress(100);
          return;
        }

        await fs.deleteAsync(opts.localPath, { idempotent: true }).catch(() => undefined);
      }

      const resumeStr = getKV().getString(opts.resumeKey);
      const resumeData = resumeStr ? JSON.parse(resumeStr) : undefined;

      if (typeof fs.createDownloadResumable !== 'function') {
        throw new Error('createDownloadResumable is unavailable in this runtime');
      }

      const downloadResumable = fs.createDownloadResumable(
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

      // Save resume data occasionally so a crash/kill can resume later.
      // Note: savable() can be relatively expensive; keep it simple.
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
        const result = resumeData
          ? await downloadResumable.resumeAsync()
          : await downloadResumable.downloadAsync();

        if (!result?.uri) {
          throw new Error('Download did not return a file uri');
        }
      } finally {
        clearInterval(persistInterval);
        await persistResumeData();
      }

      if (!(await fileMatchesExpectedSize(opts.localPath, opts.expectedBytes))) {
        throw new Error('Downloaded model file appears incomplete or mismatched');
      }

      getKV().delete(opts.resumeKey);
      opts.onProgress(100);
      return;
    } catch (e) {
      if (attempt >= retries) {
        throw e;
      }

      // backoff: 1s, 2s, 4s
      const backoffMs = 1000 * Math.pow(2, attempt - 1);
      await sleep(backoffMs);
    }
  }
};

export const downloadModels = async (onProgress: ProgressFn): Promise<void> => {
  const { mainPath, mmprojPath } = await ensureModelsDir();

  let mainPct = 0;
  let mmprojPct = 0;

  const emit = () => {
    onProgress(mainPct, mmprojPct);
  };

  emit();

  await Promise.all([
    downloadWithRetry({
      url: MAIN_MODEL_URL,
      localPath: mainPath,
      resumeKey: RESUME_MAIN_KEY,
      expectedBytes: MAIN_MODEL_SIZE_BYTES,
      onProgress: (p) => {
        mainPct = p;
        emit();
      },
    }),
    downloadWithRetry({
      url: MMPROJ_URL,
      localPath: mmprojPath,
      resumeKey: RESUME_MMPROJ_KEY,
      expectedBytes: MMPROJ_SIZE_BYTES,
      onProgress: (p) => {
        mmprojPct = p;
        emit();
      },
    }),
  ]);

  const exists = await checkModelsExist();
  if (exists.main && exists.mmproj) {
    getKV().set(READY_KEY, true);
    getKV().set(READY_VARIANT_KEY, MODEL_VARIANT);
  } else {
    getKV().delete(READY_KEY);
    getKV().delete(READY_VARIANT_KEY);
    throw new Error('Qwen model download finished but one or more model files are missing');
  }
};

export const deleteModels = async (): Promise<void> => {
  const { mainPath, mmprojPath } = await ensureModelsDir();
  const fs = getFileSystem();

  await fs.deleteAsync(mainPath, { idempotent: true }).catch(() => undefined);
  await fs.deleteAsync(mmprojPath, { idempotent: true }).catch(() => undefined);

  getKV().delete(READY_KEY);
  getKV().delete(READY_VARIANT_KEY);
  getKV().delete(RESUME_MAIN_KEY);
  getKV().delete(RESUME_MMPROJ_KEY);
};

export const QwenModelManager = {
  areModelsReady,
  checkModelsExist,
  rehydrateQwenReadyFromDisk,
  downloadModels,
  deleteModels,
};
