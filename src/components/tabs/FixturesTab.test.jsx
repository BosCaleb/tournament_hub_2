import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TournamentProvider } from '../../context/TournamentContext.jsx';
import { AdminAuthProvider } from '../../context/AdminAuthContext.jsx';
import { FixturesTab } from './FixturesTab.jsx';
import { makeTournamentFixture, noopDispatch, noopToast } from '../../test/helpers.jsx';

function renderFixturesTab(isAdmin) {
  const tournament = makeTournamentFixture();
  return render(
    <TournamentProvider>
      <AdminAuthProvider>
        <MemoryRouter>
          <FixturesTab
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

describe('FixturesTab — viewer (isAdmin=false)', () => {
  it('shows fixture list (read-only data is visible)', () => {
    renderFixturesTab(false);
    expect(screen.getByText('Lions')).toBeInTheDocument();
    expect(screen.getByText('Tigers')).toBeInTheDocument();
  });

  it('does NOT show Generate Round-Robin button', () => {
    renderFixturesTab(false);
    expect(screen.queryByText(/Generate Round-Robin/i)).not.toBeInTheDocument();
  });

  it('does NOT show Add Fixture button', () => {
    renderFixturesTab(false);
    expect(screen.queryByText(/Add Fixture/i)).not.toBeInTheDocument();
  });

  it('does NOT show Clear Unplayed button', () => {
    renderFixturesTab(false);
    expect(screen.queryByText(/Clear Unplayed/i)).not.toBeInTheDocument();
  });

  it('does NOT show score entry button on fixture rows', () => {
    renderFixturesTab(false);
    // Score entry button has title="Enter score"
    expect(screen.queryByTitle('Enter score')).not.toBeInTheDocument();
  });

  it('does NOT show edit button on fixture rows', () => {
    renderFixturesTab(false);
    expect(screen.queryByTitle('Edit details')).not.toBeInTheDocument();
  });

  it('does NOT show delete button on fixture rows', () => {
    renderFixturesTab(false);
    expect(screen.queryByTitle('Delete')).not.toBeInTheDocument();
  });
});

describe('FixturesTab — admin (isAdmin=true)', () => {
  it('shows Generate Round-Robin button', () => {
    renderFixturesTab(true);
    expect(screen.getByText(/Generate Round-Robin/i)).toBeInTheDocument();
  });

  it('shows Add Fixture button', () => {
    renderFixturesTab(true);
    expect(screen.getByText(/Add Fixture/i)).toBeInTheDocument();
  });

  it('shows score entry button on fixture rows', () => {
    renderFixturesTab(true);
    expect(screen.getByTitle('Enter score')).toBeInTheDocument();
  });

  it('shows edit button on fixture rows', () => {
    renderFixturesTab(true);
    expect(screen.getByTitle('Edit details')).toBeInTheDocument();
  });

  it('shows delete button on fixture rows', () => {
    renderFixturesTab(true);
    expect(screen.getByTitle('Delete')).toBeInTheDocument();
  });
});
