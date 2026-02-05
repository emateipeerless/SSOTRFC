import { PublicClientApplication } from "@azure/msal-browser";
import type { AuthSession } from "./types";

function mustEnv(name: string): string {
  const v = (import.meta.env as Record<string, unknown>)[name];
  if (!v || typeof v !== "string") throw new Error(`Missing env var: ${name}`);
  return v;
}

export const msal = new PublicClientApplication({
  auth: {
    clientId: mustEnv("VITE_MSAL_CLIENT_ID"),
    authority: mustEnv("VITE_MSAL_AUTHORITY"),
    redirectUri: mustEnv("VITE_MSAL_REDIRECT_URI"), // keep /auth/callback
  },
  cache: { cacheLocation: "localStorage" },
});

let initialized = false;

export async function msalInit(): Promise<void> {
  if (initialized) return;
  initialized = true;

  await msal.initialize();

  // This completes the redirect login on return
  const result = await msal.handleRedirectPromise();
  if (result?.account) msal.setActiveAccount(result.account);
}

export async function loginMicrosoftRedirect(): Promise<void> {
  await msalInit();
  await msal.loginRedirect({
    scopes: ["openid", "profile", "email"],
    prompt: "select_account",
  });
}

export async function logoutMicrosoft(): Promise<void> {
  await msalInit();
  const acct = msal.getActiveAccount() ?? msal.getAllAccounts()[0];
  await msal.logoutRedirect(acct ? { account: acct } : undefined);
}

export function tryGetMicrosoftSession(): AuthSession | null {
  const acct = msal.getActiveAccount() ?? msal.getAllAccounts()[0];
  if (!acct) return null;

  return {
    provider: "microsoft",
    userId: acct.homeAccountId,
    email: acct.username,
    name: acct.name ?? undefined,
  };
}