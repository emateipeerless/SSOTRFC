import React, { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function LoginPage() {
  const { session, loading, signInMicrosoft, signInGoogle, signInLocal, signUpLocal, confirmLocal } = useAuth();

  // ✅ if already authed, never sit on /login
  if (!loading && session) return <Navigate to="/app" replace />;

  const nav = useNavigate();
  const loc = useLocation() as any;
  const returnTo = loc.state?.from ?? "/app";


  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [code, setCode] = useState("");
  const [needsConfirm, setNeedsConfirm] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, fontFamily: "system-ui" }}>
      <div style={{ width: 420, border: "1px solid #e5e5e5", borderRadius: 14, padding: 18 }}>
        <h2 style={{ marginTop: 0 }}>Single Sign On</h2>

        <button style={{ width: "100%", padding: 10, marginBottom: 8 }}
          onClick={async () => await signInMicrosoft()}>
          Continue with Microsoft
        </button>

        <button style={{ width: "100%", padding: 10, marginBottom: 16 }}
          onClick={async () => {
            setMsg(null);
            try { await signInGoogle(); nav(returnTo, { replace: true }); }
            catch (e) { setMsg(e instanceof Error ? e.message : "Google sign-in failed (likely not configured yet)."); }
          }}>
          Continue with Google
        </button>

        <div style={{ borderTop: "1px solid #eee", paddingTop: 14 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>TurfConnect Login</div>

          <input style={{ width: "100%", padding: 10, marginBottom: 8 }}
            placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />

          <input style={{ width: "100%", padding: 10, marginBottom: 8 }}
            placeholder="Password" type="password" value={pw} onChange={(e) => setPw(e.target.value)} />

          <button style={{ width: "100%", padding: 10, marginBottom: 8 }}
            onClick={async () => {
              setMsg(null);
              try { await signInLocal(email, pw); nav(returnTo, { replace: true }); }
              catch (e) { setMsg(e instanceof Error ? e.message : "Local sign-in failed"); }
            }}>
            Sign in
          </button>

          <button style={{ width: "100%", padding: 10, marginBottom: 8 }}
            onClick={async () => {
              setMsg(null);
              try {
                const step = await signUpLocal(email, pw);
                if (step === "CONFIRM_REQUIRED") { setNeedsConfirm(true); setMsg("Check email for confirmation code."); }
                else setMsg("Account created. You can sign in now.");
              } catch (e) {
                setMsg(e instanceof Error ? e.message : "Sign-up failed");
              }
            }}>
            Create account
          </button>

          {needsConfirm && (
            <>
              <input style={{ width: "100%", padding: 10, marginBottom: 8 }}
                placeholder="Confirmation code" value={code} onChange={(e) => setCode(e.target.value)} />

              <button style={{ width: "100%", padding: 10 }}
                onClick={async () => {
                  setMsg(null);
                  try { await confirmLocal(email, code); setNeedsConfirm(false); setMsg("Confirmed. Sign in now."); }
                  catch (e) { setMsg(e instanceof Error ? e.message : "Confirm failed"); }
                }}>
                Confirm account
              </button>
            </>
          )}

          {msg && <div style={{ marginTop: 10, color: "#b00020" }}>{msg}</div>}
        </div>
      </div>
    </div>
  );
}
