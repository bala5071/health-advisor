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
    kv = getMMKV();
  }
  return kv;
};

export const MAIN_MODEL_URL =
  'https://huggingface.co/ggml-org/Qwen2.5-VL-3B-Instruct-GGUF/resolve/main/Qwen2.5-VL-3B-Instruct-Q4_K_M.gguf';
export const MMPROJ_URL =
  'https://huggingface.co/ggml-org/Qwen2.5-VL-3B-Instruct-GGUF/resolve/main/mmproj-Qwen2.5-VL-3B-Instruct-f16.gguf';

// Approximate sizes for UI display only (bytes)
export const MAIN_MODEL_SIZE_BYTES = 2300 * 1024 * 1024;
export const MMPROJ_SIZE_BYTES = 150 * 1024 * 1024;

export const LOCAL_MAIN_PATH = `${(FileSystem as any).documentDirectory}models/qwen-3b.gguf`;
export const LOCAL_MMPROJ_PATH = `${(FileSystem as any).documentDirectory}models/qwen-3b-mmproj.gguf`;

const assertQuantizedModel = () => {
  if (!MAIN_MODEL_URL.toLowerCase().includes('q4')) {
    throw new Error('Vision model URL does not appear to be a Q4 quantized model');
  }
};

const READY_KEY = 'qwen_models_ready';
const RESUME_MAIN_KEY = 'qwen_models_resume_main';
const RESUME_MMPROJ_KEY = 'qwen_models_resume_mmproj';

export const areModelsReady = (): boolean => {
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

const ensureModelsDir = async (): Promise<{ dir: string; mainPath: string; mmprojPath: string }> => {
  assertFileSystemReady();
  const dir = `${(FileSystem as any).documentDirectory}models/`;
  await (FileSystem as any).makeDirectoryAsync(dir, { intermediates: true }).catch(() => undefined);

  return {
    dir,
    mainPath: LOCAL_MAIN_PATH,
    mmprojPath: LOCAL_MMPROJ_PATH,
  };
};

const fileExistsNonEmpty = async (path: string): Promise<boolean> => {
  const info = await (FileSystem as any).getInfoAsync(path);
  return Boolean(info?.exists && typeof info.size === 'number' && info.size > 0);
};

export const checkModelsExist = async (): Promise<{ main: boolean; mmproj: boolean }> => {
  assertQuantizedModel();
  const { mainPath, mmprojPath } = await ensureModelsDir();
  const [main, mmproj] = await Promise.all([fileExistsNonEmpty(mainPath), fileExistsNonEmpty(mmprojPath)]);
  return { main, mmproj };
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type ProgressFn = (main: number, mmproj: number) => void;

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

      if (!(await fileExistsNonEmpty(opts.localPath))) {
        throw new Error('Downloaded file is missing or empty');
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
      onProgress: (p) => {
        mainPct = p;
        emit();
      },
    }),
    downloadWithRetry({
      url: MMPROJ_URL,
      localPath: mmprojPath,
      resumeKey: RESUME_MMPROJ_KEY,
      onProgress: (p) => {
        mmprojPct = p;
        emit();
      },
    }),
  ]);

  const exists = await checkModelsExist();
  if (exists.main && exists.mmproj) {
    getKV().set(READY_KEY, true);
  } else {
    getKV().delete(READY_KEY);
    throw new Error('Qwen model download finished but one or more model files are missing');
  }
};

export const deleteModels = async (): Promise<void> => {
  const { mainPath, mmprojPath } = await ensureModelsDir();

  await (FileSystem as any).deleteAsync(mainPath, { idempotent: true }).catch(() => undefined);
  await (FileSystem as any).deleteAsync(mmprojPath, { idempotent: true }).catch(() => undefined);

  getKV().delete(READY_KEY);
  getKV().delete(RESUME_MAIN_KEY);
  getKV().delete(RESUME_MMPROJ_KEY);
};

export const QwenModelManager = {
  areModelsReady,
  checkModelsExist,
  downloadModels,
  deleteModels,
};
