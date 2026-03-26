import { useState, useEffect } from 'react';
import { storage } from '../services/storage';

const ONBOARDING_COMPLETE = 'onboarding_complete';

export const useOnboarding = (refreshKey?: string) => {
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [onboardingLoading, setOnboardingLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const value = await storage.getItem(ONBOARDING_COMPLETE);
        if (!cancelled) {
          setOnboardingComplete(value === 'true');
        }
      } finally {
        if (!cancelled) {
          setOnboardingLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const completeOnboarding = async () => {
    await storage.setItem(ONBOARDING_COMPLETE, 'true');
    setOnboardingComplete(true);
  };

  return {
    onboardingComplete,
    onboardingLoading,
    setOnboardingComplete: completeOnboarding,
  };
};
