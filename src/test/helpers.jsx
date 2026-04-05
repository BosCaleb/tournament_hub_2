/**
 * Shared test helpers — wrappers and fixture factories for component tests.
 */
import { render } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { TournamentProvider } from '../context/TournamentContext.jsx';
import { AdminAuthProvider } from '../context/AdminAuthContext.jsx';

/**
 * Render a component wrapped in all required providers and a MemoryRouter.
 * @param {JSX.Element} ui
 * @param {{ route?: string, path?: string, initialState?: object }} options
 */
export function renderWithProviders(ui, { route = '/', path = '/' } = {}) {
  return render(
    <TournamentProvider>
      <AdminAuthProvider>
        <MemoryRouter initialEntries={[route]}>
          <Routes>
            <Route path={path} element={ui} />
          </Routes>
        </MemoryRouter>
      </AdminAuthProvider>
    </TournamentProvider>
  );
}

/** A minimal tournament object suitable for passing to tab components */
export function makeTournamentFixture(overrides = {}) {
  return {
    id: 't1',
    name: 'Test Tournament',
    sport: 'netball',
    ageGroup: 'U16',
    organizingBody: 'Test Union',
    venue: 'Test Venue',
    startDate: '2025-09-01',
    endDate: '2025-09-02',
    teams: [
      { id: 'team1', name: 'Lions', colors: { primary: '#2563EB' }, poolId: 'pool1' },
      { id: 'team2', name: 'Tigers', colors: { primary: '#DC2626' }, poolId: 'pool1' },
    ],
    pools: [
      { id: 'pool1', name: 'Pool A', teamIds: ['team1', 'team2'] },
    ],
    fixtures: [
      {
        id: 'fix1', poolId: 'pool1',
        homeTeamId: 'team1', awayTeamId: 'team2',
        homeScore: 30, awayScore: 20, played: true, round: 1,
        date: '2025-09-01', time: '09:00', venue: null, court: '1',
      },
    ],
    playoffs: [],
    players: [
      { id: 'p1', name: 'Jane Smith', jerseyNumber: '7', position: 'GS', teamId: 'team1', goalsScored: {} },
    ],
    pointsForWin: 2,
    pointsForDraw: 1,
    pointsForLoss: 0,
    tiebreakMethod: 'goal-difference',
    adminPinHash: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

/** A no-op dispatch for read-only component tests */
export const noopDispatch = () => {};

/** A no-op toast for component tests */
export const noopToast = {
  toasts: [],
  success: () => {},
  error: () => {},
  warning: () => {},
  info: () => {},
  dismiss: () => {},
};
