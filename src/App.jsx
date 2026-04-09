import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { TournamentProvider, useTournamentContext } from './context/TournamentContext.jsx';
import { AdminAuthProvider, useAdminAuth } from './context/AdminAuthContext.jsx';
import { ScorekeeperProvider, useScorekeeperAuth } from './context/ScorekeeperContext.jsx';
import { StatEdgeIcon } from './components/ui/StatEdgeLogo.jsx';

import { LandingPage } from './pages/LandingPage.jsx';
import { SportSelectorPage } from './pages/SportSelectorPage.jsx';
import { TournamentListPage } from './pages/TournamentListPage.jsx';
import { TournamentPage } from './pages/TournamentPage.jsx';
import { AdminLoginPage } from './pages/AdminLoginPage.jsx';
import { AdminDashboardPage } from './pages/AdminDashboardPage.jsx';
import { NotFoundPage } from './pages/NotFoundPage.jsx';
import { ScorekeeperLoginPage } from './pages/ScorekeeperLoginPage.jsx';
import { ScorekeeperDashboardPage } from './pages/ScorekeeperDashboardPage.jsx';
import { LiveScorecardPage } from './pages/LiveScorecardPage.jsx';
import { TemplateListPage } from './pages/TemplateListPage.jsx';
import { TemplateBuilderPage } from './pages/TemplateBuilderPage.jsx';

/** Full-screen loading spinner shown while Supabase hydrates */
function DbLoadingScreen() {
  const { dbReady } = useTournamentContext();
  if (dbReady) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'var(--color-bg)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 'var(--space-4)',
    }}>
      <StatEdgeIcon size={52} />
      <div style={{
        width: 40, height: 4, borderRadius: 2,
        background: 'var(--color-border)',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', width: '40%',
          background: 'var(--brand-orange)',
          borderRadius: 2,
          animation: 'db-loading-bar 1.2s ease-in-out infinite',
        }} />
      </div>
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
        Loading tournaments…
      </p>
      <style>{`
        @keyframes db-loading-bar {
          0%   { transform: translateX(-100%); }
          50%  { transform: translateX(150%); }
          100% { transform: translateX(150%); }
        }
      `}</style>
    </div>
  );
}

/** Redirects to /admin if not authenticated */
function RequireAdmin({ children }) {
  const { isAdmin } = useAdminAuth();
  const location = useLocation();
  if (!isAdmin) {
    return <Navigate to="/admin" state={{ from: location }} replace />;
  }
  return children;
}

/** Redirects to /scorekeeper if not logged in as scorekeeper */
function RequireScorekeeper({ children }) {
  const { isLoggedIn } = useScorekeeperAuth();
  const location = useLocation();
  if (!isLoggedIn) {
    return <Navigate to="/scorekeeper" state={{ from: location }} replace />;
  }
  return children;
}

export default function App() {
  return (
    <TournamentProvider>
      <AdminAuthProvider>
        <ScorekeeperProvider>
          <BrowserRouter>
            <DbLoadingScreen />
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

              {/* ── Admin scorecard + template routes ──────────── */}
              <Route
                path="/admin/templates"
                element={
                  <RequireAdmin>
                    <TemplateListPage />
                  </RequireAdmin>
                }
              />
              <Route
                path="/admin/templates/:id"
                element={
                  <RequireAdmin>
                    <TemplateBuilderPage />
                  </RequireAdmin>
                }
              />
              <Route
                path="/admin/scorecard/:tournamentId/:fixtureId"
                element={
                  <RequireAdmin>
                    <LiveScorecardPage isAdmin={true} />
                  </RequireAdmin>
                }
              />

              {/* ── Scorekeeper routes ──────────────────────────── */}
              <Route path="/scorekeeper" element={<ScorekeeperLoginPage />} />
              <Route
                path="/scorekeeper/dashboard"
                element={
                  <RequireScorekeeper>
                    <ScorekeeperDashboardPage />
                  </RequireScorekeeper>
                }
              />
              <Route
                path="/scorekeeper/match/:tournamentId/:fixtureId"
                element={
                  <RequireScorekeeper>
                    <LiveScorecardPage isAdmin={false} />
                  </RequireScorekeeper>
                }
              />

              {/* ── Catch-all ─────────────────────────────────── */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </BrowserRouter>
        </ScorekeeperProvider>
      </AdminAuthProvider>
    </TournamentProvider>
  );
}
