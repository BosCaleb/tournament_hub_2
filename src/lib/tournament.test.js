import { describe, it, expect } from 'vitest';
import {
  createTournament,
  calculateStandings,
  generateRoundRobin,
  getTournamentStats,
  generatePlayoffs,
  advancePlayoffWinner,
} from './tournament.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeTeam(id, name) {
  return { id, name, colors: { primary: '#112240' }, poolId: null };
}

function makePool(id, teamIds) {
  return { id, name: `Pool ${id}`, teamIds };
}

function makeFixture(overrides) {
  return {
    id: `f-${Math.random()}`,
    poolId: 'pool1',
    homeTeamId: 't1',
    awayTeamId: 't2',
    homeScore: null,
    awayScore: null,
    played: false,
    round: 1,
    date: null,
    time: null,
    venue: null,
    court: null,
    ...overrides,
  };
}

function makeTournament(overrides = {}) {
  return {
    ...createTournament({ name: 'Test Tournament' }),
    ...overrides,
  };
}

// ─── createTournament ────────────────────────────────────────────────────────

describe('createTournament', () => {
  it('returns a tournament with required default fields', () => {
    const t = createTournament();
    expect(t.id).toBeTruthy();
    expect(t.teams).toEqual([]);
    expect(t.pools).toEqual([]);
    expect(t.fixtures).toEqual([]);
    expect(t.playoffs).toEqual([]);
    expect(t.players).toEqual([]);
    expect(t.pointsForWin).toBe(2);
    expect(t.pointsForDraw).toBe(1);
    expect(t.pointsForLoss).toBe(0);
    expect(t.sport).toBe('netball');
    expect(t.tiebreakMethod).toBe('goal-difference');
  });

  it('applies overrides correctly', () => {
    const t = createTournament({ name: 'Cup 2025', ageGroup: 'U16' });
    expect(t.name).toBe('Cup 2025');
    expect(t.ageGroup).toBe('U16');
  });

  it('generates a unique id each time', () => {
    const a = createTournament();
    const b = createTournament();
    expect(a.id).not.toBe(b.id);
  });
});

// ─── calculateStandings ──────────────────────────────────────────────────────

describe('calculateStandings', () => {
  function buildTournament(fixtures) {
    const teams = [
      makeTeam('t1', 'Team A'),
      makeTeam('t2', 'Team B'),
      makeTeam('t3', 'Team C'),
    ];
    const pool = makePool('pool1', ['t1', 't2', 't3']);
    return makeTournament({ teams, pools: [pool], fixtures });
  }

  it('returns empty array for unknown pool', () => {
    const t = buildTournament([]);
    expect(calculateStandings(t, 'nope')).toEqual([]);
  });

  it('all zeros when no fixtures played', () => {
    const t = buildTournament([]);
    const standings = calculateStandings(t, 'pool1');
    expect(standings).toHaveLength(3);
    standings.forEach(s => {
      expect(s.played).toBe(0);
      expect(s.points).toBe(0);
    });
  });

  it('winner gets 2 points, loser 0 (SA rules)', () => {
    const t = buildTournament([
      makeFixture({ homeTeamId: 't1', awayTeamId: 't2', homeScore: 30, awayScore: 20, played: true }),
    ]);
    const standings = calculateStandings(t, 'pool1');
    const t1 = standings.find(s => s.teamId === 't1');
    const t2 = standings.find(s => s.teamId === 't2');
    expect(t1.points).toBe(2);
    expect(t1.won).toBe(1);
    expect(t2.points).toBe(0);
    expect(t2.lost).toBe(1);
  });

  it('draw gives 1 point each', () => {
    const t = buildTournament([
      makeFixture({ homeTeamId: 't1', awayTeamId: 't2', homeScore: 25, awayScore: 25, played: true }),
    ]);
    const standings = calculateStandings(t, 'pool1');
    const t1 = standings.find(s => s.teamId === 't1');
    const t2 = standings.find(s => s.teamId === 't2');
    expect(t1.points).toBe(1);
    expect(t1.drawn).toBe(1);
    expect(t2.points).toBe(1);
    expect(t2.drawn).toBe(1);
  });

  it('sorts by points descending', () => {
    const t = buildTournament([
      makeFixture({ homeTeamId: 't1', awayTeamId: 't2', homeScore: 30, awayScore: 20, played: true }),
      makeFixture({ homeTeamId: 't1', awayTeamId: 't3', homeScore: 25, awayScore: 15, played: true }),
    ]);
    const standings = calculateStandings(t, 'pool1');
    expect(standings[0].teamId).toBe('t1');
    expect(standings[0].points).toBe(4);
  });

  it('tiebreaks by goal difference when points equal', () => {
    const t = buildTournament([
      makeFixture({ homeTeamId: 't1', awayTeamId: 't3', homeScore: 30, awayScore: 10, played: true }), // t1 +20
      makeFixture({ homeTeamId: 't2', awayTeamId: 't3', homeScore: 25, awayScore: 15, played: true }), // t2 +10
    ]);
    const standings = calculateStandings(t, 'pool1');
    // t1 and t2 both have 2pts, t1 has better GD
    expect(standings[0].teamId).toBe('t1');
    expect(standings[1].teamId).toBe('t2');
  });

  it('tiebreaks by goals-for when GD equal', () => {
    const t = buildTournament([
      makeFixture({ homeTeamId: 't1', awayTeamId: 't3', homeScore: 30, awayScore: 20, played: true }), // t1 GF=30, GD=+10
      makeFixture({ homeTeamId: 't2', awayTeamId: 't3', homeScore: 25, awayScore: 15, played: true }), // t2 GF=25, GD=+10
    ]);
    const standings = calculateStandings(t, 'pool1');
    // Equal points and GD — higher GF wins
    const first = standings[0];
    const second = standings[1];
    expect(first.goalsFor).toBeGreaterThan(second.goalsFor);
  });

  it('limits form to last 5 results', () => {
    const fixtures = [
      makeFixture({ homeTeamId: 't1', awayTeamId: 't2', homeScore: 30, awayScore: 20, played: true, round: 1 }),
      makeFixture({ homeTeamId: 't1', awayTeamId: 't2', homeScore: 30, awayScore: 20, played: true, round: 2 }),
      makeFixture({ homeTeamId: 't1', awayTeamId: 't2', homeScore: 30, awayScore: 20, played: true, round: 3 }),
      makeFixture({ homeTeamId: 't1', awayTeamId: 't2', homeScore: 30, awayScore: 20, played: true, round: 4 }),
      makeFixture({ homeTeamId: 't1', awayTeamId: 't2', homeScore: 30, awayScore: 20, played: true, round: 5 }),
      makeFixture({ homeTeamId: 't1', awayTeamId: 't2', homeScore: 30, awayScore: 20, played: true, round: 6 }),
    ];
    const t = buildTournament(fixtures);
    const standings = calculateStandings(t, 'pool1');
    const t1 = standings.find(s => s.teamId === 't1');
    expect(t1.form).toHaveLength(5);
  });

  it('ignores unplayed fixtures', () => {
    const t = buildTournament([
      makeFixture({ homeTeamId: 't1', awayTeamId: 't2', played: false }),
    ]);
    const standings = calculateStandings(t, 'pool1');
    standings.forEach(s => expect(s.played).toBe(0));
  });

  it('ignores fixtures from other pools', () => {
    const teams = [makeTeam('t1', 'A'), makeTeam('t2', 'B')];
    const pool = makePool('pool1', ['t1', 't2']);
    const fixture = makeFixture({ poolId: 'pool2', homeTeamId: 't1', awayTeamId: 't2', homeScore: 30, awayScore: 20, played: true });
    const t = makeTournament({ teams, pools: [pool], fixtures: [fixture] });
    const standings = calculateStandings(t, 'pool1');
    expect(standings[0].played).toBe(0);
  });
});

// ─── generateRoundRobin ──────────────────────────────────────────────────────

describe('generateRoundRobin', () => {
  it('2 teams → 1 fixture', () => {
    const pool = makePool('pool1', ['t1', 't2']);
    const fixtures = generateRoundRobin(pool, []);
    expect(fixtures).toHaveLength(1);
  });

  it('4 teams → 6 fixtures', () => {
    const pool = makePool('pool1', ['t1', 't2', 't3', 't4']);
    const fixtures = generateRoundRobin(pool, []);
    expect(fixtures).toHaveLength(6);
  });

  it('3 teams (odd) → 3 fixtures, no BYE in output', () => {
    const pool = makePool('pool1', ['t1', 't2', 't3']);
    const fixtures = generateRoundRobin(pool, []);
    expect(fixtures).toHaveLength(3);
    fixtures.forEach(f => {
      expect(f.homeTeamId).not.toBe('BYE');
      expect(f.awayTeamId).not.toBe('BYE');
    });
  });

  it('each team plays every other exactly once', () => {
    const pool = makePool('pool1', ['t1', 't2', 't3', 't4']);
    const fixtures = generateRoundRobin(pool, []);
    const matchCounts = {};
    fixtures.forEach(f => {
      const key = [f.homeTeamId, f.awayTeamId].sort().join('-');
      matchCounts[key] = (matchCounts[key] || 0) + 1;
    });
    Object.values(matchCounts).forEach(count => expect(count).toBe(1));
  });

  it('returns empty array for fewer than 2 teams', () => {
    const pool = makePool('pool1', ['t1']);
    expect(generateRoundRobin(pool, [])).toEqual([]);
  });

  it('skips fixtures that already exist', () => {
    const pool = makePool('pool1', ['t1', 't2', 't3', 't4']);
    const existing = [
      makeFixture({ poolId: 'pool1', homeTeamId: 't1', awayTeamId: 't2' }),
    ];
    const fixtures = generateRoundRobin(pool, existing);
    // 6 total - 1 existing = 5 new
    expect(fixtures).toHaveLength(5);
    // The existing pairing should not appear
    const hasExisting = fixtures.some(
      f => (f.homeTeamId === 't1' && f.awayTeamId === 't2') ||
           (f.homeTeamId === 't2' && f.awayTeamId === 't1')
    );
    expect(hasExisting).toBe(false);
  });

  it('all generated fixtures belong to the correct pool', () => {
    const pool = makePool('pool1', ['t1', 't2', 't3']);
    const fixtures = generateRoundRobin(pool, []);
    fixtures.forEach(f => expect(f.poolId).toBe('pool1'));
  });

  it('generated fixtures start as unplayed with null scores', () => {
    const pool = makePool('pool1', ['t1', 't2']);
    const [fixture] = generateRoundRobin(pool, []);
    expect(fixture.played).toBe(false);
    expect(fixture.homeScore).toBeNull();
    expect(fixture.awayScore).toBeNull();
  });
});

// ─── getTournamentStats ──────────────────────────────────────────────────────

describe('getTournamentStats', () => {
  it('zero stats for empty tournament', () => {
    const t = makeTournament();
    const stats = getTournamentStats(t);
    expect(stats.totalTeams).toBe(0);
    expect(stats.totalFixtures).toBe(0);
    expect(stats.completionPct).toBe(0);
    expect(stats.totalGoals).toBe(0);
  });

  it('calculates completion percentage correctly', () => {
    const t = makeTournament({
      teams: [makeTeam('t1', 'A'), makeTeam('t2', 'B')],
      fixtures: [
        makeFixture({ played: true, homeScore: 20, awayScore: 15 }),
        makeFixture({ played: false }),
      ],
    });
    const stats = getTournamentStats(t);
    expect(stats.playedFixtures).toBe(1);
    expect(stats.remainingFixtures).toBe(1);
    expect(stats.completionPct).toBe(50);
    expect(stats.totalGoals).toBe(35);
  });
});

// ─── generatePlayoffs ────────────────────────────────────────────────────────

describe('generatePlayoffs', () => {
  function buildTwoPoolTournament() {
    const teams = ['t1','t2','t3','t4'].map(id => makeTeam(id, id));
    const pools = [
      makePool('pool1', ['t1', 't2']),
      makePool('pool2', ['t3', 't4']),
    ];
    const fixtures = [
      makeFixture({ poolId: 'pool1', homeTeamId: 't1', awayTeamId: 't2', homeScore: 30, awayScore: 20, played: true }),
      makeFixture({ poolId: 'pool2', homeTeamId: 't3', awayTeamId: 't4', homeScore: 30, awayScore: 20, played: true }),
    ];
    return makeTournament({ teams, pools, fixtures });
  }

  it('returns empty for no pools', () => {
    expect(generatePlayoffs(makeTournament(), 2)).toEqual([]);
  });

  it('2 pools × top 1 → 2-team bracket (final + 3rd place)', () => {
    const t = buildTwoPoolTournament();
    const playoffs = generatePlayoffs(t, 1);
    const mainMatches = playoffs.filter(m => !m.isThirdPlace);
    const thirdPlace = playoffs.filter(m => m.isThirdPlace);
    // With 2 qualifiers → bracketSize=2 → 1 match (the final)
    expect(mainMatches).toHaveLength(1);
    // 3rd place only generated when bracketSize >= 4
    expect(thirdPlace).toHaveLength(0);
  });

  it('2 pools × top 2 → 4-team bracket with semis, final, 3rd place', () => {
    // Need 4 teams across 2 pools
    const teams = ['t1','t2','t3','t4'].map(id => makeTeam(id, id));
    const pools = [
      makePool('pool1', ['t1', 't2']),
      makePool('pool2', ['t3', 't4']),
    ];
    const fixtures = [
      makeFixture({ poolId: 'pool1', homeTeamId: 't1', awayTeamId: 't2', homeScore: 30, awayScore: 20, played: true }),
      makeFixture({ poolId: 'pool2', homeTeamId: 't3', awayTeamId: 't4', homeScore: 30, awayScore: 20, played: true }),
    ];
    const t = makeTournament({ teams, pools, fixtures });
    const playoffs = generatePlayoffs(t, 2);
    const semis = playoffs.filter(m => m.round === 2 && !m.isThirdPlace);
    const finals = playoffs.filter(m => m.round === 1 && !m.isThirdPlace);
    const thirdPlace = playoffs.filter(m => m.isThirdPlace);
    expect(semis).toHaveLength(2);
    expect(finals).toHaveLength(1);
    expect(thirdPlace).toHaveLength(1);
  });

  it('qualifiers are seeded from standings (top teams get lower seeds)', () => {
    const t = buildTwoPoolTournament();
    const playoffs = generatePlayoffs(t, 1);
    // Top of pool1 = t1, top of pool2 = t3
    const first = playoffs[0];
    expect(['t1', 't3']).toContain(first.homeTeamId);
  });
});

// ─── advancePlayoffWinner ────────────────────────────────────────────────────

describe('advancePlayoffWinner', () => {
  function makeSemiFinalBracket() {
    // 4-team bracket: 2 semis (round=2), 1 final (round=1), 1 third place
    return [
      { id: 'semi1', round: 2, position: 1, homeTeamId: 't1', awayTeamId: 't2', homeScore: 30, awayScore: 20, played: true, isThirdPlace: false },
      { id: 'semi2', round: 2, position: 2, homeTeamId: 't3', awayTeamId: 't4', homeScore: null, awayScore: null, played: false, isThirdPlace: false },
      { id: 'final', round: 1, position: 1, homeTeamId: null, awayTeamId: null, homeScore: null, awayScore: null, played: false, isThirdPlace: false },
      { id: 'third', round: 0, position: 1, homeTeamId: null, awayTeamId: null, homeScore: null, awayScore: null, played: false, isThirdPlace: true },
    ];
  }

  it('advances winner of semi1 (position 1) to homeTeamId of final', () => {
    const bracket = makeSemiFinalBracket();
    const updated = advancePlayoffWinner(bracket, 'semi1');
    const final = updated.find(m => m.id === 'final');
    expect(final.homeTeamId).toBe('t1'); // t1 beat t2
  });

  it('advances loser of semi1 to 3rd place match homeTeamId', () => {
    const bracket = makeSemiFinalBracket();
    const updated = advancePlayoffWinner(bracket, 'semi1');
    const third = updated.find(m => m.id === 'third');
    expect(third.homeTeamId).toBe('t2'); // t2 lost
  });

  it('does nothing if match not played', () => {
    const bracket = makeSemiFinalBracket();
    // semi2 is not played
    const updated = advancePlayoffWinner(bracket, 'semi2');
    const final = updated.find(m => m.id === 'final');
    expect(final.homeTeamId).toBeNull();
  });

  it('does nothing for isThirdPlace match', () => {
    const bracket = [
      { id: 'third', round: 0, position: 1, homeTeamId: 't1', awayTeamId: 't2', homeScore: 25, awayScore: 20, played: true, isThirdPlace: true },
    ];
    const updated = advancePlayoffWinner(bracket, 'third');
    expect(updated).toEqual(bracket);
  });
});
