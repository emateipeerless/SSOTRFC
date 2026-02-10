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
    <div className="page page--narrow">
      <div className="pageHeader">
        <div>
          <h2 className="pageTitle">Events</h2>
          <div className="pageSub">
            Device: <b>{deviceId}</b>
          </div>
          <div className="muted2" style={{ marginTop: 6, fontSize: 12 }}>
            Past 7 days • runs ≥ 60 seconds
          </div>
        </div>

        <button
          onClick={load}
          disabled={loading || !session}
          className="btn btnPrimary"
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      <div style={{ height: 14 }} />

      {error ? (
        <div className="inlineError">
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Error</div>
          <div className="muted">{error}</div>
        </div>
      ) : null}

      <div style={{ height: 10 }} />

      {days.length === 0 && !loading ? <div className="muted">No runs in the past week.</div> : null}

      {days.map((bucket) => {
        const weekday = weekdayLabelLocal(bucket.day);
        return (
          <div key={bucket.day} className="card dayCard">
            <div className="cardInner">
            <div style={{ fontWeight: 900 }}>
              {weekday}{" "}
              <span className="muted" style={{ fontWeight: 600 }}>
                ({bucket.day})
              </span>
            </div>

            <div style={{ height: 8 }} />

            {bucket.events.length === 0 ? (
              <div className="muted" style={{ fontSize: 13 }}>No runs.</div>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {bucket.events.map((ev, idx) => (
                  <div
                    key={`${bucket.day}-${ev.startTimestamp}-${idx}`}
                    className="eventRow"
                  >
                    {/* Event numbering now corresponds to newest-first order */}
                    <div className="eventIdx">Test {idx + 1}</div>
                    <div className="muted">{formatDuration(ev.runDurationSeconds)}</div>
                    <div className="muted">{formatStartTimeLocal(ev.startTimestamp)}</div>
                  </div>
                ))}
              </div>
            )}
            </div>
          </div>
        );
      })}
    </div>
  );
}