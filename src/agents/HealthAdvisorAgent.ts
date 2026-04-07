import { Agent, AgentResult, AgentType, Task } from './core/types';
import { buildHealthAdvisorPrompt, slmInference } from '../ai/inference/SLMInference';
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

export class HealthAdvisorAgent implements Agent {
  static onToken: ((t: string) => void) | null = null;

  async process(task: Task): Promise<AgentResult> {
    try {
      const payload = task?.payload ?? {};

      // Orchestrator currently passes: { analysis: data }
      const analysisResults = payload?.analysis ?? payload?.analysisResults ?? payload ?? null;
      const userId = payload?.userId as string | undefined;

      let userProfile: any = null;
      let conditions: any[] = [];
      let medications: any[] = [];
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

      const nutritionFlags = analysisResults?.nutritionResult?.flags ?? {};

      const filteredConditions = conditions
        .map((x: any) => String(x?.name ?? x ?? ''))
        .filter((c) => {
          const lower = c.toLowerCase();
          const isSodiumCondition = ['hypertension', 'heart', 'kidney', 'blood pressure'].some((k) =>
            lower.includes(k),
          );
          const isSugarCondition = ['diabetes', 'prediabetes', 'insulin'].some((k) => lower.includes(k));
          const isFatCondition = ['cholesterol', 'hyperlipidemia'].some((k) => lower.includes(k));
          if (isSodiumCondition && !nutritionFlags.highSodium) return false;
          if (isSugarCondition && !nutritionFlags.highSugar) return false;
          if (isFatCondition && !nutritionFlags.highSaturatedFat) return false;
          return true;
        })
        .filter(Boolean);

      const retrieved = retrieveHealthKbContext({
        conditions: filteredConditions,
        medications: medications.map((x: any) => String(x?.name ?? x ?? '')).filter(Boolean),
        analysisResults,
      });

      const prompt = buildHealthAdvisorPrompt({
        userProfile,
        analysisResults,
        retrievedContext: retrieved.contextText,
      });

      await slmInference.loadModel();

      const run = await slmInference.run(prompt, {
        onToken: (t) => {
          try {
            HealthAdvisorAgent.onToken?.(t);
          } catch {
            // ignore
          }
        },
      });

      await slmInference.unloadModel().catch(() => undefined);

      return {
        agent: AgentType.RECOMMENDATION,
        result: {
          verdict: run.parsed?.verdict ?? 'CAUTION',
          explanation: run.parsed?.explanation ?? (run.text || '').trim(),
          alternatives: run.parsed?.alternatives ?? [],
          confidence: run.confidence,
          raw: run.text,
          retrievedContextUsed: {
            matchedRuleIds: retrieved.matchedRuleIds,
          },
        },
      };
    } catch (error) {
      try {
        await slmInference.unloadModel();
      } catch {
        // ignore
      }
      return {
        agent: AgentType.RECOMMENDATION,
        result: null,
        error,
      };
    }
  }
}
