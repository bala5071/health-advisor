import { Buffer } from 'buffer';

const globalAny = globalThis as any;

if (typeof globalAny.Buffer === 'undefined') {
  globalAny.Buffer = Buffer;
}

const applyWatermelonByteToBase64Polyfill = () => {
  const patch = (mod: any) => {
    const target = mod?.default ?? mod;
    if (!target) return;

    if (typeof target.byteToBase64 !== 'function') {
      target.byteToBase64 = (bytes: Uint8Array): string => Buffer.from(bytes).toString('base64');
    }

    if (typeof target.base64ToByte !== 'function') {
      target.base64ToByte = (value: string): Uint8Array => Uint8Array.from(Buffer.from(String(value), 'base64'));
    }
  };

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    patch(require('@nozbe/watermelondb/utils/common'));
  } catch {
    // ignore
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    patch(require('@nozbe/watermelondb/src/utils/common'));
  } catch {
    // ignore
  }
};

applyWatermelonByteToBase64Polyfill();
