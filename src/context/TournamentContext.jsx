import { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import { loadState, saveState } from '../lib/storage.js';
import { generateId } from '../lib/utils.js';
import { createTournament } from '../lib/tournament.js';
import { debounce } from '../lib/utils.js';

const TournamentContext = createContext(null);

export function reducer(state, action) {
  switch (action.type) {
    case 'SET_THEME':
      return { ...state, theme: action.payload };

    case 'CREATE_TOURNAMENT': {
      const t = createTournament(action.payload);
      return { ...state, tournaments: [...state.tournaments, t] };
    }

    case 'UPDATE_TOURNAMENT': {
      return {
        ...state,
        tournaments: state.tournaments.map(t =>
          t.id === action.payload.id
            ? { ...t, ...action.payload, updatedAt: new Date().toISOString() }
            : t
        ),
      };
    }

    case 'DELETE_TOURNAMENT':
      return {
        ...state,
        tournaments: state.tournaments.filter(t => t.id !== action.payload),
      };

    case 'IMPORT_TOURNAMENT': {
      const existing = state.tournaments.find(t => t.id === action.payload.id);
      if (existing) {
        return {
          ...state,
          tournaments: state.tournaments.map(t =>
            t.id === action.payload.id ? action.payload : t
          ),
        };
      }
      return { ...state, tournaments: [...state.tournaments, action.payload] };
    }

    // ─── Team operations ───────────────────────────────────────
    case 'ADD_TEAM': {
      const team = { id: generateId(), colors: { primary: '#112240', secondary: '#FFC500' }, poolId: null, ...action.payload.team };
      return patchTournament(state, action.payload.tournamentId, t => ({
        ...t,
        teams: [...t.teams, team],
      }));
    }

    case 'UPDATE_TEAM':
      return patchTournament(state, action.payload.tournamentId, t => ({
        ...t,
        teams: t.teams.map(tm => tm.id === action.payload.team.id ? { ...tm, ...action.payload.team } : tm),
      }));

    case 'DELETE_TEAM':
      return patchTournament(state, action.payload.tournamentId, t => ({
        ...t,
        teams: t.teams.filter(tm => tm.id !== action.payload.teamId),
        pools: t.pools.map(p => ({ ...p, teamIds: p.teamIds.filter(id => id !== action.payload.teamId) })),
        fixtures: t.fixtures.filter(f => f.homeTeamId !== action.payload.teamId && f.awayTeamId !== action.payload.teamId),
        players: t.players.map(p => p.teamId === action.payload.teamId ? { ...p, teamId: null } : p),
      }));

    // ─── Pool operations ───────────────────────────────────────
    case 'ADD_POOL': {
      const pool = { id: generateId(), teamIds: [], ...action.payload.pool };
      return patchTournament(state, action.payload.tournamentId, t => ({
        ...t, pools: [...t.pools, pool],
      }));
    }

    case 'UPDATE_POOL':
      return patchTournament(state, action.payload.tournamentId, t => ({
        ...t,
        pools: t.pools.map(p => p.id === action.payload.pool.id ? { ...p, ...action.payload.pool } : p),
      }));

    case 'DELETE_POOL':
      return patchTournament(state, action.payload.tournamentId, t => ({
        ...t,
        pools: t.pools.filter(p => p.id !== action.payload.poolId),
        teams: t.teams.map(tm => tm.poolId === action.payload.poolId ? { ...tm, poolId: null } : tm),
        fixtures: t.fixtures.filter(f => f.poolId !== action.payload.poolId),
      }));

    case 'ASSIGN_TEAM_TO_POOL':
      return patchTournament(state, action.payload.tournamentId, t => ({
        ...t,
        teams: t.teams.map(tm => {
          if (tm.id !== action.payload.teamId) return tm;
          return { ...tm, poolId: action.payload.poolId };
        }),
        pools: t.pools.map(p => {
          const has = p.teamIds.includes(action.payload.teamId);
          if (p.id === action.payload.poolId) {
            return has ? p : { ...p, teamIds: [...p.teamIds, action.payload.teamId] };
          }
          return { ...p, teamIds: p.teamIds.filter(id => id !== action.payload.teamId) };
        }),
      }));

    // ─── Fixture operations ────────────────────────────────────
    case 'ADD_FIXTURES':
      return patchTournament(state, action.payload.tournamentId, t => ({
        ...t, fixtures: [...t.fixtures, ...action.payload.fixtures],
      }));

    case 'ADD_FIXTURE': {
      const fixture = {
        id: generateId(), homeScore: null, awayScore: null,
        quarterScores: null, played: false, round: 1,
        date: null, time: null, venue: null, court: null, officials: null,
        ...action.payload.fixture,
      };
      return patchTournament(state, action.payload.tournamentId, t => ({
        ...t, fixtures: [...t.fixtures, fixture],
      }));
    }

    case 'UPDATE_FIXTURE':
      return patchTournament(state, action.payload.tournamentId, t => ({
        ...t,
        fixtures: t.fixtures.map(f => f.id === action.payload.fixture.id ? { ...f, ...action.payload.fixture } : f),
      }));

    case 'DELETE_FIXTURE':
      return patchTournament(state, action.payload.tournamentId, t => ({
        ...t, fixtures: t.fixtures.filter(f => f.id !== action.payload.fixtureId),
      }));

    case 'CLEAR_POOL_FIXTURES':
      return patchTournament(state, action.payload.tournamentId, t => ({
        ...t, fixtures: t.fixtures.filter(f => f.poolId !== action.payload.poolId || f.played),
      }));

    // ─── Player operations ─────────────────────────────────────
    case 'ADD_PLAYER': {
      const player = { id: generateId(), goalsScored: {}, ...action.payload.player };
      return patchTournament(state, action.payload.tournamentId, t => ({
        ...t, players: [...t.players, player],
      }));
    }

    case 'UPDATE_PLAYER':
      return patchTournament(state, action.payload.tournamentId, t => ({
        ...t,
        players: t.players.map(p => p.id === action.payload.player.id ? { ...p, ...action.payload.player } : p),
      }));

    case 'DELETE_PLAYER':
      return patchTournament(state, action.payload.tournamentId, t => ({
        ...t, players: t.players.filter(p => p.id !== action.payload.playerId),
      }));

    case 'IMPORT_PLAYERS':
      return patchTournament(state, action.payload.tournamentId, t => ({
        ...t, players: [...t.players, ...action.payload.players.map(p => ({ id: generateId(), goalsScored: {}, ...p }))],
      }));

    // ─── Playoff operations ────────────────────────────────────
    case 'SET_PLAYOFFS':
      return patchTournament(state, action.payload.tournamentId, t => ({
        ...t, playoffs: action.payload.playoffs,
      }));

    case 'UPDATE_PLAYOFF_MATCH':
      return patchTournament(state, action.payload.tournamentId, t => ({
        ...t,
        playoffs: t.playoffs.map(m => m.id === action.payload.match.id ? { ...m, ...action.payload.match } : m),
      }));

    default:
      return state;
  }
}

function patchTournament(state, id, fn) {
  return {
    ...state,
    tournaments: state.tournaments.map(t =>
      t.id === id ? { ...fn(t), updatedAt: new Date().toISOString() } : t
    ),
  };
}

export function TournamentProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, null, loadState);

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', state.theme);
  }, [state.theme]);

  // Debounced save
  const debouncedSave = useRef(debounce(saveState, 400)).current;
  useEffect(() => { debouncedSave(state); }, [state]);

  const setTheme = useCallback(theme => dispatch({ type: 'SET_THEME', payload: theme }), []);

  return (
    <TournamentContext.Provider value={{ state, dispatch, setTheme }}>
      {children}
    </TournamentContext.Provider>
  );
}

export function useTournamentContext() {
  const ctx = useContext(TournamentContext);
  if (!ctx) throw new Error('useTournamentContext must be used within TournamentProvider');
  return ctx;
}

/** Hook to get a specific tournament by ID */
export function useTournament(id) {
  const { state, dispatch } = useTournamentContext();
  const tournament = state.tournaments.find(t => t.id === id) || null;
  return { tournament, dispatch };
}
