import { useEffect, useMemo, useState } from "react";


import { useAuth } from "../auth/AuthContext";
import { getBearerToken } from "../auth/getBearerToken";

const API_BASE_URL = import.meta.env.VITE_API_BASE;


type RunEvent = {
  startTimestamp: string; // ISO
  runDurationSeconds: number;
};

type DayBucket = {
  day: string; // YYYY-MM-DD
  events: RunEvent[];
};

type EventsWeekResponse = {
  deviceId: string;
  days: DayBucket[];
};

function formatDuration(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

function formatStartTimeLocal(isoTs: string) {
  const d = new Date(isoTs);
  if (Number.isNaN(d.getTime())) return isoTs;
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function weekdayLabelLocal(dayYYYYMMDD: string) {
  const [y, m, d] = dayYYYYMMDD.split("-").map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
  return dt.toLocaleDateString([], { weekday: "long" }); // "Monday"
}

async function fetchWeekRuns(
  deviceId: string,
  session: any
): Promise<EventsWeekResponse> {
  if (!API_BASE_URL)
    throw new Error(
      "Missing API base URL (VITE_API_BASE_URL / REACT_APP_API_BASE_URL)."
    );
  if (!session) throw new Error("No session available (not authenticated).");

  const token = await getBearerToken(session);
  if (!token) throw new Error("Failed to resolve bearer token.");

  const url = `${API_BASE_URL}/devices/${encodeURIComponent(
    deviceId
  )}/events`;

  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Events fetch failed (${res.status}): ${txt || res.statusText}`);
  }

  return (await res.json()) as EventsWeekResponse;
}

export default function DeviceEventsPage(props: { deviceId: string }) {
  const { deviceId } = props;
  const { session } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<EventsWeekResponse | null>(null);

  async function load() {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await fetchWeekRuns(deviceId, session);
      setData(resp);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load events");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!session) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, deviceId]);

  // ✅ Sort day buckets newest -> oldest, and events within each day newest -> oldest
  const days = useMemo(() => {
    const raw = data?.days ?? [];

    // Copy so we don't mutate server payload
    const dayCopies = raw.map((b) => ({
      day: b.day,
      events: [...(b.events ?? [])],
    }));

    // Sort events within each day by startTimestamp DESC
    for (const b of dayCopies) {
      b.events.sort((a, c) => (a.startTimestamp > c.startTimestamp ? -1 : 1));
    }

    // Sort days by day DESC (YYYY-MM-DD sortable)
    dayCopies.sort((a, b) => (a.day > b.day ? -1 : 1));

    return dayCopies;
  }, [data]);

  return (
    <div style={{ padding: 20, maxWidth: 900, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: 12,
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>Events</h2>
          <div style={{ opacity: 0.75, marginTop: 6 }}>
            Device: <b>{deviceId}</b>
          </div>
          <div style={{ opacity: 0.65, marginTop: 4, fontSize: 12 }}>
            Past 7 days • runs ≥ 60 seconds
          </div>
        </div>

        <button
          onClick={load}
          disabled={loading || !session}
          style={{
            borderRadius: 10,
            padding: "10px 12px",
            border: "1px solid rgba(255,255,255,0.18)",
            background: "transparent",
            color: "inherit",
            cursor: "pointer",
          }}
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      <div style={{ height: 14 }} />

      {error ? (
        <div
          style={{
            padding: 14,
            borderRadius: 12,
            border: "1px solid rgba(255,0,0,0.35)",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Error</div>
          <div style={{ opacity: 0.85 }}>{error}</div>
        </div>
      ) : null}

      <div style={{ height: 10 }} />

      {days.length === 0 && !loading ? (
        <div style={{ opacity: 0.8 }}>No runs in the past week.</div>
      ) : null}

      {days.map((bucket) => {
        const weekday = weekdayLabelLocal(bucket.day);
        return (
          <div
            key={bucket.day}
            style={{
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 12,
              padding: 12,
              background: "rgba(255,255,255,0.04)",
              marginBottom: 12,
            }}
          >
            <div style={{ fontWeight: 800 }}>
              {weekday}{" "}
              <span style={{ opacity: 0.65, fontWeight: 500 }}>
                ({bucket.day})
              </span>
            </div>

            <div style={{ height: 8 }} />

            {bucket.events.length === 0 ? (
              <div style={{ opacity: 0.75, fontSize: 13 }}>No runs.</div>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {bucket.events.map((ev, idx) => (
                  <div
                    key={`${bucket.day}-${ev.startTimestamp}-${idx}`}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      borderTop:
                        idx === 0 ? "none" : "1px solid rgba(255,255,255,0.10)",
                      paddingTop: idx === 0 ? 0 : 8,
                    }}
                  >
                    {/* Event numbering now corresponds to newest-first order */}
                    <div style={{ fontWeight: 700 }}>Event {idx + 1}</div>
                    <div style={{ opacity: 0.85 }}>
                      {formatDuration(ev.runDurationSeconds)}
                    </div>
                    <div style={{ opacity: 0.85 }}>
                      {formatStartTimeLocal(ev.startTimestamp)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}