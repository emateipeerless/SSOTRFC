// src/pages/DeviceSnapshotPage.tsx
import { getBearerToken } from "../auth/getBearerToken";
import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";



/**
* ============
* Types
* ============
*/

export interface RunsPerDayPoint {
day: string; // "YYYY-MM-DD"
runs: number;
}

export interface DeviceSnapshotResponse {
deviceId: string;

monthlyPumpRuns: number;
dailyPumpRuns: number;
averageRunDurationSeconds: number | null;

lastRunTimestamp: string | null;
lastRunDurationSeconds: number | null;

runsLast7Days: RunsPerDayPoint[];

windowDefinition?: {
monthly?: string;
daily?: string;
};
}

/**
* ============
* Config
* ============
* Put your API Gateway base URL in an env var (Vite/CRA examples below).
*
* Vite: VITE_API_BASE_URL="https://xxxxx.execute-api.us-east-1.amazonaws.com"
* CRA: REACT_APP_API_BASE_URL="https://xxxxx.execute-api.us-east-1.amazonaws.com"
*/
const API_BASE_URL = import.meta.env.VITE_API_BASE;

/**
* ============
* Auth token helper (Cognito hosted UI / MSAL -> Cognito brokered auth)
* ============
**/


async function getAccessTokenFromSession(session: any): Promise<string> {
if (!session) throw new Error("No session available (user not authenticated).");

const token = await getBearerToken(session);

if (!token) throw new Error("Failed to resolve bearer token from session.");

return token;
}


/**
* ============
* API call
* ============
*/
async function fetchDeviceSnapshot(deviceId: string, session: any): Promise<DeviceSnapshotResponse> {
if (!API_BASE_URL) {
throw new Error("Missing API base URL (set VITE_API_BASE_URL or REACT_APP_API_BASE_URL).");
}

const token = await getAccessTokenFromSession(session);

const url = `${API_BASE_URL}/devices/${encodeURIComponent(deviceId)}/snapshot`;

const res = await fetch(url, {
method: "GET",
headers: {
Authorization: `Bearer ${token}`,
},
});

if (!res.ok) {
const txt = await res.text().catch(() => "");
throw new Error(`Snapshot fetch failed (${res.status}): ${txt || res.statusText}`);
}

return (await res.json()) as DeviceSnapshotResponse;
}

/**
* ============
* Formatting helpers
* ============
*/
function formatDateTime(iso: string | null): string {
if (!iso) return "—";
const d = new Date(iso);
if (Number.isNaN(d.getTime())) return iso;
return d.toLocaleString();
}

function formatDuration(seconds: number | null): string {
if (seconds === null || seconds === undefined) return "—";
if (seconds < 0) return "—";
const s = Math.floor(seconds);
const hrs = Math.floor(s / 3600);
const mins = Math.floor((s % 3600) / 60);
const secs = s % 60;
if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
if (mins > 0) return `${mins}m ${secs}s`;
return `${secs}s`;
}

/**
* ============
* UI blocks (minimal styling; you’ll overhaul later)
* ============
*/
function StatCard(props: { title: string; value: React.ReactNode; sub?: React.ReactNode; className?: string }) {
return (
<div className={`card statCard ${props.className ?? ""}`.trim()}>
  <div className="cardInner">
    <div className="statTitle">{props.title}</div>
    <div className="statValue">{props.value}</div>
    {props.sub ? <div className="statSub">{props.sub}</div> : null}
  </div>
</div>
);
}

function RunsPerDayBarChart(props: { data: RunsPerDayPoint[] }) {
const safe = props.data ?? [];
const max = Math.max(1, ...safe.map((d) => d.runs));

return (
<div className="card">
  <div className="cardInner">
    <div style={{ fontSize: 14, fontWeight: 900, marginBottom: 10 }}>Runs per day (past 7 days)</div>

    <div className="chartBars">
{safe.map((p) => {
const hPct = (p.runs / max) * 100;
return (
<div key={p.day} className="barCol">
  <div className="barVal">{p.runs}</div>
  <div
    className="bar"
    title={`${p.day}: ${p.runs} runs`}
    style={{
      height: `${hPct}%`,
      minHeight: p.runs > 0 ? 8 : 3,
    }}
  />
  <div className="barLabel">{p.day.slice(5)}</div>
</div>
);
})}
    </div>

    <div className="muted2" style={{ fontSize: 12, marginTop: 10 }}>
      Counts completed runs (stop events / rows with duration) from pump events table.
    </div>
  </div>
</div>
);
}

/**
* ============
* Page
* ============
*/
export default function DeviceSnapshotPage(props: { deviceId: string }) {
const { deviceId } = props;

const { session } = useAuth(); // ✅ same as Sidebar

const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
const [snapshot, setSnapshot] = useState<DeviceSnapshotResponse | null>(null);

async function load() {
if (!session) return; // or show a "please sign in" UI
setLoading(true);
setError(null);

try {
const data = await fetchDeviceSnapshot(deviceId, session);
setSnapshot(data);
} catch (e: any) {
setError(e?.message ?? "Failed to load snapshot");
setSnapshot(null);
} finally {
setLoading(false);
}
}

useEffect(() => {
if (!session) return;
let cancelled = false;

(async () => {
setLoading(true);
setError(null);
try {
const data = await fetchDeviceSnapshot(deviceId, session);
if (!cancelled) setSnapshot(data);
} catch (e: any) {
if (!cancelled) {
setError(e?.message ?? "Failed to load snapshot");
setSnapshot(null);
}
} finally {
if (!cancelled) setLoading(false);
}
})();

return () => {
cancelled = true;
};
}, [deviceId, session]);

const weeklyData = useMemo(() => {
if (!snapshot?.runsLast7Days) return [];
// Ensure exactly 7 points in the UI if backend ever returns fewer
return snapshot.runsLast7Days.slice(-7);
}, [snapshot]);

return (
<div className="page">
  <div className="pageHeader">
    <div>
      <h2 className="pageTitle">Device Snapshot</h2>
      <div className="pageSub">Device: <b>{deviceId}</b></div>
    </div>

    <button
      onClick={load}
      className="btn btnPrimary"
      disabled={loading}
      title="Refetch snapshot"
    >
      {loading ? "Loading..." : "Refresh"}
    </button>
  </div>

{loading ? (
  <div className="muted">Loading snapshot…</div>
) : error ? (
  <div className="inlineError">
    <div style={{ fontWeight: 900, marginBottom: 6 }}>Error</div>
    <div className="muted">{error}</div>
  </div>
) : !snapshot ? (
  <div className="muted">No data.</div>
) : (
<>
  <div className="statsGrid">
    <StatCard
      title="Monthly pump runs"
      value={snapshot.monthlyPumpRuns}
      sub={snapshot.windowDefinition?.monthly ?? "Last 30 days"}
    />

    <StatCard
      title="Daily pump runs"
      value={snapshot.dailyPumpRuns}
      sub={snapshot.windowDefinition?.daily ?? "Last 24 hours"}
    />

    <StatCard
      title="Average run duration"
      value={formatDuration(snapshot.averageRunDurationSeconds)}
      sub="Average of completed runs in monthly window"
    />

    <StatCard
      title="Last run timestamp"
      value={formatDateTime(snapshot.lastRunTimestamp)}
      sub="Most recent completed run"
      className="statCardWide"
    />

    <StatCard
      title="Last run duration"
      value={formatDuration(snapshot.lastRunDurationSeconds)}
      sub="Duration of most recent completed run"
      className="statCardWide"
    />
  </div>

  <div style={{ height: 12 }} />

<RunsPerDayBarChart data={weeklyData} />
</>
)}
</div>
);
}