// src/pages/DeviceTrendsPage.tsx
// DROP-IN replacement with theme-reactive Plotly charts.

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { getBearerToken } from "../auth/getBearerToken";
import Plot from "react-plotly.js";

/* ============================
 * Types
 * ============================ */
export interface RmsRow {
  deviceId: string;
  timestamp: string;
  rms: number;
}

export interface AnalogRow {
  deviceId: string;
  timestamp: string;
  an1: number;
  an2: number;
  an3: number;
  an4: number;
}

type DateRangePreset = "24h" | "7d" | "30d" | "custom";

/* ============================
 * Config
 * ============================ */
const API_BASE_URL = import.meta.env.VITE_API_BASE;

/* ============================
 * Helpers
 * ============================ */
function iso(dt: Date) {
  return new Date(dt.getTime() - dt.getMilliseconds())
    .toISOString()
    .replace(".000Z", "Z");
}

function subtract(now: Date, hours: number) {
  return new Date(now.getTime() - hours * 3600 * 1000);
}

function parseIsoSafe(s: string) {
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/* ============================
 * API calls
 * ============================ */
async function fetchJsonWithAuth(url: string, session: any): Promise<any> {
  if (!API_BASE_URL)
    throw new Error("Missing API base URL.");

  if (!session) throw new Error("No session available.");

  const token = await getBearerToken(session);
  if (!token) throw new Error("Failed to resolve bearer token.");

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Request failed (${res.status}): ${txt || res.statusText}`);
  }

  return res.json();
}

async function fetchRmsSeries(
  deviceId: string,
  fromIso: string,
  toIso: string,
  session: any
): Promise<RmsRow[]> {
  const url = `${API_BASE_URL}/devices/PROTO/rms?from=${encodeURIComponent(
    fromIso
  )}&to=${encodeURIComponent(toIso)}`;

  const data = await fetchJsonWithAuth(url, session);
  const items = Array.isArray(data) ? data : data?.items ?? [];

  return items.map((x: any) => ({
    deviceId: x.deviceId ?? x.DeviceID ?? deviceId,
    timestamp: x.timestamp ?? x.Timestamp,
    rms: Number(x.rms ?? x.RMS),
  }));
}

async function fetchAnalogSeries(
  deviceId: string,
  fromIso: string,
  toIso: string,
  session: any
): Promise<AnalogRow[]> {
  const url = `${API_BASE_URL}/devices/TRFCPCB2/analog?from=${encodeURIComponent(
    fromIso
  )}&to=${encodeURIComponent(toIso)}`;

  const data = await fetchJsonWithAuth(url, session);
  const items = Array.isArray(data) ? data : data?.items ?? [];

  return items.map((x: any) => ({
    deviceId: x.deviceId ?? x.DeviceID ?? deviceId,
    timestamp: x.timestamp ?? x.Timestamp,
    an1: Number(x.an1 ?? x.AN1 ?? x["AN1"]),
    an2: Number(x.an2 ?? x.AN2),
    an3: Number(x.an3 ?? x.AN3),
    an4: Number(x.an4 ?? x.AN4),
  }));
}

/* ============================
 * CSS variable helper
 * ============================ */
const css = (v: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(v).trim();

const makePlotLayout = (base: any = {}) => ({
  ...base,
  paper_bgcolor: css("--surface"),
  plot_bgcolor: css("--surface-2"),
  font: { color: css("--text") },

  xaxis: {
    ...(base.xaxis || {}),
    gridcolor: css("--border"),
    zerolinecolor: css("--border"),
    color: css("--text"),
    title: {
      ...(base.xaxis?.title || {}),
      font: { color: css("--text") },
    },
  },

  yaxis: {
    ...(base.yaxis || {}),
    gridcolor: css("--border"),
    zerolinecolor: css("--border"),
    color: css("--text"),
    title: {
      ...(base.yaxis?.title || {}),
      font: { color: css("--text") },
    },
  },

  legend: {
    ...(base.legend || {}),
    font: { color: css("--text") },
  },
});

/* ============================
 * Page Component
 * ============================ */
export default function DeviceTrendsPage(props: { deviceId: string }) {
  const { deviceId } = props;
  const { session } = useAuth();

  /* ----- THEME REACTIVE RE-RENDER KEY ----- */
  const [themeKey, setThemeKey] = useState(
    document.documentElement.dataset.theme || "light"
  );

  useEffect(() => {
    const el = document.documentElement;

    const obs = new MutationObserver(() => {
      setThemeKey(el.dataset.theme || "light");
    });

    obs.observe(el, { attributes: true, attributeFilter: ["data-theme"] });

    return () => obs.disconnect();
  }, []);

  /* ----- Time Range State ----- */
  const [preset, setPreset] = useState<DateRangePreset>("7d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const { fromIso, toIso } = useMemo(() => {
    const now = new Date();

    if (preset === "24h") return { fromIso: iso(subtract(now, 24)), toIso: iso(now) };
    if (preset === "7d") return { fromIso: iso(subtract(now, 24 * 7)), toIso: iso(now) };
    if (preset === "30d") return { fromIso: iso(subtract(now, 24 * 30)), toIso: iso(now) };

    const f = parseIsoSafe(customFrom) ? customFrom : iso(subtract(now, 24 * 7));
    const t = parseIsoSafe(customTo) ? customTo : iso(now);

    return { fromIso: f, toIso: t };
  }, [preset, customFrom, customTo]);

  /* ----- Data Fetching ----- */
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rmsRows, setRmsRows] = useState<RmsRow[]>([]);
  const [analogRows, setAnalogRows] = useState<AnalogRow[]>([]);

  async function load() {
    if (!session) return;
    setLoading(true);
    setError(null);

    try {
      const [rms, analog] = await Promise.all([
        fetchRmsSeries(deviceId, fromIso, toIso, session),
        fetchAnalogSeries(deviceId, fromIso, toIso, session),
      ]);

      rms.sort((a, b) => (a.timestamp < b.timestamp ? -1 : 1));
      analog.sort((a, b) => (a.timestamp < b.timestamp ? -1 : 1));

      setRmsRows(rms);
      setAnalogRows(analog);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load trend data");
      setRmsRows([]);
      setAnalogRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!session) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, deviceId, fromIso, toIso]);

  /* ----- Traces ----- */
  const rmsTrace = useMemo(() => {
    return {
      type: "scatter" as const,
      mode: "lines" as const,
      name: "RMS",
      x: rmsRows.map((r) => r.timestamp),
      y: rmsRows.map((r) => r.rms),
      hovertemplate: "%{x}<br>RMS: %{y}<extra></extra>",
    };
  }, [rmsRows]);

  const analogTraces = useMemo(() => {
    const x = analogRows.map((r) => r.timestamp);
    return [
      {
        type: "scatter" as const,
        mode: "lines",
        name: "AN1",
        x,
        y: analogRows.map((r) => r.an1),
      },
      {
        type: "scatter",
        mode: "lines",
        name: "AN2",
        x,
        y: analogRows.map((r) => r.an2),
      },
      {
        type: "scatter",
        mode: "lines",
        name: "AN3",
        x,
        y: analogRows.map((r) => r.an3),
      },
      {
        type: "scatter",
        mode: "lines",
        name: "AN4",
        x,
        y: analogRows.map((r) => r.an4),
      },
    ];
  }, [analogRows]);

  /* ============================
   * Render
   * ============================ */
  return (
    <div className="page">
      {/* Header */}
      <div className="pageHeader">
        <div>
          <h2 className="pageTitle">Device Trends</h2>
          <div className="pageSub">
            Device: <b>{deviceId}</b>
          </div>
        </div>

        <button onClick={load} disabled={loading || !session} className="btn btnPrimary">
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      <div style={{ height: 14 }} />

      {/* Range Controls */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <label>
          Range:&nbsp;
          <select
            value={preset}
            onChange={(e) => setPreset(e.target.value as DateRangePreset)}
            className="select"
          >
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="custom">Custom</option>
          </select>
        </label>

        {preset === "custom" && (
          <>
            <label>
              From (ISO):&nbsp;
              <input
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                placeholder="2026-02-01T00:00:00Z"
                className="input"
                style={{ width: 220 }}
              />
            </label>

            <label>
              To (ISO):&nbsp;
              <input
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                placeholder="2026-02-09T23:59:59Z"
                className="input"
                style={{ width: 220 }}
              />
            </label>
          </>
        )}

        <div className="muted2" style={{ fontSize: 12 }}>
          Query: <span>{fromIso}</span> → <span>{toIso}</span>
        </div>
      </div>

      <div style={{ height: 14 }} />

      {/* Error */}
      {error && (
        <div className="inlineError">
          <div style={{ fontWeight: 900, marginBottom: 6 }}>Error</div>
          <div className="muted">{error}</div>
        </div>
      )}

      <div style={{ height: 14 }} />

      {/* Analog Graph */}
      <div className="card cardSoft">
        <div className="cardInner">
          <div style={{ fontSize: 14, fontWeight: 900, marginBottom: 8 }}>
            Analog Inputs (Time Series)
          </div>

          <Plot
            key={themeKey}
            data={analogTraces as any}
            layout={makePlotLayout({
              autosize: true,
              height: 420,
              margin: { l: 55, r: 20, t: 10, b: 45 },
              xaxis: { title: { text: "Time" }, type: "date" },
              yaxis: { title: { text: "Value" } },
              legend: { orientation: "h" },
            })}
            config={{
              displaylogo: false,
              responsive: true,
              modeBarButtonsToRemove: ["select2d", "lasso2d"],
            }}
            style={{ width: "100%" }}
          />

          <div className="muted2" style={{ fontSize: 12 }}>
            Source: Analog table (DeviceID, Timestamp, AN1, AN2, AN3, AN4)
          </div>

          {/* RMS Graph */}
          <div className="card" style={{ marginTop: 14 }}>
            <div className="cardInner">
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
                RMS (Vibration Sensor mm/s^2)
              </div>

              <Plot
                key={themeKey + "-rms"}
                data={[rmsTrace]}
                layout={makePlotLayout({
                  autosize: true,
                  height: 360,
                  margin: { l: 55, r: 20, t: 10, b: 45 },
                  xaxis: { title: { text: "Time" }, type: "date" },
                  yaxis: { title: { text: "RMS" } },
                  legend: { orientation: "h" },
                })}
                config={{
                  displaylogo: false,
                  responsive: true,
                  modeBarButtonsToRemove: ["select2d", "lasso2d"],
                }}
                style={{ width: "100%" }}
              />

              <div className="muted2" style={{ fontSize: 12 }}>
                Source: RMS table (DeviceID, timestamp, RMS)
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}