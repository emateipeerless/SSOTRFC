import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { AuthSession } from "./types";
import { loadSession, saveSession } from "./authStore";

import { msalInit, loginMicrosoftRedirect, logoutMicrosoft, tryGetMicrosoftSession } from "./microsoft";
import { loginGoogle, logoutGoogle } from "./google";
import { localLogin, localLogout, localSignUp, localConfirm, tryGetLocalSession } from "./cognitoLocal";

type AuthApi = {
  session: AuthSession | null;
  loading: boolean;

  signInMicrosoft: () => Promise<void>;
  signInGoogle: () => Promise<void>;
  signInLocal: (email: string, password: string) => Promise<void>;

  signUpLocal: (email: string, password: string) => Promise<"CONFIRM_REQUIRED" | "DONE">;
  confirmLocal: (email: string, code: string) => Promise<void>;

  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthApi | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(loadSession());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        await msalInit();

        const ms = tryGetMicrosoftSession();
        if (ms) { setSession(ms); saveSession(ms); return; }

        // Prefer Cognito local restore, then Microsoft restore
        const local = await tryGetLocalSession();
        if (local) { setSession(local); saveSession(local); return; }


        setSession(null);
        saveSession(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const api = useMemo<AuthApi>(() => ({
    session,
    loading,

    signInMicrosoft: async () => {
      await loginMicrosoftRedirect();
    },

    signInGoogle: async () => {
      const s = await loginGoogle();
      setSession(s); saveSession(s);
    },

    signInLocal: async (email, password) => {
      const s = await localLogin(email, password);
      setSession(s); saveSession(s);
    },

    signUpLocal: async (email, password) => {
      return await localSignUp(email, password);
    },

    confirmLocal: async (email, code) => {
      await localConfirm(email, code);
    },

    signOut: async () => {
      if (!session) return;
      if (session.provider === "microsoft") await logoutMicrosoft();
      if (session.provider === "google") await logoutGoogle();
      if (session.provider === "local") await localLogout();
      setSession(null); saveSession(null);
    },
  }), [session, loading]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
}
