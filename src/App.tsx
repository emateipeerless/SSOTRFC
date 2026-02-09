import { Routes, Route, Navigate } from "react-router-dom";

import LoginPage from "./pages/LoginPage";
import AuthCallback from "./pages/AuthCallback";
import RequireAuth from "./auth/RequireAuth";
import AppShell from "./layouts/AppShell";
import Dashboard from "./pages/Dashboard";
import DeviceSnapshotRoute from "./routes/DeviceSnapshotRoute";
import DeviceTrendsRoute from "./routes/DeviceTrendsRoute";
import DeviceEventRoute from "./routes/DeviceEventRoute";
import DeviceSettingsRoute from "./routes/DeviceSettingsRoute";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallback />} />

      <Route
        path="/app"
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route index element={<Dashboard />} />

        <Route path="device/:deviceId" element={<DeviceSnapshotRoute />} />
        <Route path="device/:deviceId/trends" element={<DeviceTrendsRoute/>} />
        <Route path="device/:deviceId/events" element={<DeviceEventRoute/>} />
        <Route path="device/:deviceId/settings" element={<DeviceSettingsRoute/>} />
      </Route>

      <Route path="/" element={<Navigate to="/app" replace />} />
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  );
}
