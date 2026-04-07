import React, { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { supabase } from "../supabase/client";
import { SyncManager } from "../supabase/sync/SyncManager";
import { ReportService } from "../services/ReportService";

WebBrowser.maybeCompleteAuthSession();

export const AuthContext = createContext<any>({});

export const AuthProvider = ({ children }: any) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const didInitialSyncRef = React.useRef(false);

  const signInWithOAuth = async (provider: "google" | "apple") => {
    const redirectTo = Linking.createURL("oauth-callback");

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        skipBrowserRedirect: true,
      },
    });

    if (error) return { data: null, error };
    if (!data?.url) {
      return {
        data: null,
        error: new Error("OAuth URL was not returned from Supabase."),
      };
    }

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

    // If the provider returns to the app, expo-web-browser resolves with success.
    // The actual session exchange is handled in /(auth)/oauth-callback.
    if (result.type !== "success") {
      return {
        data: null,
        error: new Error("OAuth sign-in was cancelled or failed."),
      };
    }

    return { data: result, error: null };
  };

  useEffect(() => {
    const setData = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          setSession(null);
          setUser(null);
          return;
        }

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user?.id && !didInitialSyncRef.current) {
          didInitialSyncRef.current = true;
          SyncManager.onAppOpen(session.user.id).catch(() => undefined);
          ReportService.onAppOpen(session.user.id).catch(() => undefined);
        }
      } catch {
        setSession(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        const uid = session?.user?.id;
        if (uid) {
          // Push metadata-only changes on sign-in.
          SyncManager.onSignIn(uid).catch(() => undefined);
          ReportService.onAppOpen(uid).catch(() => undefined);
        }
      },
    );

    setData();

    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  const value = {
    session,
    user,
    loading,
    signOut: async () => {
      await supabase.auth.signOut();
    },
    signIn: (data: any) => supabase.auth.signInWithPassword(data),
    signUp: (data: any) => supabase.auth.signUp(data),
    signInWithGoogle: () => signInWithOAuth("google"),
    signInWithApple: () => signInWithOAuth("apple"),
    signInWithMagicLink: (email: string) =>
      supabase.auth.signInWithOtp({ email }),
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
