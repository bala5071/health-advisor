import { ttsProvider } from './TTSProvider';

export type VoiceState = {
  isSpeaking: boolean;
  lastText?: string;
};

type Listener = (state: VoiceState) => void;

class VoiceManagerSingleton {
  private state: VoiceState = { isSpeaking: false };
  private listeners: Set<Listener> = new Set();
  private currentSpeakId = 0;

  getState(): VoiceState {
    return this.state;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  private setState(next: Partial<VoiceState>) {
    this.state = { ...this.state, ...next };
    for (const l of this.listeners) {
      try {
        l(this.state);
      } catch {
        // ignore
      }
    }
  }

  async speak(text: string, opts?: { autoplay?: boolean }): Promise<void> {
    const speakId = ++this.currentSpeakId;
    const trimmed = (text || '').trim();
    if (!trimmed) return;

    this.setState({ isSpeaking: true, lastText: trimmed });

    await ttsProvider.speak(trimmed, {
      rate: 0.95,
      onDone: () => {
        if (this.currentSpeakId === speakId) this.setState({ isSpeaking: false });
      },
      onStopped: () => {
        if (this.currentSpeakId === speakId) this.setState({ isSpeaking: false });
      },
      onError: () => {
        if (this.currentSpeakId === speakId) this.setState({ isSpeaking: false });
      },
    });

    if (opts?.autoplay === false) {
      // no-op; parameter reserved for future queueing.
    }
  }

  async stop(): Promise<void> {
    this.currentSpeakId++;
    this.setState({ isSpeaking: false });
    await ttsProvider.stop();
  }

  async toggle(textIfStart: string): Promise<void> {
    if (this.state.isSpeaking) {
      await this.stop();
      return;
    }
    await this.speak(textIfStart, { autoplay: true });
  }
}

export const voiceManager = new VoiceManagerSingleton();
