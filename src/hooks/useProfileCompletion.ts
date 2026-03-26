import { useEffect, useState } from 'react';
import { supabase } from '../supabase/client';
import { storage } from '../services/storage';

const PROFILE_COMPLETE_KEY = 'profile_complete';

export const useProfileCompletion = () => {
  const [profileComplete, setProfileComplete] = useState(false);
  const [profileCompletionLoading, setProfileCompletionLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const cached = await storage.getItem(PROFILE_COMPLETE_KEY);
        if (!cancelled && cached === 'true') {
          setProfileComplete(true);
        }

        const {
          data: { user },
        } = await supabase.auth.getUser();

        const fromServer = user?.user_metadata?.profile_complete === true;
        if (!cancelled) {
          setProfileComplete(fromServer || cached === 'true');
        }
      } finally {
        if (!cancelled) {
          setProfileCompletionLoading(false);
        }
      }
    };

    const refreshFromAuth = async () => {
      await load();
    };

    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      refreshFromAuth().catch(() => undefined);
    });

    refreshFromAuth().catch(() => undefined);

    return () => {
      cancelled = true;
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const markProfileComplete = async () => {
    await storage.setItem(PROFILE_COMPLETE_KEY, 'true');
    setProfileComplete(true);
  };

  const clearProfileComplete = async () => {
    await storage.removeItem(PROFILE_COMPLETE_KEY);
    setProfileComplete(false);
  };

  return {
    profileComplete,
    profileCompletionLoading,
    markProfileComplete,
    clearProfileComplete,
  };
};
