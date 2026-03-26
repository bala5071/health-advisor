import { useCallback, useRef, useState } from 'react';
import { VisionAgent, VisionResult } from '../agents/VisionAgent';

type VisionStatus =
  | 'idle'
  | 'checking_quality'
  | 'loading_model'
  | 'analyzing'
  | 'done'
  | 'error';

export const visionStatusMessages: Record<VisionStatus, string> = {
  idle: '',
  checking_quality: 'Checking image quality...',
  loading_model: 'Loading Vision AI...',
  analyzing: 'Analyzing product...',
  done: 'Analysis complete',
  error: 'Something went wrong',
};

export const useVisionAgent = () => {
  const agentRef = useRef<VisionAgent | null>(null);
  const [status, setStatus] = useState<VisionStatus>('idle');
  const [result, setResult] = useState<VisionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setStatus('idle');
    setResult(null);
    setError(null);
  }, []);

  const runAnalysis = useCallback(async (imageUri: string): Promise<VisionResult | null> => {
    try {
      setError(null);
      setResult(null);

      setStatus('checking_quality');

      // Per spec: advance state machine stages before calling analyze.
      setStatus('loading_model');
      setStatus('analyzing');

      if (!agentRef.current) {
        agentRef.current = new VisionAgent();
      }

      const res = await agentRef.current.analyze(imageUri);
      setResult(res);
      setStatus('done');
      return res;
    } catch (e: any) {
      setStatus('error');
      setError(e?.message ? String(e.message) : 'Something went wrong');
      return null;
    }
  }, []);

  return {
    status,
    result,
    error,
    runAnalysis,
    reset,
  };
};
