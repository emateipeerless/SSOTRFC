export type AuthProvider = "microsoft" | "google" | "local";

export type AuthSession = {
  provider: AuthProvider;
  userId: string;   // stable per provider
  email?: string;
  name?: string;

  idToken?: string;     // optional
  accessToken?: string; // optional
};
