import { AuthProvider, useAuth } from "../src/components/AuthProvider";
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { useOnboarding } from "../src/hooks/useOnboarding";

const InitialLayout = () => {
  const { session, loading } = useAuth();
  const { onboardingComplete } = useOnboarding();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;

    if (!onboardingComplete) {
      router.replace("/onboarding/welcome");
      return;
    }

    const inAuthGroup = segments[0] === "(auth)";

    if (session && !inAuthGroup) {
      router.replace("/(tabs)/home");
    } else if (!session) {
      router.replace("/(auth)/login");
    }
  }, [session, loading, onboardingComplete, segments, router]);

  return <Stack />;
};

const RootLayout = () => {
  return (
    <AuthProvider>
      <InitialLayout />
    </AuthProvider>
  );
};

export default RootLayout;
