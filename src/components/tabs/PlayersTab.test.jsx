import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TournamentProvider } from '../../context/TournamentContext.jsx';
import { AdminAuthProvider } from '../../context/AdminAuthContext.jsx';
import { PlayersTab } from './PlayersTab.jsx';
import { makeTournamentFixture, noopDispatch, noopToast } from '../../test/helpers.jsx';

function renderPlayersTab(isAdmin) {
  const tournament = makeTournamentFixture();
  return render(
    <TournamentProvider>
      <AdminAuthProvider>
        <MemoryRouter>
          <PlayersTab
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

describe('PlayersTab — viewer (isAdmin=false)', () => {
  it('shows player list (data is visible)', () => {
    renderPlayersTab(false);
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  it('does NOT show Add Player button', () => {
    renderPlayersTab(false);
    expect(screen.queryByText(/Add Player/i)).not.toBeInTheDocument();
  });

  it('does NOT show Import CSV option', () => {
    renderPlayersTab(false);
    expect(screen.queryByText(/Import CSV/i)).not.toBeInTheDocument();
  });

  it('DOES show Export button (viewers can export)', () => {
    renderPlayersTab(false);
    // Export is now split into PDF and CSV buttons
    expect(screen.getByText('PDF')).toBeInTheDocument();
    expect(screen.getByText('CSV')).toBeInTheDocument();
  });

  it('does NOT show edit button on player cards', () => {
    renderPlayersTab(false);
    expect(screen.queryByTitle('Edit')).not.toBeInTheDocument();
  });

  it('does NOT show delete/remove button on player cards', () => {
    renderPlayersTab(false);
    expect(screen.queryByTitle('Remove')).not.toBeInTheDocument();
  });
});

describe('PlayersTab — admin (isAdmin=true)', () => {
  it('shows Add Player button', () => {
    renderPlayersTab(true);
    expect(screen.getByText(/Add Player/i)).toBeInTheDocument();
  });

  it('shows Import CSV option', () => {
    renderPlayersTab(true);
    expect(screen.getByText(/Import CSV/i)).toBeInTheDocument();
  });

  it('shows edit button on player cards', () => {
    renderPlayersTab(true);
    expect(screen.getByTitle('Edit')).toBeInTheDocument();
  });

  it('shows remove button on player cards', () => {
    renderPlayersTab(true);
    expect(screen.getByTitle('Remove')).toBeInTheDocument();
  });
});
