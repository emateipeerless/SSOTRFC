import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import Sidebar from "../pages/Sidebar";

type ThemeMode = "light" | "dark";

function getInitialTheme(): ThemeMode {
  const stored = (localStorage.getItem("ui.theme") || "").toLowerCase();
  if (stored === "dark" || stored === "light") return stored;
  // Default to system preference
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export default function AppShell() {
  const { session, signOut } = useAuth();
  const params = useParams();

  const [theme, setTheme] = useState<ThemeMode>(() => getInitialTheme());

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("ui.theme", theme);
  }, [theme]);

  const userLabel = useMemo(
    () => session?.name ?? `${session?.provider}:${session?.userId}`,
    [session?.name, session?.provider, session?.userId]
  );

  return (
    <div className="shell">
      {/* Topbar */}
      <header className="topbar">
      <div className="brand">
        <img
          src={theme === "dark" ? "/logoD.png" : "/logoD.png"}
          alt="TurfConnect Logo"
          className="brandLogo"
        />
        <span className="badge">V0.1</span>
      </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button
            className="btn btn--ghostL"
            onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
            aria-label="Toggle theme"
            title="Toggle theme"
          >
            {theme === "dark" ? "Light" : "Dark"}
          </button>

          <span style={{ maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--mutedlab)" }}>
            {userLabel}
          </span>

          <button className="btn" onClick={() => void signOut()}>
            Sign out
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="shellBody">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sidebarInner">
            <div className="sidebarTitle">Sites</div>
            <Sidebar />
          </div>
        </aside>

        {/* Main */}
        <main className="main">
          {/* Secondary nav (device pages) — below header, aligned to the right of sidebar */}
          {params.deviceId && (
            <div className="mainSubbar">
              <nav className="deviceTabs" aria-label="Device navigation">
                <NavLink
                  to={`/app/device/${params.deviceId}`}
                  end
                  className={({ isActive }) => `tabLink ${isActive ? "tabLinkActive" : ""}`}
                >
                  Overview
                </NavLink>
                <NavLink
                  to={`/app/device/${params.deviceId}/trends`}
                  className={({ isActive }) => `tabLink ${isActive ? "tabLinkActive" : ""}`}
                >
                  Trends
                </NavLink>
                <NavLink
                  to={`/app/device/${params.deviceId}/events`}
                  className={({ isActive }) => `tabLink ${isActive ? "tabLinkActive" : ""}`}
                >
                  Events
                </NavLink>
                <NavLink
                  to={`/app/device/${params.deviceId}/settings`}
                  className={({ isActive }) => `tabLink ${isActive ? "tabLinkActive" : ""}`}
                >
                  Settings
                </NavLink>
              </nav>
            </div>
          )}

          <div className="mainInner">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
