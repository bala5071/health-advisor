type SpeakOptions = {
  rate?: number;
  pitch?: number;
  language?: string;
  voice?: string;
  onStart?: () => void;
  onDone?: () => void;
  onStopped?: () => void;
  onError?: (e: any) => void;
};

export type TTSBackend = 'piper' | 'expo_speech';

export type SpeakHandle = {
  backend: TTSBackend;
};

export class TTSProvider {
  private backend: TTSBackend | null = null;

  private async getExpoSpeech() {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      return require('expo-speech') as any;
    } catch {
      throw new Error('expo-speech is required for TTS. Install with: npx expo install expo-speech');
    }
  }

  private getPiperModule(): any | null {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require('react-native-piper-tts');
      const m = mod?.default ?? mod;
      if (m) return m;
    } catch { /* not installed */ }

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require('piper-tts-react-native');
      const m = mod?.default ?? mod;
      if (m) return m;
    } catch { /* not installed */ }

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require('react-native-piper');
      const m = mod?.default ?? mod;
      if (m) return m;
    } catch { /* not installed */ }

    return null;
  }

  private resolveBackend(): TTSBackend {
    if (this.backend) return this.backend;
    const piper = this.getPiperModule();
    if (piper && (typeof piper.speak === 'function' || typeof piper.tts === 'function')) {
      this.backend = 'piper';
      return this.backend;
    }
    this.backend = 'expo_speech';
    return this.backend;
  }

  async speak(text: string, options?: SpeakOptions): Promise<SpeakHandle> {
    const backend = this.resolveBackend();

    if (backend === 'piper') {
      const piper = this.getPiperModule();
      if (!piper) {
        return this.speakWithExpoSpeech(text, options);
      }

      try {
        options?.onStart?.();
        if (typeof piper.speak === 'function') {
          await piper.speak(text, {
            rate: options?.rate,
            pitch: options?.pitch,
            language: options?.language,
            voice: options?.voice,
          });
        } else if (typeof piper.tts === 'function') {
          await piper.tts(text);
        }
        options?.onDone?.();
        return { backend: 'piper' };
      } catch (e) {
        options?.onError?.(e);
        return this.speakWithExpoSpeech(text, options);
      }
    }

    return this.speakWithExpoSpeech(text, options);
  }

  private async speakWithExpoSpeech(text: string, options?: SpeakOptions): Promise<SpeakHandle> {
    const Speech = await this.getExpoSpeech();

    return new Promise((resolve) => {
      try {
        Speech.speak(text, {
          rate: options?.rate,
          pitch: options?.pitch,
          language: options?.language,
          voice: options?.voice,
          onStart: options?.onStart,
          onDone: () => {
            options?.onDone?.();
            resolve({ backend: 'expo_speech' });
          },
          onStopped: () => {
            options?.onStopped?.();
            resolve({ backend: 'expo_speech' });
          },
          onError: (e: any) => {
            options?.onError?.(e);
            resolve({ backend: 'expo_speech' });
          },
        });
      } catch (e) {
        options?.onError?.(e);
        resolve({ backend: 'expo_speech' });
      }
    });
  }

  async stop(): Promise<void> {
    const backend = this.resolveBackend();

    if (backend === 'piper') {
      const piper = this.getPiperModule();
      try {
        if (piper && typeof piper.stop === 'function') {
          await piper.stop();
          return;
        }
      } catch {
        // ignore
      }
    }

    const Speech = await this.getExpoSpeech();
    try {
      Speech.stop();
    } catch {
      // ignore
    }
  }
}

export const ttsProvider = new TTSProvider();
