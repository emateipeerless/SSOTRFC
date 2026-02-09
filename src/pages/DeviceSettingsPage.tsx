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
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "180px 1fr",
        gap: 10,
        padding: "10px 0",
        borderTop: "1px solid rgba(255,255,255,0.10)",
      }}
    >
      <div style={{ opacity: 0.75 }}>{props.label}</div>
      <div style={{ fontWeight: 700 }}>{props.value ?? "—"}</div>
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
          <h2 style={{ margin: 0 }}>Device Settings</h2>
          <div style={{ opacity: 0.75, marginTop: 6 }}>
            Device: <b>{deviceId}</b>
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

      <div style={{ height: 14 }} />

      {!settings && !loading ? (
        <div
          style={{
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 12,
            padding: 12,
            background: "rgba(255,255,255,0.04)",
            opacity: 0.85,
          }}
        >
          No settings found for this device.
        </div>
      ) : null}

      {settings ? (
        <div
          style={{
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 12,
            padding: 12,
            background: "rgba(255,255,255,0.04)",
          }}
        >
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Info</div>

          <FieldRow label="Device ID" value={settings.deviceId} />
          <FieldRow label="Device Name" value={settings.deviceName ?? "—"} />
          <FieldRow label="Firmware (FW)" value={settings.FW ?? "—"} />
          <FieldRow label="Description" value={settings.description ?? "—"} />
        </div>
      ) : null}
    </div>
  );
}