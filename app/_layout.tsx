import { AuthProvider, useAuth } from "../src/components/AuthProvider";
import { Stack, usePathname, useRouter, useSegments } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useOnboarding } from "../src/hooks/useOnboarding";
import { useProfileCompletion } from "../src/hooks/useProfileCompletion";
import ModelSetupScreen from "../src/components/ModelSetupScreen";
import {
  QwenModelManager,
  getLocalMainPath,
  getLocalMmprojPath,
} from "../src/ai/models/QwenModelManager";
import { SLMModelManager, getLocalSlmPath } from "../src/ai/models/SLMModelManager";
import { useSettingsStore } from "../src/stores/useSettingsStore";
import { SafeAreaProvider } from 'react-native-safe-area-context';

let MMKVImpl: any;
const getMMKV = () => {
  if (!MMKVImpl) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require("react-native-mmkv");
      const Candidate = mod?.MMKV ?? mod?.default?.MMKV ?? mod?.default ?? mod;
      if (typeof Candidate !== "function") {
        throw new Error("react-native-mmkv MMKV export is not a constructor");
      }
      MMKVImpl = Candidate;
    } catch {
      throw new Error("react-native-mmkv is unavailable in this runtime");
    }
  }
  return new MMKVImpl();
};

const SKIPPED_KEY = "models_setup_skipped";
const PATHS_FINGERPRINT_KEY = "models_paths_fingerprint";
const MIN_READY_BYTES = 10 * 1024 * 1024;

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
  const [modelProbeDone, setModelProbeDone] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const startupProbe = async () => {
      try {
        const readyByFlags = QwenModelManager.areModelsReady() && SLMModelManager.isSLMReady();
        const mainPath = getLocalMainPath();
        const mmprojPath = getLocalMmprojPath();
        const slmPath = getLocalSlmPath();

        if (readyByFlags) {
          if (!cancelled) {
            setModelsReadyOverride(true);
            setModelProbeDone(true);
          }
          return;
        }

        let fsAny: any = null;
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          fsAny = require("expo-file-system/legacy");
        } catch {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          fsAny = require("expo-file-system");
        }

        const getSize = async (path: string) => {
          try {
            const info = await fsAny?.getInfoAsync?.(path);
            return typeof info?.size === "number" ? info.size : 0;
          } catch {
            return 0;
          }
        };

        const [mainBytes, mmprojBytes, slmBytes] = await Promise.all([
          getSize(mainPath),
          getSize(mmprojPath),
          getSize(slmPath),
        ]);

        const readyByDiskFallback =
          mainBytes > MIN_READY_BYTES &&
          mmprojBytes > MIN_READY_BYTES &&
          slmBytes > MIN_READY_BYTES;

        try {
          const kv = getMMKV();
          const fingerprint = `${mainPath}|${mmprojPath}|${slmPath}`;
          const previous = kv.getString(PATHS_FINGERPRINT_KEY);
          if (previous !== fingerprint) {
            console.log("Model path fingerprint changed", { previous, fingerprint });
            kv.set(PATHS_FINGERPRINT_KEY, fingerprint);
          }
        } catch {
          // ignore
        }

        if (readyByDiskFallback) {
          await Promise.all([
            QwenModelManager.rehydrateQwenReadyFromDisk(MIN_READY_BYTES).catch(() => false),
            SLMModelManager.rehydrateSlmReadyFromDisk(MIN_READY_BYTES).catch(() => false),
          ]);

          if (!cancelled) {
            setModelsReadyOverride(true);
          }
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) {
          setModelProbeDone(true);
        }
      }
    };

    startupProbe().catch(() => {
      if (!cancelled) setModelProbeDone(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const modelsReady = useMemo(() => {
    return (
      modelsReadyOverride ||
      (QwenModelManager.areModelsReady() && SLMModelManager.isSLMReady())
    );
  }, [modelsReadyOverride]);

  const showModelSetup = modelProbeDone && !skippedModelSetup && !modelsReady;

  useEffect(() => {
    if (!session) {
      lastRedirectToRef.current = null;
    }
  }, [session]);

  useEffect(() => {
    if (showModelSetup || !modelProbeDone) return;
    if (loading || onboardingLoading || profileCompletionLoading) return;

    const safeReplace = (to: string) => {
      if (pathname === to) return;
      if (lastRedirectToRef.current === to) return;
      lastRedirectToRef.current = to;
      router.replace(to);
    };

    const inOnboardingGroup = segments[0] === "onboarding";
    const inAuthGroup = segments[0] === "(auth)";

    if (!session) {
      if (!inAuthGroup) {
        safeReplace("/(auth)/login");
      }
      return;
    }

    if (profileComplete) {
      if (inAuthGroup) {
        safeReplace("/(tabs)/home");
        return;
      }

      if (segments[0] !== "(tabs)") {
        safeReplace("/(tabs)/home");
      }
      return;
    }

    if (!onboardingComplete) {
      if (!inOnboardingGroup) {
        safeReplace("/onboarding/welcome");
      }
      return;
    }

    if (segments[0] !== "(tabs)") {
      safeReplace("/(tabs)/home");
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
    modelProbeDone,
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
    <SafeAreaProvider>
      <AuthProvider>
        <InitialLayout />
      </AuthProvider>
    </SafeAreaProvider>
  );
};

export default RootLayout;
