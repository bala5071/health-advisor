import { useCallback, useMemo, useRef, useState } from 'react';
import { agentOrchestrator, PipelineStep } from '../agents/core/AgentOrchestrator';

export type PipelineStatus = 'idle' | 'running' | 'done' | 'error';

export const pipelineStepMessages: Record<PipelineStep, string> = {
  starting: 'Starting…',
  detecting_product: 'Detecting product…',
  extracting_text: 'Analyzing label…',
  barcode_lookup: 'Looking up barcode…',
  checking_nutrition: 'Checking nutrition…',
  checking_allergies: 'Checking allergies…',
  generating_recommendation: 'Generating recommendation…',
  speaking: 'Speaking result…',
  saving: 'Saving scan…',
  complete: 'Complete',
};

export const useAgentPipeline = () => {
  const [status, setStatus] = useState<PipelineStatus>('idle');
  const [step, setStep] = useState<PipelineStep>('starting');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<any>(null);

  const runIdRef = useRef(0);

  const message = useMemo(() => pipelineStepMessages[step] || '', [step]);

  const run = useCallback(async (opts: { imageUri: string; userId?: string | null }) => {
    const runId = ++runIdRef.current;
    setStatus('running');
    setError(null);
    setResult(null);
    setStep('starting');

    try {
      const out = await agentOrchestrator.processImage(opts.imageUri, {
        userId: opts.userId ?? null,
        onStep: (s) => {
          if (runIdRef.current !== runId) return;
          setStep(s);
        },
      });

      if (runIdRef.current !== runId) return null;
      setResult(out);
      setStatus('done');
      setStep('complete');
      return out;
    } catch (e) {
      if (runIdRef.current !== runId) return null;
      setError(e);
      setStatus('error');
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    runIdRef.current++;
    setStatus('idle');
    setStep('starting');
    setResult(null);
    setError(null);
  }, []);

  return {
    status,
    step,
    message,
    result,
    error,
    run,
    reset,
  };
};
