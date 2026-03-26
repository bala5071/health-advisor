export type STTBackend = 'vosk' | 'react_native_voice';

export type STTState = {
  isListening: boolean;
  partialTranscript: string;
  finalTranscript: string;
  error?: string | null;
  backend?: STTBackend;
};

type Listener = (state: STTState) => void;

const normalize = (s: string) => (s || '').replace(/\s+/g, ' ').trim();

class STTProviderSingleton {
  private state: STTState = {
    isListening: false,
    partialTranscript: '',
    finalTranscript: '',
    error: null,
  };

  private listeners: Set<Listener> = new Set();
  private voice: any | null = null;
  private backend: STTBackend | null = null;

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  getState(): STTState {
    return this.state;
  }

  private setState(next: Partial<STTState>) {
    this.state = { ...this.state, ...next };
    for (const l of this.listeners) {
      try {
        l(this.state);
      } catch {
        // ignore
      }
    }
  }

  private getVoskModule(): any | null {
    // Metro bundler does not support dynamic require() (e.g., require(name)).
    // Keep these requires static so bundling succeeds.
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require('react-native-vosk');
      const m = mod?.default ?? mod;
      if (m) return m;
    } catch {
      // ignore
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require('@react-native-vosk/vosk');
      const m = mod?.default ?? mod;
      if (m) return m;
    } catch {
      // ignore
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require('vosk-react-native');
      const m = mod?.default ?? mod;
      if (m) return m;
    } catch {
      // ignore
    }

    return null;
  }

  private getVoiceModule(): any {
    if (this.voice) return this.voice;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require('@react-native-voice/voice');
      const Voice = mod?.default ?? mod;
      if (!Voice) {
        throw new Error('Voice module not found');
      }
      this.voice = Voice;
      return Voice;
    } catch {
      return null;
    }
  }

  private ensureBackend(): STTBackend {
    if (this.backend) return this.backend;
    const vosk = this.getVoskModule();
    if (vosk && (typeof vosk.start === 'function' || typeof vosk.startListening === 'function')) {
      this.backend = 'vosk';
      return this.backend;
    }
    this.backend = 'react_native_voice';
    return this.backend;
  }

  reset() {
    this.setState({ partialTranscript: '', finalTranscript: '', error: null });
  }

  async start(locale = 'en-US'): Promise<void> {
    this.reset();
    const backend = this.ensureBackend();

    if (backend === 'vosk') {
      const vosk = this.getVoskModule();
      if (!vosk) {
        this.backend = 'react_native_voice';
        await this.start(locale);
        return;
      }
      this.setState({ isListening: true, backend: 'vosk' });

      try {
        // Minimal generic interface; different packages vary. We support event-callback style if present.
        if (typeof vosk.onPartial === 'function') {
          vosk.onPartial((t: string) => this.setState({ partialTranscript: normalize(t) }));
        }
        if (typeof vosk.onFinal === 'function') {
          vosk.onFinal((t: string) => this.setState({ finalTranscript: normalize(t), isListening: false }));
        }

        if (typeof vosk.startListening === 'function') {
          await vosk.startListening({ locale });
        } else if (typeof vosk.start === 'function') {
          await vosk.start({ locale });
        }
      } catch (e: any) {
        this.setState({ isListening: false, error: String(e?.message || e) });
      }

      return;
    }

    const Voice = this.getVoiceModule();
    if (!Voice) {
      this.setState({ isListening: false, backend: 'react_native_voice', error: 'Speech-to-text module is not installed.' });
      return;
    }
    this.setState({ isListening: true, backend: 'react_native_voice' });

    const self = this;

    // Attach listeners once
    if (!(Voice as any).__healthAdvisorHandlersAttached) {
      (Voice as any).__healthAdvisorHandlersAttached = true;

      Voice.onSpeechStart = () => {
        // no-op
      };

      Voice.onSpeechPartialResults = (e: any) => {
        const value = Array.isArray(e?.value) ? e.value.join(' ') : '';
        self.setPartial(value);
      };

      Voice.onSpeechResults = (e: any) => {
        const value = Array.isArray(e?.value) ? e.value.join(' ') : '';
        self.setFinal(value);
      };

      Voice.onSpeechError = (e: any) => {
        const msg = e?.error?.message ?? e?.message ?? 'Speech recognition error';
        self.setError(String(msg));
      };

      Voice.onSpeechEnd = () => {
        self.setListening(false);
      };
    }

    try {
      await Voice.start(locale);
    } catch (e: any) {
      this.setState({ isListening: false, error: String(e?.message || e) });
    }
  }

  private setListening(isListening: boolean) {
    this.setState({ isListening });
  }

  private setPartial(text: string) {
    const t = normalize(text);
    if (!t) return;
    this.setState({ partialTranscript: t });
  }

  private setFinal(text: string) {
    const t = normalize(text);
    if (!t) return;
    this.setState({ finalTranscript: t, partialTranscript: '' });
  }

  private setError(msg: string) {
    this.setState({ error: msg, isListening: false });
  }

  async stop(): Promise<void> {
    const backend = this.ensureBackend();

    if (backend === 'vosk') {
      const vosk = this.getVoskModule();
      try {
        if (vosk && typeof vosk.stop === 'function') await vosk.stop();
        if (vosk && typeof vosk.stopListening === 'function') await vosk.stopListening();
      } catch {
        // ignore
      }
      this.setState({ isListening: false });
      return;
    }

    const Voice = this.getVoiceModule();
    try {
      await Voice.stop();
    } catch {
      // ignore
    }
    this.setState({ isListening: false });
  }

  async destroy(): Promise<void> {
    try {
      const Voice = this.getVoiceModule();
      await Voice.destroy();
      await Voice.removeAllListeners();
    } catch {
      // ignore
    }
  }
}

export const sttProvider = new STTProviderSingleton();
