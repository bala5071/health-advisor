import { useState, useEffect } from 'react';
import { storage } from '../services/storage';

const ONBOARDING_COMPLETE = 'onboarding_complete';

export const useOnboarding = () => {
  const [onboardingComplete, setOnboardingComplete] = useState(() => {
    return storage.getBoolean(ONBOARDING_COMPLETE) ?? false;
  });

  const completeOnboarding = () => {
    storage.set(ONBOARDING_COMPLETE, true);
    setOnboardingComplete(true);
  };

  return {
    onboardingComplete,
    setOnboardingComplete: completeOnboarding,
  };
};
