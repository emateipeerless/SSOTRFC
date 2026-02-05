import { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { getBearerToken } from "../auth/getBearerToken";

const API_BASE = import.meta.env.VITE_API_BASE;

type Device = { deviceId: string; role?: string; siteId?: string };
type Site = { siteId: string; siteName?: string };

export default function Sidebar() {
  const { session } = useAuth();

  const [sites, setSites] = useState<Site[]>([]);
  const [devicesBySite, setDevicesBySite] = useState<Record<string, Device[]>>({});
  const [openSites, setOpenSites] = useState<Set<string>>(new Set());

  const [loadingSites, setLoadingSites] = useState(true);
  const [loadingSiteDevices, setLoadingSiteDevices] = useState<Record<string, boolean>>({});
  const [errorsBySite, setErrorsBySite] = useState<Record<string, string | undefined>>({});

  // Persisted cache toggle
  const ENABLE_PERSIST = true;
  const CACHE_KEY = "sidebar.devicesBySite.v1";

  // A ref to keep a stable auth token during the burst of prefetch calls
  const tokenRef = useRef<string | null>(null);

  // -----------------------
  // 1) Fetch all user sites
  // -----------------------
  useEffect(() => {
    if (!session) return;

    (async () => {
      setLoadingSites(true);

      // Load any persisted device cache early (optimistic paint)
      if (ENABLE_PERSIST) {
        try {
          const raw = localStorage.getItem(CACHE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw) as Record<string, Device[]>;
            setDevicesBySite(parsed);
          }
        } catch {}
      }

      const token = await getBearerToken(session);
      tokenRef.current = token;

      const res = await fetch(`${API_BASE}sites`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      setSites(data.sites ?? []);
      setLoadingSites(false);
    })();
  }, [session]);

  // ----------------------------------------
  // 2) Prefetch devices for ALL sites up-front
  //    Runs after sites load; caches results
  // ----------------------------------------
  useEffect(() => {
    if (!session || sites.length === 0) return;

    // Compute which sites still need devices
    const missing = sites
      .map((s) => s.siteId)
      .filter((id) => !(id in devicesBySite));

    if (missing.length === 0) return;

    const aborter = new AbortController();

    // Simple concurrency control (e.g., 4 at a time)
    const CONCURRENCY = 4;
    let index = 0;

    const runBatch = async () => {
      const token = tokenRef.current ?? (await getBearerToken(session));
      const workers: Promise<void>[] = [];

      for (let i = 0; i < CONCURRENCY && index < missing.length; i++, index++) {
        const siteId = missing[index];

        // mark loading
        setLoadingSiteDevices((prev) => ({ ...prev, [siteId]: true }));

        const p = (async () => {
          try {
            const res = await fetch(`${API_BASE}devices?siteId=${encodeURIComponent(siteId)}`, {
              headers: { Authorization: `Bearer ${token}` },
              signal: aborter.signal,
            });

            if (!res.ok) {
              const text = await res.text();
              throw new Error(`HTTP ${res.status}: ${text}`);
            }

            const data = await res.json();
            const devices = (data?.devices ?? []) as Device[];

            // Update cache in-memory
            setDevicesBySite((prev) => {
              const next = { ...prev, [siteId]: devices };
              // Persist to localStorage to make next render instant on revisit
              if (ENABLE_PERSIST) {
                try {
                  localStorage.setItem(CACHE_KEY, JSON.stringify(next));
                } catch {}
              }
              return next;
            });

            // Clear any previous error
            setErrorsBySite((prev) => ({ ...prev, [siteId]: undefined }));
          } catch (err: any) {
            setErrorsBySite((prev) => ({
              ...prev,
              [siteId]: err?.message ?? "Failed to load devices",
            }));
          } finally {
            setLoadingSiteDevices((prev) => ({ ...prev, [siteId]: false }));
          }
        })();

        workers.push(p);
      }

      await Promise.allSettled(workers);

      // Keep launching batches until all are done
      if (index < missing.length) {
        await runBatch();
      }
    };

    runBatch();

    return () => aborter.abort();
    // Intentionally NOT depending on devicesBySite to avoid infinite loops.
    // We only kick this off when `sites` updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sites, session]);

  // -----------------------------------
  // 3) Toggle expands/collapses only.
  //    Fetch is already done by prefetch.
  // -----------------------------------
  function toggleSite(siteId: string) {
    const newOpen = new Set(openSites);
    if (newOpen.has(siteId)) newOpen.delete(siteId);
    else newOpen.add(siteId);
    setOpenSites(newOpen);

    // If prefetch somehow missed, do a just-in-time fetch as fallback
    if (!devicesBySite[siteId] && !loadingSiteDevices[siteId]) {
      void fetchSiteDevicesOnDemand(siteId);
    }
  }

  // Fallback JIT fetch (rarely used because of prefetch)
  async function fetchSiteDevicesOnDemand(siteId: string) {
    setLoadingSiteDevices((prev) => ({ ...prev, [siteId]: true }));
    try {
      const token = tokenRef.current ?? (await getBearerToken(session!));
      const res = await fetch(`${API_BASE}devices?siteId=${encodeURIComponent(siteId)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setDevicesBySite((prev) => {
        const next = { ...prev, [siteId]: data.devices ?? [] };
        if (ENABLE_PERSIST) {
          try {
            localStorage.setItem(CACHE_KEY, JSON.stringify(next));
          } catch {}
        }
        return next;
      });
    } catch (e) {
      setErrorsBySite((prev) => ({ ...prev, [siteId]: "Failed to load devices" }));
    } finally {
      setLoadingSiteDevices((prev) => ({ ...prev, [siteId]: false }));
    }
  }

  // -----------------------
  // UI
  // -----------------------
  if (loadingSites) return <div>Loading sites...</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {sites.map((s) => {
        const isOpen = openSites.has(s.siteId);
        const devices = devicesBySite[s.siteId];

        return (
          <div key={s.siteId} style={{ paddingBottom: 8, borderBottom: "1px solid #eee" }}>
            {/* Site title row */}
            <button
              onClick={() => toggleSite(s.siteId)}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "6px 8px",
                fontSize: 15,
                fontWeight: 600,
                background: "transparent",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span
                style={{
                  transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
                  transition: "0.15s",
                  display: "inline-block",
                }}
              >
                ▶
              </span>
              {s.siteName ?? s.siteId}
            </button>

            {/* Devices section */}
            {isOpen && (
              <div style={{ paddingLeft: 20, paddingTop: 4, display: "flex", flexDirection: "column", gap: 4 }}>
                {/* Loading state */}
                {loadingSiteDevices[s.siteId] && <div style={{ color: "#888" }}>Loading devices...</div>}

                {/* Error state */}
                {errorsBySite[s.siteId] && (
                  <div style={{ color: "#c00" }}>
                    {errorsBySite[s.siteId]}{" "}
                    <button
                      onClick={() => fetchSiteDevicesOnDemand(s.siteId)}
                      style={{ marginLeft: 8, cursor: "pointer", border: "1px solid #ccc", borderRadius: 4, padding: "2px 6px" }}
                    >
                      Retry
                    </button>
                  </div>
                )}

                {/* Loaded devices */}
                {devices &&
                  devices.map((d) => (
                    <NavLink
                      key={d.deviceId}
                      to={`/app/device/${d.deviceId}`}
                      style={({ isActive }) => ({
                        padding: "6px 8px",
                        borderRadius: 6,
                        textDecoration: "none",
                        background: isActive ? "rgba(0,90,255,0.12)" : "transparent",
                        color: isActive ? "#0044ff" : "#333",
                      })}
                    >
                      {d.deviceId}
                    </NavLink>
                  ))}

                {/* No devices */}
                {devices && devices.length === 0 && <div style={{ color: "#888" }}>No devices</div>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}