import { AuthProvider, useAuth } from "../src/components/AuthProvider";
import { Stack, usePathname, useRouter, useSegments } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useOnboarding } from "../src/hooks/useOnboarding";
import { useProfileCompletion } from "../src/hooks/useProfileCompletion";
import ModelSetupScreen from "../src/components/ModelSetupScreen";
import { QwenModelManager } from "../src/ai/models/QwenModelManager";
import { SLMModelManager } from "../src/ai/models/SLMModelManager";
import { useSettingsStore } from "../src/stores/useSettingsStore";

let MMKVImpl: any;
const getMMKV = () => {
  if (!MMKVImpl) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require("react-native-mmkv");
    MMKVImpl = mod?.MMKV ?? mod?.default ?? mod;
  }
  return new MMKVImpl();
};

const SKIPPED_KEY = "models_setup_skipped";

const InitialLayout = () => {
  const pathname = usePathname();
  const { session, loading } = useAuth();
  const { onboardingComplete, onboardingLoading } = useOnboarding(pathname);
  const { profileComplete, profileCompletionLoading } = useProfileCompletion();
  const router = useRouter();
  const segments = useSegments() as string[];
  const lastRedirectToRef = useRef<string | null>(null);
  const [skippedModelSetup, setSkippedModelSetup] = useState(() => {
    try {
      const kv = getMMKV();
      return kv.getBoolean(SKIPPED_KEY) === true;
    } catch {
      return false;
    }
  });
  const [modelsReadyOverride, setModelsReadyOverride] = useState(false);

  const modelsReady = useMemo(() => {
    return (
      modelsReadyOverride ||
      (QwenModelManager.areModelsReady() && SLMModelManager.isSLMReady())
    );
  }, [modelsReadyOverride]);

  const showModelSetup = !skippedModelSetup && !modelsReady;

  useEffect(() => {
    if (showModelSetup) return;
    if (loading || onboardingLoading || profileCompletionLoading) return;

    const safeReplace = (to: string) => {
      if (pathname === to) return;
      if (lastRedirectToRef.current === to) return;
      lastRedirectToRef.current = to;
      router.replace(to);
    };

    const inOnboardingGroup = segments[0] === "onboarding";
    const inAuthGroup = segments[0] === "(auth)";

    if (!onboardingComplete) {
      if (!inOnboardingGroup) {
        safeReplace("/onboarding/welcome");
      }
      return;
    }

    if (session) {
      if (!profileComplete) {
        const authRoute = segments[1];
        if (segments[0] !== "(auth)" || authRoute !== "complete-profile") {
          safeReplace("/(auth)/complete-profile");
        }
        return;
      }

      if (inAuthGroup) {
        safeReplace("/(tabs)/home");
        return;
      }

      if (segments[0] !== "(tabs)") {
        safeReplace("/(tabs)/home");
      }
    } else {
      if (!inAuthGroup) {
        safeReplace("/(auth)/login");
      }
    }
  }, [
    session,
    loading,
    onboardingLoading,
    onboardingComplete,
    profileCompletionLoading,
    profileComplete,
    segments,
    pathname,
    router,
    showModelSetup,
  ]);

  if (showModelSetup) {
    return (
      <ModelSetupScreen
        onComplete={() => {
          setModelsReadyOverride(true);
        }}
        onSkip={() => {
          try {
            const kv = getMMKV();
            kv.set(SKIPPED_KEY, true);
          } catch {
            // ignore
          }
          setSkippedModelSetup(true);
        }}
      />
    );
  }

  return <Stack />;
};

const RootLayout = () => {
  const hydrate = useSettingsStore((s) => s.hydrate);

  useEffect(() => {
    hydrate().catch(() => undefined);
  }, [hydrate]);

  return (
    <AuthProvider>
      <InitialLayout />
    </AuthProvider>
  );
};

export default RootLayout;
