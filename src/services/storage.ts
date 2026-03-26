import * as SecureStore from 'expo-secure-store';

const FILE_MARKER_PREFIX = '__file__:';
const SECURESTORE_MAX_BYTES_SOFT = 1800;

async function getFileSystem() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('expo-file-system/legacy') as any;
  } catch {
    throw new Error('expo-file-system is required for large-value storage');
  }
}

async function ensureStorageDir(FileSystem: any): Promise<string> {
  const dir = `${FileSystem.documentDirectory}kv/`;
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => undefined);
  return dir;
}

function safeKeyToFileName(key: string): string {
  return encodeURIComponent(key);
}

function utf8ByteLength(value: string): number {
  try {
    return new TextEncoder().encode(value).length;
  } catch {
    return value.length;
  }
}

export const storage = {
  setItem: async (key: string, value: string) => {
    const byteLength = utf8ByteLength(value);
    if (byteLength > SECURESTORE_MAX_BYTES_SOFT) {
      const FileSystem: any = await getFileSystem();
      const dir = await ensureStorageDir(FileSystem);
      const path = `${dir}${safeKeyToFileName(key)}.txt`;
      await FileSystem.writeAsStringAsync(path, value, { encoding: FileSystem.EncodingType.UTF8 });
      await SecureStore.setItemAsync(key, `${FILE_MARKER_PREFIX}${byteLength}`);
      return;
    }

    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      throw new Error('Failed to persist value');
    }
  },
  getItem: async (key: string) => {
    const stored = await SecureStore.getItemAsync(key);
    if (stored?.startsWith(FILE_MARKER_PREFIX)) {
      const FileSystem: any = await getFileSystem();
      const dir = await ensureStorageDir(FileSystem);
      const path = `${dir}${safeKeyToFileName(key)}.txt`;
      const info = await FileSystem.getInfoAsync(path);
      if (!info?.exists) return null;
      return await FileSystem.readAsStringAsync(path, { encoding: FileSystem.EncodingType.UTF8 });
    }

    return stored;
  },
  removeItem: async (key: string) => {
    try {
      const FileSystem: any = await getFileSystem();
      const dir = await ensureStorageDir(FileSystem);
      const path = `${dir}${safeKeyToFileName(key)}.txt`;
      await FileSystem.deleteAsync(path, { idempotent: true }).catch(() => undefined);
    } catch {
      // ignore
    }
    await SecureStore.deleteItemAsync(key);
  },
};
