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

  const url = `${API_BASE_URL}/devices/${encodeURIComponent(deviceId)}/settings`;

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

// 🔔 helper: POST to /reset/{deviceId}
async function resetDevice(deviceId: string, session: any): Promise<{ accepted: boolean; topics?: string[]; topic?: string; }> {
  if (!API_BASE_URL)
    throw new Error("Missing API base URL (VITE_API_BASE_URL / REACT_APP_API_BASE_URL).");
  if (!session) throw new Error("No session available (not authenticated).");

  const token = await getBearerToken(session);
  if (!token) throw new Error("Failed to resolve bearer token.");

  // Your API Gateway mapping says "/reset" is added to the base url.
  // Assuming the full path is: POST {API_BASE_URL}/reset/{deviceId}
  const url = `${API_BASE_URL}reset/${encodeURIComponent(deviceId)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    // Body is optional for this lambda; sending a small body keeps future extensibility.
    body: JSON.stringify({ source: "ui" }),
  });

  const text = await res.text().catch(() => "");
  const json = text ? JSON.parse(text) : {};

  if (!res.ok) {
    const msg = json?.error || res.statusText || "Reset request failed";
    throw new Error(`${msg} (${res.status})`);
  }

  return json;
}

export default function DeviceSettingsPage(props: { deviceId: string }) {
  const { deviceId } = props;
  const { session } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<DeviceSettings | null>(null);

  // UI state for reset action
  const [resetBusy, setResetBusy] = useState(false);
  const [resetResult, setResetResult] = useState<string | null>(null);

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

  async function onResetClick() {
    if (!session || resetBusy) return;

    // Simple confirm. Replace with your modal of choice if you have a design system.
    const confirmed = window.confirm(
      `Send RESET command to device "${deviceId}"?\n\nThis will instruct the device to reboot or run its reset routine.`
    );
    if (!confirmed) return;

    setResetBusy(true);
    setResetResult(null);
    try {
      const result = await resetDevice(deviceId, session);
      const topics = result?.topics || (result?.topic ? [result.topic] : []);
      setResetResult(
        topics?.length
          ? `Reset command accepted. Published to: ${topics.join(", ")}`
          : `Reset command accepted.`
      );
    } catch (e: any) {
      setResetResult(`Reset failed: ${e?.message || "Unknown error"}`);
    } finally {
      setResetBusy(false);
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

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={load}
            disabled={loading || !session}
            className="btn btnPrimary"
          >
            {loading ? "Loading..." : "Refresh"}
          </button>

          {/* 🔘 Reset device button */}
          <button
            onClick={onResetClick}
            disabled={!session || resetBusy}
            className="btn btnDanger"
            title="Sends a reset command to the device over MQTT"
          >
            {resetBusy ? "Resetting..." : "Reset Device"}
          </button>
        </div>
      </div>

      <div style={{ height: 14 }} />

      {error ? (
        <div className="inlineError">
          <div style={{ fontWeight: 900, marginBottom: 6 }}>Error</div>
          <div className="muted">{error}</div>
        </div>
      ) : null}

      {resetResult ? (
        <div className="inlineInfo" style={{ marginTop: 12 }}>
          {resetResult}
        </div>
      ) : null}

      <div style={{ height: 14 }} />

      {!settings && !loading ? (
        <div className="card">
          <div className="cardInner muted">
            No settings found for this device.
          </div>
        </div>
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