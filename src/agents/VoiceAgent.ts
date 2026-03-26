import { Agent, AgentResult, AgentType, Task } from './core/types';
import { voiceManager } from '../voice/VoiceManager';
import { sttProvider } from '../voice/STTProvider';
import { buildHealthAdvisorQAPrompt, slmInference } from '../ai/inference/SLMInference';
import { retrieveHealthKbContext } from '../ai/knowledge/HealthKnowledgeBase';

type Repositories = typeof import('../database/repositories');

const tryGetRepositories = (): Repositories | null => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('../database/repositories') as Repositories;
  } catch {
    return null;
  }
};

const toSentence = (s: string) => {
  const t = (s || '').trim();
  if (!t) return '';
  if (/[.!?]\s*$/.test(t)) return t;
  return `${t}.`;
};

const summarizeRecommendation = (input: any): string => {
  const verdict = String(input?.verdict || '').toUpperCase();
  const explanation = String(input?.explanation || input?.text || '').trim();
  const alternatives = Array.isArray(input?.alternatives) ? input.alternatives : [];

  const verdictSentence = verdict ? `Verdict: ${verdict}.` : '';

  const explanationShort = explanation
    ? explanation
        .replace(/\s+/g, ' ')
        .split(/(?<=[.!?])\s+/)
        .slice(0, 2)
        .join(' ')
    : '';

  const alt = alternatives.length > 0 ? `Consider: ${String(alternatives[0])}.` : '';

  const parts = [verdictSentence, toSentence(explanationShort), alt].filter(Boolean);
  const combined = parts.join(' ');

  // Ensure 2-3 sentences max.
  const sentences = combined.split(/(?<=[.!?])\s+/).filter(Boolean);
  return sentences.slice(0, 3).join(' ');
};

export class VoiceAgent implements Agent {
  async answerQuestion(opts: {
    question: string;
    scanContext: any;
    userId?: string | null;
  }): Promise<{ question: string; answer: string; confidence: number; raw: string }> {
    const question = String(opts.question || '').trim();
    if (!question) {
      return { question: '', answer: '', confidence: 0, raw: '' };
    }

    let userProfile: any = null;
    let conditions: any[] = [];
    let medications: any[] = [];

    const userId = opts.userId ?? null;
    if (userId) {
      const repos = tryGetRepositories();
      if (repos) {
        userProfile = await repos.UserRepository.getHealthProfile(userId);
        if (userProfile?.id) {
          const [c, m] = await Promise.all([
            repos.ConditionRepository.getConditions(userProfile.id),
            repos.MedicationRepository.getMedications(userProfile.id),
          ]);
          conditions = Array.isArray(c) ? c : [];
          medications = Array.isArray(m) ? m : [];
        }
      }
    }

    const retrieved = retrieveHealthKbContext({
      conditions: conditions.map((x: any) => String(x?.name ?? x ?? '')).filter(Boolean),
      medications: medications.map((x: any) => String(x?.name ?? x ?? '')).filter(Boolean),
      analysisResults: opts.scanContext,
    });

    const prompt = buildHealthAdvisorQAPrompt({
      userProfile,
      scanContext: opts.scanContext,
      question,
      retrievedContext: retrieved.contextText,
    });

    await slmInference.loadModel();
    const run = await slmInference.run(prompt, {
      maxTokens: 220,
      temperature: 0.2,
    });
    await slmInference.unloadModel().catch(() => undefined);

    const text = (run.text || '').trim();
    const answer = text || 'I do not have enough information to answer that safely.';
    const confidence = Math.max(0.2, Math.min(1, answer.length >= 40 ? 0.8 : 0.55));

    await voiceManager.speak(answer, { autoplay: true });
    return { question, answer, confidence, raw: run.text || '' };
  }

  async listenAndAnswer(opts: { scanContext: any; userId?: string | null; locale?: string }): Promise<void> {
    await sttProvider.start(opts.locale ?? 'en-US');
    // UI listens to finalTranscript and calls answerQuestion; this helper is for programmatic flows.
  }

  async process(task: Task): Promise<AgentResult> {
    try {
      const payload = task?.payload ?? {};
      const mode = String(payload?.mode || 'recommendation');

      if (mode === 'followup') {
        const question = String(payload?.question ?? sttProvider.getState().finalTranscript ?? '');
        const scanContext = payload?.scanContext ?? payload?.context ?? null;
        const userId = payload?.userId ?? null;
        const answered = await this.answerQuestion({ question, scanContext, userId });
        return { agent: AgentType.RECOMMENDATION, result: answered };
      }

      const recommendation = payload?.recommendation ?? payload;
      const summary = summarizeRecommendation(recommendation);
      await voiceManager.speak(summary, { autoplay: true });
      return { agent: AgentType.RECOMMENDATION, result: { summary } };
    } catch (error) {
      return {
        agent: AgentType.RECOMMENDATION,
        result: null,
        error,
      };
    }
  }
}
