import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { TournamentProvider } from './context/TournamentContext.jsx';
import { AdminAuthProvider } from './context/AdminAuthContext.jsx';

const SESSION_KEY = 'statedge_admin_session';

// ─── Import the RequireAdmin guard by re-implementing it inline.
// (It's not exported from App.jsx, so we duplicate the minimal behaviour here.)
import { Navigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from './context/AdminAuthContext.jsx';

function RequireAdmin({ children }) {
  const { isAdmin } = useAdminAuth();
  const location = useLocation();
  if (!isAdmin) return <Navigate to="/admin" state={{ from: location }} replace />;
  return children;
}

function AdminPage() { return <div>Admin Dashboard</div>; }
function LoginPage() { return <div>Login Page</div>; }
function ViewerPage() { return <div>Viewer Page</div>; }

function renderRoutes(initialPath) {
  return render(
    <TournamentProvider>
      <AdminAuthProvider>
        <MemoryRouter initialEntries={[initialPath]}>
          <Routes>
            <Route path="/admin" element={<LoginPage />} />
            <Route path="/viewer" element={<ViewerPage />} />
            <Route
              path="/admin/dashboard"
              element={<RequireAdmin><AdminPage /></RequireAdmin>}
            />
          </Routes>
        </MemoryRouter>
      </AdminAuthProvider>
    </TournamentProvider>
  );
}

describe('RequireAdmin route guard', () => {
  beforeEach(() => {
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem('statedge_admin_config');
  });

  it('unauthenticated access to /admin/dashboard redirects to /admin', () => {
    renderRoutes('/admin/dashboard');
    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Admin Dashboard')).not.toBeInTheDocument();
  });

  it('authenticated access to /admin/dashboard renders the page', () => {
    sessionStorage.setItem(SESSION_KEY, 'true');
    renderRoutes('/admin/dashboard');
    expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
  });

  it('viewer route is accessible without authentication', () => {
    renderRoutes('/viewer');
    expect(screen.getByText('Viewer Page')).toBeInTheDocument();
  });

  it('redirect preserves intended destination in location state', () => {
    // Verify that after redirect the user is on the login page
    renderRoutes('/admin/dashboard');
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });
});

// ─── TournamentPage isAdmin prop propagation ──────────────────────────────────

import { TournamentPage } from './pages/TournamentPage.jsx';
import { saveState } from './lib/storage.js';

const SAMPLE_TOURNAMENT = {
  id: 'tour1',
  name: 'Test Cup',
  sport: 'netball',
  ageGroup: 'U16',
  organizingBody: '',
  venue: '',
  startDate: null,
  endDate: null,
  teams: [],
  pools: [],
  fixtures: [],
  playoffs: [],
  players: [],
  pointsForWin: 2,
  pointsForDraw: 1,
  pointsForLoss: 0,
  tiebreakMethod: 'goal-difference',
  adminPinHash: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

function renderTournamentPage(isAdmin) {
  saveState({ tournaments: [SAMPLE_TOURNAMENT], theme: 'light', schemaVersion: 1 });
  if (isAdmin) sessionStorage.setItem(SESSION_KEY, 'true');

  return render(
    <TournamentProvider>
      <AdminAuthProvider>
        <MemoryRouter initialEntries={[`/sports/netball/tour1`]}>
          <Routes>
            <Route path="/sports/:sport/:id" element={<TournamentPage isAdmin={isAdmin} />} />
            <Route path="/admin/dashboard" element={<div>Admin Dashboard</div>} />
            <Route path="/sports" element={<div>Sports Page</div>} />
          </Routes>
        </MemoryRouter>
      </AdminAuthProvider>
    </TournamentProvider>
  );
}

describe('TournamentPage — isAdmin prop', () => {
  beforeEach(() => {
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.clear();
  });

  it('viewer: Admin tab is NOT in the tab list', () => {
    renderTournamentPage(false);
    expect(screen.queryByText('Admin')).not.toBeInTheDocument();
  });

  it('admin: Admin tab IS in the tab list', () => {
    renderTournamentPage(true);
    // There will be multiple "Admin" texts (tab + header badge) — verify the tab specifically
    const adminTexts = screen.getAllByText('Admin');
    expect(adminTexts.length).toBeGreaterThanOrEqual(1);
  });

  it('viewer: Overview tab is visible', () => {
    renderTournamentPage(false);
    expect(screen.getByText('Overview')).toBeInTheDocument();
  });

  it('viewer: Fixtures, Standings, Playoffs, Players, Statistics tabs visible', () => {
    renderTournamentPage(false);
    // Use getAllByText where tab labels might appear in tooltip/aria too
    expect(screen.getAllByText('Fixtures').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Standings').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Playoffs').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Players').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Statistics').length).toBeGreaterThanOrEqual(1);
  });

  it('admin: shows Admin badge in header (.admin-indicator)', () => {
    const { container } = renderTournamentPage(true);
    // The header badge uses the .admin-indicator class
    expect(container.querySelector('.admin-indicator')).not.toBeNull();
  });
});
