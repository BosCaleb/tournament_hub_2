import { describe, it, expect } from 'vitest';
import { reducer } from './TournamentContext.jsx';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeState(overrides = {}) {
  return {
    tournaments: [],
    theme: 'light',
    schemaVersion: 1,
    ...overrides,
  };
}

function makeTournament(overrides = {}) {
  return {
    id: 't1',
    name: 'Test Cup',
    sport: 'netball',
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
    ...overrides,
  };
}

function makeTeam(overrides = {}) {
  return { id: 'team1', name: 'Lions', colors: { primary: '#112240' }, poolId: null, ...overrides };
}

function makePool(overrides = {}) {
  return { id: 'pool1', name: 'Pool A', teamIds: [], ...overrides };
}

function makeFixture(overrides = {}) {
  return {
    id: 'fix1', poolId: 'pool1',
    homeTeamId: 'team1', awayTeamId: 'team2',
    homeScore: null, awayScore: null, played: false, round: 1,
    ...overrides,
  };
}

// ─── SET_THEME ────────────────────────────────────────────────────────────────

describe('SET_THEME', () => {
  it('updates theme', () => {
    const state = makeState({ theme: 'light' });
    const next = reducer(state, { type: 'SET_THEME', payload: 'dark' });
    expect(next.theme).toBe('dark');
  });
});

// ─── CREATE_TOURNAMENT ───────────────────────────────────────────────────────

describe('CREATE_TOURNAMENT', () => {
  it('adds a tournament to the array', () => {
    const state = makeState();
    const next = reducer(state, { type: 'CREATE_TOURNAMENT', payload: { name: 'Cup 2025' } });
    expect(next.tournaments).toHaveLength(1);
    expect(next.tournaments[0].name).toBe('Cup 2025');
  });

  it('adds sport field defaulting to netball', () => {
    const state = makeState();
    const next = reducer(state, { type: 'CREATE_TOURNAMENT', payload: { name: 'Test' } });
    expect(next.tournaments[0].sport).toBe('netball');
  });

  it('does not mutate existing tournaments', () => {
    const existing = makeTournament({ id: 'old' });
    const state = makeState({ tournaments: [existing] });
    const next = reducer(state, { type: 'CREATE_TOURNAMENT', payload: { name: 'New' } });
    expect(next.tournaments).toHaveLength(2);
    expect(next.tournaments[0].id).toBe('old');
  });
});

// ─── DELETE_TOURNAMENT ───────────────────────────────────────────────────────

describe('DELETE_TOURNAMENT', () => {
  it('removes the correct tournament', () => {
    const t1 = makeTournament({ id: 't1' });
    const t2 = makeTournament({ id: 't2', name: 'Other' });
    const state = makeState({ tournaments: [t1, t2] });
    const next = reducer(state, { type: 'DELETE_TOURNAMENT', payload: 't1' });
    expect(next.tournaments).toHaveLength(1);
    expect(next.tournaments[0].id).toBe('t2');
  });

  it('is a no-op for unknown id', () => {
    const t1 = makeTournament({ id: 't1' });
    const state = makeState({ tournaments: [t1] });
    const next = reducer(state, { type: 'DELETE_TOURNAMENT', payload: 'unknown' });
    expect(next.tournaments).toHaveLength(1);
  });
});

// ─── UPDATE_TOURNAMENT ───────────────────────────────────────────────────────

describe('UPDATE_TOURNAMENT', () => {
  it('updates only matching tournament', () => {
    const t1 = makeTournament({ id: 't1', name: 'Old Name' });
    const state = makeState({ tournaments: [t1] });
    const next = reducer(state, { type: 'UPDATE_TOURNAMENT', payload: { id: 't1', name: 'New Name' } });
    expect(next.tournaments[0].name).toBe('New Name');
  });

  it('sets updatedAt', () => {
    const t1 = makeTournament({ id: 't1', updatedAt: '2020-01-01T00:00:00.000Z' });
    const state = makeState({ tournaments: [t1] });
    const next = reducer(state, { type: 'UPDATE_TOURNAMENT', payload: { id: 't1', name: 'X' } });
    expect(next.tournaments[0].updatedAt).not.toBe('2020-01-01T00:00:00.000Z');
  });
});

// ─── ADD_TEAM ────────────────────────────────────────────────────────────────

describe('ADD_TEAM', () => {
  it('adds team to the tournament', () => {
    const t = makeTournament({ id: 't1' });
    const state = makeState({ tournaments: [t] });
    const next = reducer(state, { type: 'ADD_TEAM', payload: { tournamentId: 't1', team: { name: 'Lions' } } });
    expect(next.tournaments[0].teams).toHaveLength(1);
    expect(next.tournaments[0].teams[0].name).toBe('Lions');
  });

  it('auto-assigns a generated id', () => {
    const t = makeTournament({ id: 't1' });
    const state = makeState({ tournaments: [t] });
    const next = reducer(state, { type: 'ADD_TEAM', payload: { tournamentId: 't1', team: { name: 'X' } } });
    expect(next.tournaments[0].teams[0].id).toBeTruthy();
  });
});

// ─── DELETE_TEAM ─────────────────────────────────────────────────────────────

describe('DELETE_TEAM', () => {
  it('removes team from teams array', () => {
    const team = makeTeam({ id: 'team1' });
    const t = makeTournament({ id: 't1', teams: [team] });
    const state = makeState({ tournaments: [t] });
    const next = reducer(state, { type: 'DELETE_TEAM', payload: { tournamentId: 't1', teamId: 'team1' } });
    expect(next.tournaments[0].teams).toHaveLength(0);
  });

  it('removes team from pool teamIds', () => {
    const team = makeTeam({ id: 'team1' });
    const pool = makePool({ id: 'pool1', teamIds: ['team1', 'team2'] });
    const t = makeTournament({ id: 't1', teams: [team], pools: [pool] });
    const state = makeState({ tournaments: [t] });
    const next = reducer(state, { type: 'DELETE_TEAM', payload: { tournamentId: 't1', teamId: 'team1' } });
    expect(next.tournaments[0].pools[0].teamIds).not.toContain('team1');
  });

  it('removes fixtures involving the deleted team', () => {
    const team = makeTeam({ id: 'team1' });
    const fixture = makeFixture({ id: 'f1', homeTeamId: 'team1', awayTeamId: 'team2' });
    const t = makeTournament({ id: 't1', teams: [team], fixtures: [fixture] });
    const state = makeState({ tournaments: [t] });
    const next = reducer(state, { type: 'DELETE_TEAM', payload: { tournamentId: 't1', teamId: 'team1' } });
    expect(next.tournaments[0].fixtures).toHaveLength(0);
  });
});

// ─── ASSIGN_TEAM_TO_POOL ─────────────────────────────────────────────────────

describe('ASSIGN_TEAM_TO_POOL', () => {
  it('adds team to target pool', () => {
    const team = makeTeam({ id: 'team1', poolId: null });
    const pool = makePool({ id: 'pool1', teamIds: [] });
    const t = makeTournament({ id: 't1', teams: [team], pools: [pool] });
    const state = makeState({ tournaments: [t] });
    const next = reducer(state, { type: 'ASSIGN_TEAM_TO_POOL', payload: { tournamentId: 't1', teamId: 'team1', poolId: 'pool1' } });
    expect(next.tournaments[0].pools[0].teamIds).toContain('team1');
  });

  it('removes team from previous pool when reassigned', () => {
    const team = makeTeam({ id: 'team1', poolId: 'pool1' });
    const pool1 = makePool({ id: 'pool1', teamIds: ['team1'] });
    const pool2 = makePool({ id: 'pool2', teamIds: [] });
    const t = makeTournament({ id: 't1', teams: [team], pools: [pool1, pool2] });
    const state = makeState({ tournaments: [t] });
    const next = reducer(state, { type: 'ASSIGN_TEAM_TO_POOL', payload: { tournamentId: 't1', teamId: 'team1', poolId: 'pool2' } });
    expect(next.tournaments[0].pools[0].teamIds).not.toContain('team1');
    expect(next.tournaments[0].pools[1].teamIds).toContain('team1');
  });

  it('does not duplicate team in target pool if already assigned', () => {
    const team = makeTeam({ id: 'team1', poolId: 'pool1' });
    const pool = makePool({ id: 'pool1', teamIds: ['team1'] });
    const t = makeTournament({ id: 't1', teams: [team], pools: [pool] });
    const state = makeState({ tournaments: [t] });
    const next = reducer(state, { type: 'ASSIGN_TEAM_TO_POOL', payload: { tournamentId: 't1', teamId: 'team1', poolId: 'pool1' } });
    expect(next.tournaments[0].pools[0].teamIds.filter(id => id === 'team1')).toHaveLength(1);
  });
});

// ─── CLEAR_POOL_FIXTURES ─────────────────────────────────────────────────────

describe('CLEAR_POOL_FIXTURES', () => {
  it('removes unplayed fixtures from the pool', () => {
    const f1 = makeFixture({ id: 'f1', played: false });
    const f2 = makeFixture({ id: 'f2', played: true, homeScore: 30, awayScore: 20 });
    const t = makeTournament({ id: 't1', fixtures: [f1, f2] });
    const state = makeState({ tournaments: [t] });
    const next = reducer(state, { type: 'CLEAR_POOL_FIXTURES', payload: { tournamentId: 't1', poolId: 'pool1' } });
    expect(next.tournaments[0].fixtures).toHaveLength(1);
    expect(next.tournaments[0].fixtures[0].id).toBe('f2');
  });

  it('does not touch fixtures from other pools', () => {
    const f1 = makeFixture({ id: 'f1', poolId: 'pool2', played: false });
    const t = makeTournament({ id: 't1', fixtures: [f1] });
    const state = makeState({ tournaments: [t] });
    const next = reducer(state, { type: 'CLEAR_POOL_FIXTURES', payload: { tournamentId: 't1', poolId: 'pool1' } });
    expect(next.tournaments[0].fixtures).toHaveLength(1);
  });
});

// ─── ADD_FIXTURES ─────────────────────────────────────────────────────────────

describe('ADD_FIXTURES', () => {
  it('appends fixtures to tournament', () => {
    const t = makeTournament({ id: 't1' });
    const state = makeState({ tournaments: [t] });
    const newFixtures = [makeFixture({ id: 'f1' }), makeFixture({ id: 'f2' })];
    const next = reducer(state, { type: 'ADD_FIXTURES', payload: { tournamentId: 't1', fixtures: newFixtures } });
    expect(next.tournaments[0].fixtures).toHaveLength(2);
  });
});

// ─── UPDATE_FIXTURE ──────────────────────────────────────────────────────────

describe('UPDATE_FIXTURE', () => {
  it('updates matching fixture', () => {
    const f = makeFixture({ id: 'f1', played: false });
    const t = makeTournament({ id: 't1', fixtures: [f] });
    const state = makeState({ tournaments: [t] });
    const next = reducer(state, {
      type: 'UPDATE_FIXTURE',
      payload: { tournamentId: 't1', fixture: { id: 'f1', homeScore: 30, awayScore: 20, played: true } },
    });
    const updated = next.tournaments[0].fixtures[0];
    expect(updated.played).toBe(true);
    expect(updated.homeScore).toBe(30);
  });
});

// ─── Default ─────────────────────────────────────────────────────────────────

describe('unknown action', () => {
  it('returns state unchanged', () => {
    const state = makeState({ tournaments: [] });
    const next = reducer(state, { type: 'UNKNOWN_ACTION' });
    expect(next).toBe(state); // same reference
  });
});
