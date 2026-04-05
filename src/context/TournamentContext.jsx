import { createContext, useContext, useReducer, useEffect, useCallback, useRef, useState } from 'react';
import { loadState, saveState } from '../lib/storage.js';
import { generateId } from '../lib/utils.js';
import { createTournament } from '../lib/tournament.js';
import { debounce } from '../lib/utils.js';
import { loadTournaments, upsertTournament, deleteTournament, subscribeTournament } from '../lib/db.js';
import { isSupabaseEnabled } from '../lib/supabase.js';

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

    // ─── Locked rounds ─────────────────────────────────────────
    case 'TOGGLE_LOCK_ROUND': {
      const { tournamentId, round } = action.payload;
      return patchTournament(state, tournamentId, t => {
        const locked = t.lockedRounds || [];
        const isLocked = locked.includes(round);
        return {
          ...t,
          lockedRounds: isLocked ? locked.filter(r => r !== round) : [...locked, round],
        };
      });
    }

    // ─── Custom round names ────────────────────────────────────
    case 'SET_ROUND_NAME': {
      const { tournamentId, round, name } = action.payload;
      return patchTournament(state, tournamentId, t => ({
        ...t,
        roundNames: { ...(t.roundNames || {}), [round]: name },
      }));
    }

    case 'DELETE_ROUND_NAME': {
      const { tournamentId, round } = action.payload;
      return patchTournament(state, tournamentId, t => {
        const names = { ...(t.roundNames || {}) };
        delete names[round];
        return { ...t, roundNames: names };
      });
    }

    // ─── Multiple playoff flows ────────────────────────────────
    case 'ADD_PLAYOFF_FLOW': {
      const flow = { id: generateId(), name: 'Playoff Flow', matches: [], ...action.payload.flow };
      return patchTournament(state, action.payload.tournamentId, t => ({
        ...t, playoffFlows: [...(t.playoffFlows || []), flow],
      }));
    }

    case 'UPDATE_PLAYOFF_FLOW':
      return patchTournament(state, action.payload.tournamentId, t => ({
        ...t,
        playoffFlows: (t.playoffFlows || []).map(f =>
          f.id === action.payload.flow.id ? { ...f, ...action.payload.flow } : f
        ),
      }));

    case 'DELETE_PLAYOFF_FLOW':
      return patchTournament(state, action.payload.tournamentId, t => ({
        ...t,
        playoffFlows: (t.playoffFlows || []).filter(f => f.id !== action.payload.flowId),
      }));

    case 'UPDATE_PLAYOFF_FLOW_MATCH':
      return patchTournament(state, action.payload.tournamentId, t => ({
        ...t,
        playoffFlows: (t.playoffFlows || []).map(f =>
          f.id !== action.payload.flowId ? f : {
            ...f,
            matches: f.matches.map(m =>
              m.id === action.payload.match.id ? { ...m, ...action.payload.match } : m
            ),
          }
        ),
      }));

    // ─── Custom ranking lists ──────────────────────────────────
    case 'ADD_RANKING_LIST': {
      const list = { id: generateId(), name: 'Custom Ranking', teamIds: [], ...action.payload.list };
      return patchTournament(state, action.payload.tournamentId, t => ({
        ...t, rankingLists: [...(t.rankingLists || []), list],
      }));
    }

    case 'UPDATE_RANKING_LIST':
      return patchTournament(state, action.payload.tournamentId, t => ({
        ...t,
        rankingLists: (t.rankingLists || []).map(l =>
          l.id === action.payload.list.id ? { ...l, ...action.payload.list } : l
        ),
      }));

    case 'DELETE_RANKING_LIST':
      return patchTournament(state, action.payload.tournamentId, t => ({
        ...t,
        rankingLists: (t.rankingLists || []).filter(l => l.id !== action.payload.listId),
      }));

    // ─── Soft delete / recycle bin ─────────────────────────────
    case 'SOFT_DELETE_TEAM': {
      const { tournamentId, teamId } = action.payload;
      return patchTournament(state, tournamentId, t => {
        const team = t.teams.find(tm => tm.id === teamId);
        if (!team) return t;
        const bin = t.deletedItems || { teams: [], fixtures: [], players: [] };
        return {
          ...t,
          teams: t.teams.filter(tm => tm.id !== teamId),
          pools: t.pools.map(p => ({ ...p, teamIds: p.teamIds.filter(id => id !== teamId) })),
          fixtures: t.fixtures.filter(f => f.homeTeamId !== teamId && f.awayTeamId !== teamId),
          players: t.players.map(p => p.teamId === teamId ? { ...p, teamId: null } : p),
          deletedItems: { ...bin, teams: [...bin.teams, { ...team, deletedAt: new Date().toISOString() }] },
        };
      });
    }

    case 'SOFT_DELETE_FIXTURE': {
      const { tournamentId, fixtureId } = action.payload;
      return patchTournament(state, tournamentId, t => {
        const fixture = t.fixtures.find(f => f.id === fixtureId);
        if (!fixture) return t;
        const bin = t.deletedItems || { teams: [], fixtures: [], players: [] };
        return {
          ...t,
          fixtures: t.fixtures.filter(f => f.id !== fixtureId),
          deletedItems: { ...bin, fixtures: [...bin.fixtures, { ...fixture, deletedAt: new Date().toISOString() }] },
        };
      });
    }

    case 'SOFT_DELETE_PLAYER': {
      const { tournamentId, playerId } = action.payload;
      return patchTournament(state, tournamentId, t => {
        const player = t.players.find(p => p.id === playerId);
        if (!player) return t;
        const bin = t.deletedItems || { teams: [], fixtures: [], players: [] };
        return {
          ...t,
          players: t.players.filter(p => p.id !== playerId),
          deletedItems: { ...bin, players: [...bin.players, { ...player, deletedAt: new Date().toISOString() }] },
        };
      });
    }

    case 'RESTORE_DELETED_ITEM': {
      const { tournamentId, itemType, itemId } = action.payload;
      return patchTournament(state, tournamentId, t => {
        const bin = t.deletedItems || { teams: [], fixtures: [], players: [] };
        const item = bin[itemType]?.find(i => i.id === itemId);
        if (!item) return t;
        const { deletedAt, ...restored } = item;
        const newBin = { ...bin, [itemType]: bin[itemType].filter(i => i.id !== itemId) };
        if (itemType === 'teams') return { ...t, teams: [...t.teams, restored], deletedItems: newBin };
        if (itemType === 'fixtures') return { ...t, fixtures: [...t.fixtures, restored], deletedItems: newBin };
        if (itemType === 'players') return { ...t, players: [...t.players, restored], deletedItems: newBin };
        return t;
      });
    }

    case 'PERMANENTLY_DELETE_ITEM': {
      const { tournamentId, itemType, itemId } = action.payload;
      return patchTournament(state, tournamentId, t => {
        const bin = t.deletedItems || { teams: [], fixtures: [], players: [] };
        return { ...t, deletedItems: { ...bin, [itemType]: bin[itemType].filter(i => i.id !== itemId) } };
      });
    }

    case 'EMPTY_RECYCLE_BIN':
      return patchTournament(state, action.payload.tournamentId, t => ({
        ...t, deletedItems: { teams: [], fixtures: [], players: [] },
      }));

    // ─── Supabase hydration ────────────────────────────────────
    case 'HYDRATE':
      return { ...state, tournaments: action.payload };

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
  // Start from localStorage so the UI is instant on every revisit
  const [state, dispatch] = useReducer(reducer, null, loadState);
  const [dbReady, setDbReady] = useState(!isSupabaseEnabled);

  // ── On mount: pull from Supabase and replace local state ──────────────────
  useEffect(() => {
    if (!isSupabaseEnabled) return;

    loadTournaments()
      .then(tournaments => {
        if (tournaments !== null) {
          dispatch({ type: 'HYDRATE', payload: tournaments });
        }
        setDbReady(true);
      })
      .catch(err => {
        console.error('[db] Failed to load tournaments:', err);
        setDbReady(true); // always unblock the UI even if Supabase is unreachable
      });
  }, []);

  // ── Apply theme ────────────────────────────────────────────────────────────
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', state.theme);
  }, [state.theme]);

  // ── Save to localStorage (always — fast read on next open) ─────────────────
  const debouncedLocalSave = useRef(debounce(saveState, 400)).current;
  useEffect(() => { debouncedLocalSave(state); }, [state]);

  // ── Sync changed/deleted tournaments to Supabase ───────────────────────────
  const prevTournamentsRef = useRef(state.tournaments);

  useEffect(() => {
    if (!dbReady || !isSupabaseEnabled) return;

    const prev = prevTournamentsRef.current;
    const curr = state.tournaments;

    // Upsert tournaments whose updatedAt changed (or are brand-new)
    const changed = curr.filter(t => {
      const old = prev.find(p => p.id === t.id);
      return !old || old.updatedAt !== t.updatedAt;
    });

    // Hard-delete rows for tournaments removed from state
    const removed = prev.filter(p => !curr.find(c => c.id === p.id));

    changed.forEach(t => upsertTournament(t));
    removed.forEach(t => deleteTournament(t.id));

    prevTournamentsRef.current = curr;
  }, [state.tournaments, dbReady]);

  const setTheme = useCallback(theme => dispatch({ type: 'SET_THEME', payload: theme }), []);

  return (
    <TournamentContext.Provider value={{ state, dispatch, setTheme, dbReady }}>
      {children}
    </TournamentContext.Provider>
  );
}

export function useTournamentContext() {
  const ctx = useContext(TournamentContext);
  if (!ctx) throw new Error('useTournamentContext must be used within TournamentProvider');
  return ctx;
}

/** Hook to get a specific tournament by ID, with real-time updates from Supabase */
export function useTournament(id) {
  const { state, dispatch } = useTournamentContext();
  const tournament = state.tournaments.find(t => t.id === id) || null;

  // Real-time: when another session updates this tournament, hydrate it here
  useEffect(() => {
    if (!id || !isSupabaseEnabled) return;
    const unsub = subscribeTournament(id, updated => {
      dispatch({ type: 'HYDRATE', payload: state.tournaments.map(t => t.id === id ? updated : t) });
    });
    return unsub;
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  return { tournament, dispatch };
}
