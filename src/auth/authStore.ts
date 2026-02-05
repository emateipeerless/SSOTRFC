import type { AuthSession } from "./types";

const KEY = "iot_portal_session_v1";

export function loadSession(): AuthSession | null {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try { return JSON.parse(raw) as AuthSession; }
  catch { localStorage.removeItem(KEY); return null; }
}

export function saveSession(s: AuthSession | null) {
  if (!s) localStorage.removeItem(KEY);
  else localStorage.setItem(KEY, JSON.stringify(s));
}
