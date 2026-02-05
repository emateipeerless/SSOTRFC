import { Routes, Route, Navigate } from "react-router-dom";

import LoginPage from "./pages/LoginPage";
import AuthCallback from "./pages/AuthCallback";
import RequireAuth from "./auth/RequireAuth";
import AppShell from "./layouts/AppShell";
import Dashboard from "./pages/Dashboard";
import DevicePage from "./pages/DevicePage";

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

        <Route path="device/:deviceId" element={<DevicePage />} />
        <Route path="device/:deviceId/trends" element={<div>Trends (placeholder)</div>} />
        <Route path="device/:deviceId/events" element={<div>Events (placeholder)</div>} />
        <Route path="device/:deviceId/settings" element={<div>Settings (placeholder)</div>} />
      </Route>

      <Route path="/" element={<Navigate to="/app" replace />} />
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  );
}
