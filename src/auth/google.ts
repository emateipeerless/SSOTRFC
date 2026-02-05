import type { AuthSession } from "./types";

declare global { interface Window { google?: any; } }

function mustEnv(name: string): string {
  const v = (import.meta.env as Record<string, unknown>)[name];
  if (!v || typeof v !== "string") throw new Error(`Missing env var: ${name}`);
  return v;
}

function waitForGoogle(timeoutMs = 7000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const t = setInterval(() => {
      if (window.google?.accounts?.id) { clearInterval(t); resolve(); }
      else if (Date.now() - start > timeoutMs) { clearInterval(t); reject(new Error("Google script not loaded")); }
    }, 50);
  });
}

function decodeJwtPayload(idToken: string): any {
  const payload = idToken.split(".")[1];
  const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
  return JSON.parse(json);
}

export async function loginGoogle(): Promise<AuthSession> {
  await waitForGoogle();
  const clientId = mustEnv("VITE_GOOGLE_CLIENT_ID");

  return new Promise<AuthSession>((resolve, reject) => {
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (resp: { credential?: string }) => {
        if (!resp.credential) return reject(new Error("No Google credential returned"));
        const claims = decodeJwtPayload(resp.credential);
        resolve({
          provider: "google",
          userId: claims.sub,
          email: claims.email,
          name: claims.name,
          idToken: resp.credential,
        });
      },
    });

    // shows OneTap/popup depending on browser state
    window.google.accounts.id.prompt();
  });
}

export async function logoutGoogle(): Promise<void> {
  await waitForGoogle();
  window.google.accounts.id.disableAutoSelect();
}
