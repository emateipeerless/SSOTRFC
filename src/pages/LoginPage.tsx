import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function LoginPage() {
  const { session, loading, signInMicrosoft, signInLocal, signUpLocal, confirmLocal } = useAuth();

  // If already authed → go to app
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
    <div className="authWrap">

      {/* ---- APP LOGO ---- */}




      <div className="card authCard">
        <div className="cardInner">
        <div className="logoWrap">
          <img
          src={
            document.documentElement.dataset.theme === "dark"
              ? "/logoD.png"
              : "/logoG.png"
          }
          alt="TurfConnect Logo"
          className="logoL"
        />
        </div>

          <div className="divider" />

          {/* ---- EMAIL/PASSWORD FLOW ---- */}
          <div className="stack">
            <div style={{ fontWeight: 900 }}>Login With Email</div>

            <input
              className="input"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <input
              className="input"
              placeholder="Password"
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
            />

            <button
              className="btn btnPrimaryL"
              onClick={async () => {
                setMsg(null);
                try {
                  await signInLocal(email, pw);
                  nav(returnTo, { replace: true });
                } catch (e) {
                  setMsg(e instanceof Error ? e.message : "Local sign-in failed");
                }
              }}
            >
              Sign in
            </button>
{/*
            <button
              className="btn"
              onClick={async () => {
                setMsg(null);
                try {
                  const step = await signUpLocal(email, pw);
                  if (step === "CONFIRM_REQUIRED") {
                    setNeedsConfirm(true);
                    setMsg("Check email for confirmation code.");
                  } else setMsg("Account created. You can sign in now.");
                } catch (e) {
                  setMsg(e instanceof Error ? e.message : "Sign-up failed");
                }
              }}
            >
              Create account
            </button>

            {needsConfirm && (
              <>
                <input
                  className="input"
                  placeholder="Confirmation code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />

                <button
                  className="btn btnPrimary"
                  onClick={async () => {
                    setMsg(null);
                    try {
                      await confirmLocal(email, code);
                      setNeedsConfirm(false);
                      setMsg("Confirmed. Sign in now.");
                    } catch (e) {
                      setMsg(e instanceof Error ? e.message : "Confirm failed");
                    }
                  }}
                >
                  Confirm account
                </button>
              </>
            )}
*/}
            {msg && <div className="inlineError">{msg}</div>}
          </div>
        </div>
        </div>
        <h3 className="ssolabel">SSO Sign In</h3>
        <div className="dividerD">
         {/* ---- SSO BUTTON ---- */}
          <div className="authActions">

          <button
            className="btn btnPrimary"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              justifyContent: "center",
              fontWeight: 600
            }}
            onClick={async () => await signInMicrosoft()}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 23 23"
              xmlns="http://www.w3.org/2000/svg"
              style={{ display: "block" }}
            >
              <rect width="10" height="10" x="0" y="0" fill="#F25022" />
              <rect width="10" height="10" x="12" y="0" fill="#7FBA00" />
              <rect width="10" height="10" x="0" y="12" fill="#00A4EF" />
              <rect width="10" height="10" x="12" y="12" fill="#FFB900" />
            </svg>
            Login with Microsoft
          </button>

          </div>
            </div>
    </div>
  );
}