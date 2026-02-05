import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { msalInit, tryGetMicrosoftSession } from "../auth/microsoft";
import { useAuth } from "../auth/AuthContext";

export default function AuthCallback() {
  const nav = useNavigate();
  const { session } = useAuth();

  useEffect(() => {
    (async () => {
      // ✅ complete MSAL redirect processing
      await msalInit();

      // If AuthContext already restored session, great.
      // If not, try MSAL directly:
      const ms = tryGetMicrosoftSession();

      if (ms) {
        nav("/app", { replace: true });
      } else {
        // In the rare case restore lags, retry a couple times
        let tries = 1;
        const t = setInterval(() => {
          const ms2 = tryGetMicrosoftSession();
          if (ms2) {
            clearInterval(t);
            nav("/app", { replace: true });
          } else if (--tries <= 0) {
            clearInterval(t);
            nav("/login", { replace: true });
          }
        }, 150);
      }
    })();
  }, [nav, session]);

  return <div style={{ padding: 24, fontFamily: "system-ui" }}>Completing sign-in…</div>;
}