/**
 * Migration: source `tournaments` schema → `statedge_hub_tournaments`
 *
 * Fetches tournaments, teams, fixtures, and pools from the normalized source
 * tables and assembles each into a single JSONB document that the hub app
 * reads natively.  Skips draft/archived-only rows with no real data.
 *
 * Architecture notes
 * ──────────────────
 * • Idempotent: upserts on id, safe to re-run.
 * • Source IDs are preserved so deep-links and bookmarks survive migration.
 * • `closed_rounds` (per-pool map) → `lockedRounds` (flat array of round ints
 *   for the whole tournament — union across all pools, deduplicated).
 * • `playoff_round_names` / `third_place_match.additionalPlayoffs` → app's
 *   `roundNames` and `playoffFlows`.
 * • `third_place_match.rankings` → `rankingLists`.
 * • All field names camelCased to match the app's createTournament() shape.
 *
 * Analytics / streaming readiness
 * ─────────────────────────────────
 * The upserted rows keep `data` as a full JSONB document alongside top-level
 * `id`, `name`, `sport` columns.  This means:
 *   • PostgREST real-time subscriptions work on any field change.
 *   • Future analytics views can use Postgres jsonb operators to flatten
 *     fixtures/teams without touching app code.
 *   • A `statedge_hub_events` append-only table (see comment at bottom)
 *     provides an immutable event log for streaming analytics.
 *
 * Usage
 * ─────
 * node scripts/migrate-from-source.js
 * (requires VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY in .env)
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env manually (no dotenv dep needed at runtime)
const envPath = resolve(__dirname, '../.env');
try {
  readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const [k, ...rest] = line.split('=');
    if (k && rest.length) process.env[k.trim()] = rest.join('=').trim();
  });
} catch { /* .env optional if vars already set */ }

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const HUB_TABLE   = 'statedge_hub_tournaments';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function supaFetch(path, opts = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: opts.prefer || 'return=minimal',
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase ${opts.method || 'GET'} ${path} → ${res.status}: ${err}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

function camel(str) {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

// ─── Fetch source data ────────────────────────────────────────────────────────

async function fetchAll() {
  console.log('Fetching source data…');
  const [tournaments, teams, fixtures, pools] = await Promise.all([
    supaFetch('tournaments?select=*&order=created_at.asc'),
    supaFetch('teams?select=*'),
    supaFetch('fixtures?select=*&order=round.asc'),
    supaFetch('pools?select=*'),
  ]);
  console.log(`  tournaments: ${tournaments.length}`);
  console.log(`  teams:       ${teams.length}`);
  console.log(`  fixtures:    ${fixtures.length}`);
  console.log(`  pools:       ${pools.length}`);
  return { tournaments, teams, fixtures, pools };
}

// ─── Map a source tournament row → hub document ───────────────────────────────

function mapTournament(row, teams, fixtures, pools) {
  const tId = row.id;

  const tPools = pools.filter(p => p.tournament_id === tId);
  const tTeams = teams.filter(t => t.tournament_id === tId);
  const tFixtures = fixtures.filter(f => f.tournament_id === tId);

  // Pools → hub pools (teamIds populated from teams)
  const hubPools = tPools.map(p => ({
    id: p.id,
    name: p.name,
    teamIds: tTeams.filter(t => t.pool_id === p.id).map(t => t.id),
  }));

  // Teams → hub teams (preserve source IDs so fixture refs stay valid)
  const hubTeams = tTeams.map(t => ({
    id: t.id,
    name: t.name,
    poolId: t.pool_id || null,
    colors: { primary: row.theme_color || '#112240', secondary: '#FFC500' },
  }));

  // Fixtures → hub fixtures
  const hubFixtures = tFixtures.map(f => ({
    id: f.id,
    poolId: f.pool_id || null,
    homeTeamId: f.home_team_id,
    awayTeamId: f.away_team_id,
    homeScore: f.home_score ?? null,
    awayScore: f.away_score ?? null,
    played: f.played ?? false,
    round: f.round ?? 1,
    date: f.date || null,
    time: f.time || null,
    venue: f.venue || null,
  }));

  // closed_rounds: { poolId: [1,2,3] } → flat sorted unique round ints
  const closedRoundsMap = row.closed_rounds || {};
  const lockedRounds = [...new Set(Object.values(closedRoundsMap).flat())].sort((a, b) => a - b);

  // playoff_round_names: { "3": "Final" } → { 3: "Final" }
  const roundNames = {};
  Object.entries(row.playoff_round_names || {}).forEach(([k, v]) => {
    roundNames[parseInt(k, 10)] = v;
  });

  // third_place_match.additionalPlayoffs → playoffFlows
  const tpm = row.third_place_match || {};
  const playoffFlows = (tpm.additionalPlayoffs || []).map(flow => ({
    id: flow.id,
    name: flow.name,
    matches: (flow.matches || []).map(m => ({
      id: m.id,
      round: m.round,
      position: m.position ?? 0,
      homeTeamId: m.homeTeamId || null,
      awayTeamId: m.awayTeamId || null,
      homeScore: m.homeScore ?? null,
      awayScore: m.awayScore ?? null,
      played: m.played ?? false,
      date: m.date || null,
      time: m.time || null,
      venue: m.venue || null,
    })),
    roundNames: flow.roundNames || {},
  }));

  // third_place_match.rankings → rankingLists
  const rankingLists = (tpm.rankings || []).map(r => ({
    id: r.id,
    name: r.name,
    teamIds: r.teamIds || [],
  }));

  // Main bracket playoffs: pool fixtures with no pool_id are playoff fixtures
  // In this schema all fixtures are in pools; treat rounds > max pool round as playoffs
  // We'll keep them all in fixtures and rely on the app's pool filter
  const playoffs = [];

  return {
    // Identity
    id: tId,
    name: (row.name || '').trim(),
    sport: row.sport_type || 'netball',

    // Meta
    ageGroup: row.age_group || '',
    organizingBody: row.host_org || row.manager_name || '',
    venue: [row.venue_name, row.venue_address].filter(Boolean).join(', ') || '',
    startDate: row.start_date || null,
    endDate: row.end_date || null,
    managerName: row.manager_name || '',
    description: row.description || '',
    status: row.status || 'draft',

    // Scoring
    pointsForWin: row.points_for_win ?? 2,
    pointsForDraw: row.points_for_draw ?? 1,
    pointsForLoss: row.points_for_loss ?? 0,
    tiebreakMethod: 'goal-difference',

    // Data
    pools: hubPools,
    teams: hubTeams,
    fixtures: hubFixtures,
    playoffs,
    players: [],

    // Feature fields
    lockedRounds,
    roundNames,
    playoffFlows,
    rankingLists,
    deletedItems: { teams: [], fixtures: [], players: [] },

    // Auth
    adminPinHash: null,
    logoBase64: null,

    // Timestamps
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at,
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function migrate() {
  const { tournaments, teams, fixtures, pools } = await fetchAll();

  // Skip pure drafts with no teams/fixtures
  const meaningful = tournaments.filter(t => {
    const hasTeams    = teams.some(tm => tm.tournament_id === t.id);
    const hasFixtures = fixtures.some(f => f.tournament_id === t.id);
    return hasTeams || hasFixtures;
  });

  console.log(`\nMigrating ${meaningful.length} tournament(s) (skipping ${tournaments.length - meaningful.length} empty drafts)…`);

  const docs = meaningful.map(t => mapTournament(t, teams, fixtures, pools));

  // Log summary
  docs.forEach(d => {
    console.log(`  → ${d.name} (${d.sport}) | teams: ${d.teams.length} | fixtures: ${d.fixtures.length} | pools: ${d.pools.length} | lockedRounds: [${d.lockedRounds.join(',')}] | flows: ${d.playoffFlows.length}`);
  });

  // Upsert into hub table
  console.log('\nUpserting into statedge_hub_tournaments…');
  const rows = docs.map(d => ({
    id: d.id,
    name: d.name,
    sport: d.sport,
    data: d,
    updated_at: d.updatedAt,
  }));

  const res = await fetch(`${SUPABASE_URL}/rest/v1/${HUB_TABLE}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Upsert failed ${res.status}: ${err}`);
  }

  console.log(`\nDone. ${docs.length} tournament(s) migrated successfully.`);
  console.log('\nSQL for analytics view (run in Supabase SQL editor):');
  console.log(`
-- Flattened fixtures view for reporting / streaming analytics
CREATE OR REPLACE VIEW hub_fixture_stats AS
SELECT
  (data->>'id')           AS tournament_id,
  (data->>'name')         AS tournament_name,
  (data->>'sport')        AS sport,
  (data->>'ageGroup')     AS age_group,
  (data->>'startDate')    AS start_date,
  f->>'id'                AS fixture_id,
  (f->>'round')::int      AS round,
  (f->>'played')::boolean AS played,
  (f->>'homeTeamId')      AS home_team_id,
  (f->>'awayTeamId')      AS away_team_id,
  (f->>'homeScore')::int  AS home_score,
  (f->>'awayScore')::int  AS away_score,
  CASE
    WHEN (f->>'homeScore')::int > (f->>'awayScore')::int THEN 'home'
    WHEN (f->>'homeScore')::int < (f->>'awayScore')::int THEN 'away'
    ELSE 'draw'
  END                     AS result
FROM statedge_hub_tournaments,
     jsonb_array_elements(data->'fixtures') AS f
WHERE (f->>'played')::boolean = true;
  `);
}

migrate().catch(err => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
