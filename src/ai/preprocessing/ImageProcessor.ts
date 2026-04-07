import { Image } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';

const QWEN_MAX_SIZE = 960;
const MIN_BYTES_USABLE = 10 * 1024;
const VLM_MAX_IMAGE_BYTES = 900 * 1024;

const normalizeFileUri = (uri: string): string => {
  if (!uri) return uri;
  if (/^[a-z]+:\/\//i.test(uri)) return uri;
  if (uri.startsWith('/')) return `file://${uri}`;
  return uri;
};

export const getImageByteSize = async (uri: string): Promise<number> => {
  try {
    const sourceUri = normalizeFileUri(uri);
    const info = await (FileSystem as any).getInfoAsync(sourceUri);
    return typeof info?.size === 'number' ? info.size : 0;
  } catch {
    return 0;
  }
};

type QualityResult = {
  isUsable: boolean;
  reason?: 'too_dark' | 'too_blurry' | 'too_small' | 'too_large';
};

const getImageSize = async (uri: string): Promise<{ width: number; height: number } | null> => {
  try {
    return await new Promise((resolve) => {
      Image.getSize(
        uri,
        (width, height) => resolve({ width, height }),
        () => resolve(null),
      );
    });
  } catch {
    return null;
  }
};

export const resizeForQwen = async (uri: string): Promise<string> => {
  try {
    const sourceUri = normalizeFileUri(uri);
    const size = await getImageSize(sourceUri);
    if (!size?.width || !size?.height) {
      const compressed = await ImageManipulator.manipulateAsync(
        sourceUri,
        [],
        { compress: 0.45, format: ImageManipulator.SaveFormat.JPEG },
      );
      return compressed?.uri || sourceUri;
    }

    const scale = Math.min(1, QWEN_MAX_SIZE / size.width, QWEN_MAX_SIZE / size.height);
    if (scale >= 1) {
      const originalInfo = await (FileSystem as any).getInfoAsync(sourceUri);
      const originalSize = typeof originalInfo?.size === 'number' ? originalInfo.size : 0;
      if (originalSize > VLM_MAX_IMAGE_BYTES) {
        const compressed = await ImageManipulator.manipulateAsync(
          sourceUri,
          [],
          { compress: 0.45, format: ImageManipulator.SaveFormat.JPEG },
        );
        return compressed?.uri || sourceUri;
      }
      return sourceUri;
    }

    const targetWidth = Math.max(1, Math.round(size.width * scale));
    const targetHeight = Math.max(1, Math.round(size.height * scale));

    const result = await ImageManipulator.manipulateAsync(
      sourceUri,
      [{ resize: { width: targetWidth, height: targetHeight } }],
      { compress: 0.45, format: ImageManipulator.SaveFormat.JPEG },
    );

    return result?.uri || sourceUri;
  } catch {
    return uri;
  }
};

export const imageToBase64 = async (uri: string): Promise<string> => {
  try {
    const sourceUri = normalizeFileUri(uri);
    const base64 = await (FileSystem as any).readAsStringAsync(sourceUri, {
      encoding: (FileSystem as any).EncodingType.Base64,
    });
    return typeof base64 === 'string' ? base64 : '';
  } catch {
    return '';
  }
};

export const assessQuality = async (uri: string): Promise<QualityResult> => {
  try {
    const sourceUri = normalizeFileUri(uri);
    const info = await (FileSystem as any).getInfoAsync(sourceUri);
    const size = typeof info?.size === 'number' ? info.size : 0;
    if (size > 0 && size < MIN_BYTES_USABLE) {
      return { isUsable: false, reason: 'too_small' };
    }
    return { isUsable: true };
  } catch {
    return { isUsable: true };
  }
};

class ImageProcessor {
  async processImage(
    uri: string,
    _size: { width: number; height: number } = { width: 224, height: 224 },
  ): Promise<{ base64: string | undefined; quality: boolean }> {
    const quality = await this.assessQuality(uri);
    if (!quality?.isUsable) {
      throw new Error('Poor image quality');
    }

    const base64 = await this.imageToBase64(uri);
    return { base64: base64 || undefined, quality: true };
  }

  async resizeForQwen(uri: string): Promise<string> {
    return resizeForQwen(uri);
  }

  async imageToBase64(uri: string): Promise<string> {
    return imageToBase64(uri);
  }

  async getImageByteSize(uri: string): Promise<number> {
    return getImageByteSize(uri);
  }

  /**
   * Placeholder for image quality assessment.
   * A real implementation would involve more complex analysis,
   * such as blur detection and lighting analysis, which are beyond
   * the scope of basic image manipulation libraries.
   */
  async assessQuality(uri: string): Promise<QualityResult> {
    return assessQuality(uri);
  }
}

export const imageProcessor = new ImageProcessor();
