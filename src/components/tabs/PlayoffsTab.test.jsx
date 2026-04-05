import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TournamentProvider } from '../../context/TournamentContext.jsx';
import { AdminAuthProvider } from '../../context/AdminAuthContext.jsx';
import { PlayoffsTab } from './PlayoffsTab.jsx';
import { makeTournamentFixture, noopDispatch, noopToast } from '../../test/helpers.jsx';

function renderPlayoffsTab(isAdmin, playoffsOverride = []) {
  const tournament = makeTournamentFixture({ playoffs: playoffsOverride });
  return render(
    <TournamentProvider>
      <AdminAuthProvider>
        <MemoryRouter>
          <PlayoffsTab
            tournament={tournament}
            dispatch={noopDispatch}
            toast={noopToast}
            isAdmin={isAdmin}
          />
        </MemoryRouter>
      </AdminAuthProvider>
    </TournamentProvider>
  );
}

describe('PlayoffsTab — viewer, no bracket yet (isAdmin=false)', () => {
  it('shows "Playoffs Not Started" message', () => {
    renderPlayoffsTab(false);
    expect(screen.getByText(/Playoffs Not Started/i)).toBeInTheDocument();
  });

  it('does NOT show Generate Bracket button', () => {
    renderPlayoffsTab(false);
    expect(screen.queryByText(/Generate Bracket/i)).not.toBeInTheDocument();
  });
});

describe('PlayoffsTab — admin, no bracket yet (isAdmin=true)', () => {
  it('shows Generate Bracket button', () => {
    renderPlayoffsTab(true);
    expect(screen.getByText(/Generate Bracket/i)).toBeInTheDocument();
  });

  it('shows teams-per-pool selector buttons', () => {
    renderPlayoffsTab(true);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });
});

describe('PlayoffsTab — with bracket', () => {
  const bracket = [
    {
      id: 'final', round: 1, position: 1,
      homeTeamId: 'team1', awayTeamId: 'team2',
      homeScore: null, awayScore: null, played: false, isThirdPlace: false,
    },
  ];

  it('shows bracket match teams', () => {
    renderPlayoffsTab(false, bracket);
    expect(screen.getByText('Lions')).toBeInTheDocument();
    expect(screen.getByText('Tigers')).toBeInTheDocument();
  });

  it('viewer: does NOT show "Click to enter score" hint', () => {
    renderPlayoffsTab(false, bracket);
    expect(screen.queryByText(/Click to enter score/i)).not.toBeInTheDocument();
  });

  it('viewer: does NOT show Reset Bracket button', () => {
    renderPlayoffsTab(false, bracket);
    expect(screen.queryByText(/Reset Bracket/i)).not.toBeInTheDocument();
  });

  it('admin: shows "Click to enter score" hint', () => {
    renderPlayoffsTab(true, bracket);
    expect(screen.getByText(/Click to enter score/i)).toBeInTheDocument();
  });

  it('admin: shows Reset Bracket button', () => {
    renderPlayoffsTab(true, bracket);
    expect(screen.getByText(/Reset Bracket/i)).toBeInTheDocument();
  });
});
