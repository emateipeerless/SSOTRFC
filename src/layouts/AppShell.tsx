import React from "react";
import { NavLink, Outlet, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import Sidebar from "../pages/Sidebar";

// Placeholder device list (later you’ll pull from API/Dynamo)
const mockDevices = [
  { id: "PUMP-001", name: "Pump 001" },
  { id: "PUMP-002", name: "Pump 002" },
  { id: "PUMP-003", name: "Pump 003" },
];

export default function AppShell() {
  const { session, signOut } = useAuth();
  const params = useParams();

  return (
    <div style={{ height: "100vh", display: "grid", gridTemplateRows: "56px 1fr" }}>
      {/* Topbar */}
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 16px", borderBottom: "1px solid #ddd"
      }}>
        <div style={{ fontWeight: 800 }}>TurfConnect V0.1</div>

        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ opacity: 0.8 }}>
            {session?.name ?? `${session?.provider}:${session?.userId}`}
          </span>
          <button onClick={() => void signOut()}>Sign out</button>
        </div>
      </header>

      {/* Body */}
      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", minHeight: 0 }}>
        {/* Sidebar */}
        <aside style={{ borderRight: "1px solid #ddd", padding: 12, overflow: "auto" }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Sites</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Sidebar/>
          </div>
        </aside>

        {/* Main */}
        <main style={{ padding: 16, overflow: "auto" }}>
          {/* Simple nav buttons for “pages of each device” */}
          {params.deviceId && (
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <NavLink to={`/app/device/${params.deviceId}`} end>Overview</NavLink>
              <NavLink to={`/app/device/${params.deviceId}/trends`}>Trends</NavLink>
              <NavLink to={`/app/device/${params.deviceId}/events`}>Events</NavLink>
              <NavLink to={`/app/device/${params.deviceId}/settings`}>Settings</NavLink>
            </div>
          )}

          <Outlet />
        </main>
      </div>
    </div>
  );
}
