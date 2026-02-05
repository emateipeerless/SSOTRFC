import { Amplify } from "aws-amplify";
import {
  signIn, signOut, signUp, confirmSignUp,
  getCurrentUser, fetchAuthSession
} from "aws-amplify/auth";
import type { AuthSession } from "./types";

function mustEnv(name: string): string {
  const v = (import.meta.env as Record<string, unknown>)[name];
  if (!v || typeof v !== "string") throw new Error(`Missing env var: ${name}`);
  return v;
}

let configured = false;
function ensureConfigured() {
  if (configured) return;
  configured = true;
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: mustEnv("VITE_COGNITO_USER_POOL_ID"),
        userPoolClientId: mustEnv("VITE_COGNITO_APP_CLIENT_ID"),
      },
    },
  });
}

export async function localSignUp(email: string, password: string): Promise<"CONFIRM_REQUIRED" | "DONE"> {
  ensureConfigured();
  const res = await signUp({ username: email, password, options: { userAttributes: { email } } });
  return res.nextStep?.signUpStep && res.nextStep.signUpStep !== "DONE" ? "CONFIRM_REQUIRED" : "DONE";
}

export async function localConfirm(email: string, code: string): Promise<void> {
  ensureConfigured();
  await confirmSignUp({ username: email, confirmationCode: code });
}

export async function localLogin(email: string, password: string): Promise<AuthSession> {
  ensureConfigured();
  await signIn({ username: email, password });
  const u = await getCurrentUser();
  const s = await fetchAuthSession();
  return {
    provider: "local",
    userId: u.userId,
    email,
    idToken: s.tokens?.idToken?.toString(),
    accessToken: s.tokens?.accessToken?.toString(),
  };
}

export async function localLogout(): Promise<void> {
  ensureConfigured();
  await signOut({ global: true });
}

export async function tryGetLocalSession(): Promise<AuthSession | null> {
  try {
    ensureConfigured();
    const u = await getCurrentUser();
    const s = await fetchAuthSession();
    return {
      provider: "local",
      userId: u.userId,
      email: u.username,
      idToken: s.tokens?.idToken?.toString(),
      accessToken: s.tokens?.accessToken?.toString(),
    };
  } catch {
    return null;
  }
}
