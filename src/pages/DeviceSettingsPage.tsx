import React, { useEffect, useState } from "react";

// ✅ adjust to your project
import { useAuth } from "../auth/AuthContext";
import { getBearerToken } from "../auth/getBearerToken";

const API_BASE_URL = import.meta.env.VITE_API_BASE;


export type DeviceSettings = {
  deviceId: string;
  deviceName?: string | null;
  FW?: string | null;
  description?: string | null;
};

async function fetchDeviceSettings(
  deviceId: string,
  session: any
): Promise<DeviceSettings> {
  if (!API_BASE_URL)
    throw new Error(
      "Missing API base URL (VITE_API_BASE_URL / REACT_APP_API_BASE_URL)."
    );
  if (!session) throw new Error("No session available (not authenticated).");

  const token = await getBearerToken(session);
  if (!token) throw new Error("Failed to resolve bearer token.");

  const url = `${API_BASE_URL}/devices/${encodeURIComponent(
    deviceId
  )}/settings`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(
      `Settings fetch failed (${res.status}): ${txt || res.statusText}`
    );
  }

  const data = await res.json();
  const item = data?.item ?? data;

  return {
    deviceId: item.deviceId ?? item.DeviceId ?? item.DeviceID ?? deviceId,
    deviceName: item.deviceName ?? item.DeviceName ?? null,
    FW: item.FW ?? item.fw ?? item.firmware ?? null,
    description: item.description ?? item.Description ?? null,
  };
}

function FieldRow(props: { label: string; value?: React.ReactNode }) {
  return (
    <div className="kv">
      <div className="kvLabel">{props.label}</div>
      <div className="kvValue">{props.value ?? "—"}</div>
    </div>
  );
}

export default function DeviceSettingsPage(props: { deviceId: string }) {
  const { deviceId } = props;
  const { session } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<DeviceSettings | null>(null);

  async function load() {
    if (!session) return;
    setLoading(true);
    setError(null);

    try {
      const s = await fetchDeviceSettings(deviceId, session);
      setSettings(s);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load device settings");
      setSettings(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!session) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, deviceId]);

  return (
    <div className="page page--narrow">
      <div className="pageHeader">
        <div>
          <h2 className="pageTitle">Device Settings</h2>
          <div className="pageSub">
            Device: <b>{deviceId}</b>
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
          <div style={{ fontWeight: 900, marginBottom: 6 }}>Error</div>
          <div className="muted">{error}</div>
        </div>
      ) : null}

      <div style={{ height: 14 }} />

      {!settings && !loading ? (
        <div className="card"><div className="cardInner muted">No settings found for this device.</div></div>
      ) : null}

      {settings ? (
        <div className="card cardSoft">
          <div className="cardInner">
          <div style={{ fontWeight: 900, marginBottom: 6 }}>Info</div>

          <FieldRow label="Device ID" value={settings.deviceId} />
          <FieldRow label="Device Name" value={settings.deviceName ?? "—"} />
          <FieldRow label="Firmware (FW)" value={settings.FW ?? "—"} />
          <FieldRow label="Description" value={settings.description ?? "—"} />
          </div>
        </div>
      ) : null}
    </div>
  );
}