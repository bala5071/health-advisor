import * as SecureStore from 'expo-secure-store';

type KeyBytes = Uint8Array;

const KEY_NAME = 'health_advisor_aes256_key_v1';

let cachedKey: KeyBytes | undefined;

const getRandomBytes = async (n: number): Promise<Uint8Array> => {
  try {
    const cryptoAny = (globalThis as any)?.crypto as any;
    if (cryptoAny && typeof cryptoAny.getRandomValues === 'function') {
      const out = new Uint8Array(n);
      cryptoAny.getRandomValues(out);
      return out;
    }
  } catch {
    // ignore
  }

  // Fallback: not cryptographically strong, but avoids crashes.
  const out = new Uint8Array(n);
  for (let i = 0; i < n; i++) out[i] = Math.floor(Math.random() * 256);
  return out;
};

const getUtils = (): any => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('@noble/ciphers/utils.js');
};

const getAes = () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('@noble/ciphers/aes.js') as any;
};

const te = new TextEncoder();
const td = new TextDecoder();

const isEncrypted = (value: any): boolean => typeof value === 'string' && value.startsWith('enc:v1:');

export class EncryptionService {
  static isEncrypted = isEncrypted;

  static async getOrCreateKey(): Promise<KeyBytes> {
    if (cachedKey) return cachedKey;

    const existing = await SecureStore.getItemAsync(KEY_NAME);
    const utils = getUtils();

    if (existing) {
      try {
        const parsed = utils.base64ToBytes(existing) as Uint8Array;
        if (parsed && parsed.length === 32) {
          cachedKey = parsed;
          return cachedKey;
        }
      } catch {
        // ignore
      }
    }

    const key = (await getRandomBytes(32)) as Uint8Array;
    await SecureStore.setItemAsync(KEY_NAME, utils.bytesToBase64(key));
    cachedKey = key;
    return cachedKey;
  }

  static async encryptString(plaintext: string): Promise<string> {
    const key = await this.getOrCreateKey();
    const utils = getUtils();
    const { aesgcm } = getAes();

    const iv = await getRandomBytes(12);
    const data = te.encode(String(plaintext ?? ''));

    const aead = aesgcm(key, iv);
    const sealed = aead.encrypt(data);

    return `enc:v1:${utils.bytesToBase64(iv)}:${utils.bytesToBase64(sealed)}`;
  }

  static async decryptString(value: string): Promise<string> {
    if (!isEncrypted(value)) return String(value ?? '');

    const key = await this.getOrCreateKey();
    const utils = getUtils();
    const { aesgcm } = getAes();

    const parts = String(value).split(':');
    // enc:v1:<iv_b64>:<sealed_b64>
    if (parts.length < 5) return '';

    const ivB64 = parts[2];
    const sealedB64 = parts.slice(3).join(':');

    const iv = utils.base64ToBytes(ivB64);
    const sealed = utils.base64ToBytes(sealedB64);

    try {
      const aead = aesgcm(key, iv);
      const opened = aead.decrypt(sealed);
      return td.decode(opened);
    } catch {
      return '';
    }
  }

  static async maybeEncrypt(value: any): Promise<string | null> {
    if (value == null) return null;
    const s = String(value);
    if (!s.trim()) return s;
    if (isEncrypted(s)) return s;
    return await this.encryptString(s);
  }

  static async maybeDecrypt(value: any): Promise<string | null> {
    if (value == null) return null;
    const s = String(value);
    if (!isEncrypted(s)) return s;
    return await this.decryptString(s);
  }
}
