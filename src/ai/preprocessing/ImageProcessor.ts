import { Image } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';

const QWEN_MAX_SIZE = 960;
const MIN_BYTES_USABLE = 10 * 1024;

type QualityResult = {
  isUsable: boolean;
  reason?: 'too_dark' | 'too_blurry' | 'too_small';
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
    const size = await getImageSize(uri);
    if (!size?.width || !size?.height) return uri;

    const scale = Math.min(1, QWEN_MAX_SIZE / size.width, QWEN_MAX_SIZE / size.height);
    if (scale >= 1) return uri;

    const targetWidth = Math.max(1, Math.round(size.width * scale));
    const targetHeight = Math.max(1, Math.round(size.height * scale));

    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: targetWidth, height: targetHeight } }],
      { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG },
    );

    return result?.uri || uri;
  } catch {
    return uri;
  }
};

export const imageToBase64 = async (uri: string): Promise<string> => {
  try {
    const base64 = await (FileSystem as any).readAsStringAsync(uri, {
      encoding: (FileSystem as any).EncodingType.Base64,
    });
    return typeof base64 === 'string' ? base64 : '';
  } catch {
    return '';
  }
};

export const assessQuality = async (uri: string): Promise<QualityResult> => {
  try {
    const info = await (FileSystem as any).getInfoAsync(uri);
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
