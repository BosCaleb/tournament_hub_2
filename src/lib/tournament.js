import { generateId } from './utils.js';

/** Create a new blank tournament */
export function createTournament(overrides = {}) {
  return {
    id: generateId(),
    name: 'New Tournament',
    managerName: '',
    organizingBody: '',
    logoBase64: null,
    venue: '',
    startDate: null,
    endDate: null,
    ageGroup: '',
    teams: [],
    pools: [],
    fixtures: [],
    playoffs: [],
    players: [],
    pointsForWin: 2,
    pointsForDraw: 1,
    pointsForLoss: 0,
    tiebreakMethod: 'goal-difference',
    sport: 'netball',
    adminPinHash: null,
    // ─── New feature fields ───────────────────────────────────────
    lockedRounds: [],          // array of round numbers that are locked
    roundNames: {},            // { [roundNumber]: string } custom round labels
    playoffFlows: [],          // array of { id, name, matches[] } playoff flows
    rankingLists: [],          // array of { id, name, teamIds[] } custom ranked lists
    deletedItems: { teams: [], fixtures: [], players: [] }, // soft-delete recycle bin
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

/** Calculate standings for a pool */
export function calculateStandings(tournament, poolId) {
  const pool = tournament.pools.find(p => p.id === poolId);
  if (!pool) return [];

  const fixtures = tournament.fixtures.filter(
    f => f.poolId === poolId && f.played && f.homeScore !== null
  );

  const map = {};
  pool.teamIds.forEach(tid => {
    const team = tournament.teams.find(t => t.id === tid);
    map[tid] = {
      teamId: tid,
      teamName: team?.name || 'Unknown',
      schoolName: team?.schoolName || '',
      colors: team?.colors || {},
      played: 0, won: 0, drawn: 0, lost: 0,
      goalsFor: 0, goalsAgainst: 0, goalDifference: 0,
      points: 0, form: [],
    };
  });

  fixtures.forEach(f => {
    const h = map[f.homeTeamId];
    const a = map[f.awayTeamId];
    if (!h || !a) return;

    h.played++; a.played++;
    h.goalsFor += f.homeScore; h.goalsAgainst += f.awayScore;
    a.goalsFor += f.awayScore; a.goalsAgainst += f.homeScore;

    if (f.homeScore > f.awayScore) {
      h.won++; h.points += tournament.pointsForWin; h.form.push('W');
      a.lost++; a.points += tournament.pointsForLoss; a.form.push('L');
    } else if (f.homeScore < f.awayScore) {
      a.won++; a.points += tournament.pointsForWin; a.form.push('W');
      h.lost++; h.points += tournament.pointsForLoss; h.form.push('L');
    } else {
      h.drawn++; h.points += tournament.pointsForDraw; h.form.push('D');
      a.drawn++; a.points += tournament.pointsForDraw; a.form.push('D');
    }
  });

  Object.values(map).forEach(s => {
    s.goalDifference = s.goalsFor - s.goalsAgainst;
    s.form = s.form.slice(-5); // last 5
  });

  return Object.values(map).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (tournament.tiebreakMethod === 'goal-difference') {
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      return b.goalsFor - a.goalsFor;
    }
    if (tournament.tiebreakMethod === 'goals-for') {
      return b.goalsFor - a.goalsFor;
    }
    // head-to-head: fallback to goal difference
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    return b.goalsFor - a.goalsFor;
  });
}

/** Generate round-robin fixtures for a pool */
export function generateRoundRobin(pool, existingFixtures = []) {
  const teams = [...pool.teamIds];
  if (teams.length < 2) return [];

  // If odd, add a BYE
  const hasBye = teams.length % 2 !== 0;
  if (hasBye) teams.push('BYE');

  const n = teams.length;
  const rounds = n - 1;
  const newFixtures = [];

  for (let round = 0; round < rounds; round++) {
    for (let match = 0; match < n / 2; match++) {
      const home = teams[match];
      const away = teams[n - 1 - match];
      if (home === 'BYE' || away === 'BYE') continue;

      // Skip if fixture already exists
      const exists = existingFixtures.some(
        f => f.poolId === pool.id &&
          ((f.homeTeamId === home && f.awayTeamId === away) ||
           (f.homeTeamId === away && f.awayTeamId === home))
      );
      if (exists) continue;

      newFixtures.push({
        id: generateId(),
        poolId: pool.id,
        homeTeamId: home,
        awayTeamId: away,
        homeScore: null,
        awayScore: null,
        quarterScores: null,
        played: false,
        round: round + 1,
        date: null,
        time: null,
        venue: null,
        court: null,
        officials: null,
      });
    }
    // Rotate teams (keep first fixed)
    teams.splice(1, 0, teams.pop());
  }

  return newFixtures;
}

/** Get overall tournament stats */
export function getTournamentStats(tournament) {
  const totalFixtures = tournament.fixtures.length;
  const playedFixtures = tournament.fixtures.filter(f => f.played).length;
  const totalGoals = tournament.fixtures
    .filter(f => f.played)
    .reduce((sum, f) => sum + (f.homeScore || 0) + (f.awayScore || 0), 0);
  const avgGoals = playedFixtures > 0 ? (totalGoals / playedFixtures).toFixed(1) : 0;

  return {
    totalTeams: tournament.teams.length,
    totalPools: tournament.pools.length,
    totalFixtures,
    playedFixtures,
    remainingFixtures: totalFixtures - playedFixtures,
    completionPct: totalFixtures > 0 ? Math.round((playedFixtures / totalFixtures) * 100) : 0,
    totalGoals,
    avgGoalsPerMatch: avgGoals,
    totalPlayers: tournament.players.length,
  };
}

/** Get top goal scorers across tournament */
export function getTopScorers(tournament, limit = 10) {
  const scorers = [];
  tournament.players.forEach(player => {
    if (!player.goalsScored) return;
    const total = Object.values(player.goalsScored).reduce((s, v) => s + v, 0);
    if (total > 0) {
      const team = tournament.teams.find(t => t.id === player.teamId);
      scorers.push({ ...player, totalGoals: total, teamName: team?.name || '—' });
    }
  });
  return scorers.sort((a, b) => b.totalGoals - a.totalGoals).slice(0, limit);
}

/** Get recent results across all pools */
export function getRecentResults(tournament, limit = 6) {
  return tournament.fixtures
    .filter(f => f.played && f.homeScore !== null)
    .sort((a, b) => {
      if (a.date && b.date) return b.date.localeCompare(a.date);
      return 0;
    })
    .slice(0, limit);
}

/** Get upcoming fixtures */
export function getUpcomingFixtures(tournament, limit = 6) {
  const today = new Date().toISOString().split('T')[0];
  return tournament.fixtures
    .filter(f => !f.played)
    .sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return a.date.localeCompare(b.date);
    })
    .slice(0, limit);
}

/** Generate playoff bracket from pool standings */
export function generatePlayoffs(tournament, teamsPerPool = 2) {
  const qualifiers = [];
  tournament.pools.forEach(pool => {
    const standings = calculateStandings(tournament, pool.id);
    standings.slice(0, teamsPerPool).forEach((s, i) => {
      qualifiers.push({ teamId: s.teamId, seed: qualifiers.length + 1 });
    });
  });

  const n = qualifiers.length;
  if (n < 2) return [];

  // Find next power of 2
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(n)));
  const matches = [];

  // Generate first round
  for (let i = 0; i < bracketSize / 2; i++) {
    const home = qualifiers[i] || null;
    const away = qualifiers[bracketSize - 1 - i] || null;
    matches.push({
      id: generateId(),
      round: bracketSize / 2, // QF, SF, F
      position: i + 1,
      homeTeamId: home?.teamId || null,
      awayTeamId: away?.teamId || null,
      homeScore: null,
      awayScore: null,
      played: false,
      isThirdPlace: false,
    });
  }

  // Add subsequent rounds (TBD)
  let roundSize = bracketSize / 4;
  while (roundSize >= 1) {
    for (let i = 0; i < roundSize; i++) {
      matches.push({
        id: generateId(),
        round: roundSize,
        position: i + 1,
        homeTeamId: null,
        awayTeamId: null,
        homeScore: null,
        awayScore: null,
        played: false,
        isThirdPlace: false,
      });
    }
    roundSize = Math.floor(roundSize / 2);
  }

  // 3rd place match
  if (bracketSize >= 4) {
    matches.push({
      id: generateId(),
      round: 0,
      position: 1,
      homeTeamId: null,
      awayTeamId: null,
      homeScore: null,
      awayScore: null,
      played: false,
      isThirdPlace: true,
    });
  }

  return matches;
}

/** Advance winner through bracket */
export function advancePlayoffWinner(playoffs, matchId) {
  const match = playoffs.find(m => m.id === matchId);
  if (!match || !match.played || match.isThirdPlace) return playoffs;

  const winnerId = match.homeScore > match.awayScore ? match.homeTeamId : match.awayTeamId;
  const loserId = match.homeScore > match.awayScore ? match.awayTeamId : match.homeTeamId;

  // Find next round match
  const nextRound = Math.floor(match.round / 2);
  if (nextRound === 0) return playoffs; // Already final

  const posInNext = Math.ceil(match.position / 2);
  const isFirstSlot = match.position % 2 !== 0;

  const updated = playoffs.map(m => {
    if (m.round === nextRound && m.position === posInNext) {
      return isFirstSlot
        ? { ...m, homeTeamId: winnerId }
        : { ...m, awayTeamId: winnerId };
    }
    // 3rd place match
    if (m.isThirdPlace && match.round === 2) {
      return isFirstSlot
        ? { ...m, homeTeamId: loserId }
        : { ...m, awayTeamId: loserId };
    }
    return m;
  });

  return updated;
}
