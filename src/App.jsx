import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { TournamentProvider } from './context/TournamentContext.jsx';
import { AdminAuthProvider, useAdminAuth } from './context/AdminAuthContext.jsx';

import { LandingPage } from './pages/LandingPage.jsx';
import { SportSelectorPage } from './pages/SportSelectorPage.jsx';
import { TournamentListPage } from './pages/TournamentListPage.jsx';
import { TournamentPage } from './pages/TournamentPage.jsx';
import { AdminLoginPage } from './pages/AdminLoginPage.jsx';
import { AdminDashboardPage } from './pages/AdminDashboardPage.jsx';
import { NotFoundPage } from './pages/NotFoundPage.jsx';

/** Redirects to /admin if not authenticated */
function RequireAdmin({ children }) {
  const { isAdmin } = useAdminAuth();
  const location = useLocation();
  if (!isAdmin) {
    return <Navigate to="/admin" state={{ from: location }} replace />;
  }
  return children;
}

export default function App() {
  return (
    <TournamentProvider>
      <AdminAuthProvider>
        <BrowserRouter>
          <Routes>
            {/* ── Public / Viewer routes ─────────────────────── */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/sports" element={<SportSelectorPage />} />
            <Route path="/sports/:sport" element={<TournamentListPage />} />
            <Route path="/sports/:sport/:id" element={<TournamentPage isAdmin={false} />} />

            {/* ── Admin routes ───────────────────────────────── */}
            <Route path="/admin" element={<AdminLoginPage />} />
            <Route
              path="/admin/dashboard"
              element={
                <RequireAdmin>
                  <AdminDashboardPage />
                </RequireAdmin>
              }
            />
            <Route
              path="/admin/:sport/:id"
              element={
                <RequireAdmin>
                  <TournamentPage isAdmin={true} />
                </RequireAdmin>
              }
            />

            {/* ── Catch-all ─────────────────────────────────── */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </AdminAuthProvider>
    </TournamentProvider>
  );
}
