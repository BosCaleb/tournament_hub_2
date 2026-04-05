-- ============================================================
-- 002_analytics_views.sql
-- Run once in the Supabase SQL editor.
-- Safe to re-run (CREATE OR REPLACE).
-- ============================================================

-- ── 1. Flattened fixture results ──────────────────────────────────────────────
-- One row per played fixture across all hub tournaments.
-- Use this for scoreline reports, goal tallies, win/loss records.
CREATE OR REPLACE VIEW hub_fixture_stats AS
SELECT
  (data->>'id')            AS tournament_id,
  (data->>'name')          AS tournament_name,
  (data->>'sport')         AS sport,
  (data->>'ageGroup')      AS age_group,
  (data->>'startDate')     AS start_date,
  (data->>'status')        AS status,
  f->>'id'                 AS fixture_id,
  (f->>'round')::int       AS round,
  (f->>'poolId')           AS pool_id,
  (f->>'homeTeamId')       AS home_team_id,
  (f->>'awayTeamId')       AS away_team_id,
  (f->>'homeScore')::int   AS home_score,
  (f->>'awayScore')::int   AS away_score,
  (f->>'played')::boolean  AS played,
  CASE
    WHEN (f->>'homeScore')::int > (f->>'awayScore')::int THEN 'home'
    WHEN (f->>'homeScore')::int < (f->>'awayScore')::int THEN 'away'
    ELSE 'draw'
  END                      AS result,
  ABS(
    (f->>'homeScore')::int - (f->>'awayScore')::int
  )                        AS goal_difference
FROM statedge_hub_tournaments,
     jsonb_array_elements(data->'fixtures') AS f
WHERE (f->>'played')::boolean = true;


-- ── 2. Team standings per tournament ─────────────────────────────────────────
-- Aggregated standings: played, won, drawn, lost, goals for/against, points.
-- Mirrors what the app computes in JavaScript — useful for server-side reports.
CREATE OR REPLACE VIEW hub_team_standings AS
WITH all_results AS (
  -- Home perspective
  SELECT
    (data->>'id')           AS tournament_id,
    (data->>'name')         AS tournament_name,
    (data->>'sport')        AS sport,
    (data->>'pointsForWin')::int   AS pts_win,
    (data->>'pointsForDraw')::int  AS pts_draw,
    (data->>'pointsForLoss')::int  AS pts_loss,
    f->>'homeTeamId'        AS team_id,
    (f->>'homeScore')::int  AS goals_for,
    (f->>'awayScore')::int  AS goals_against,
    CASE
      WHEN (f->>'homeScore')::int > (f->>'awayScore')::int THEN 'win'
      WHEN (f->>'homeScore')::int = (f->>'awayScore')::int THEN 'draw'
      ELSE 'loss'
    END AS outcome
  FROM statedge_hub_tournaments,
       jsonb_array_elements(data->'fixtures') AS f
  WHERE (f->>'played')::boolean = true

  UNION ALL

  -- Away perspective
  SELECT
    (data->>'id')           AS tournament_id,
    (data->>'name')         AS tournament_name,
    (data->>'sport')        AS sport,
    (data->>'pointsForWin')::int   AS pts_win,
    (data->>'pointsForDraw')::int  AS pts_draw,
    (data->>'pointsForLoss')::int  AS pts_loss,
    f->>'awayTeamId'        AS team_id,
    (f->>'awayScore')::int  AS goals_for,
    (f->>'homeScore')::int  AS goals_against,
    CASE
      WHEN (f->>'awayScore')::int > (f->>'homeScore')::int THEN 'win'
      WHEN (f->>'awayScore')::int = (f->>'homeScore')::int THEN 'draw'
      ELSE 'loss'
    END AS outcome
  FROM statedge_hub_tournaments,
       jsonb_array_elements(data->'fixtures') AS f
  WHERE (f->>'played')::boolean = true
),
team_names AS (
  SELECT
    (data->>'id') AS tournament_id,
    t->>'id'      AS team_id,
    t->>'name'    AS team_name
  FROM statedge_hub_tournaments,
       jsonb_array_elements(data->'teams') AS t
)
SELECT
  r.tournament_id,
  r.tournament_name,
  r.sport,
  r.team_id,
  tn.team_name,
  COUNT(*)                                          AS played,
  COUNT(*) FILTER (WHERE outcome = 'win')           AS won,
  COUNT(*) FILTER (WHERE outcome = 'draw')          AS drawn,
  COUNT(*) FILTER (WHERE outcome = 'loss')          AS lost,
  SUM(goals_for)                                    AS goals_for,
  SUM(goals_against)                                AS goals_against,
  SUM(goals_for) - SUM(goals_against)               AS goal_difference,
  SUM(
    CASE outcome
      WHEN 'win'  THEN pts_win
      WHEN 'draw' THEN pts_draw
      ELSE pts_loss
    END
  )                                                 AS points
FROM all_results r
LEFT JOIN team_names tn
  ON r.tournament_id = tn.tournament_id
  AND r.team_id = tn.team_id
GROUP BY r.tournament_id, r.tournament_name, r.sport, r.team_id, tn.team_name
ORDER BY r.tournament_id, points DESC, goal_difference DESC;


-- ── 3. Tournament summary ─────────────────────────────────────────────────────
-- One row per tournament with headline stats for a dashboard/report index.
CREATE OR REPLACE VIEW hub_tournament_summary AS
SELECT
  id                           AS tournament_id,
  name                         AS tournament_name,
  sport,
  data->>'ageGroup'            AS age_group,
  data->>'status'              AS status,
  data->>'startDate'           AS start_date,
  data->>'endDate'             AS end_date,
  data->>'venue'               AS venue,
  data->>'organizingBody'      AS organizing_body,
  jsonb_array_length(data->'teams')    AS team_count,
  jsonb_array_length(data->'fixtures') AS fixture_count,
  jsonb_array_length(data->'pools')    AS pool_count,
  (
    SELECT COUNT(*)
    FROM jsonb_array_elements(data->'fixtures') f
    WHERE (f->>'played')::boolean = true
  )                            AS fixtures_played,
  created_at,
  updated_at
FROM statedge_hub_tournaments
ORDER BY created_at DESC;


-- ── Grant read access to anon role (matches RLS policy) ──────────────────────
GRANT SELECT ON hub_fixture_stats      TO anon;
GRANT SELECT ON hub_team_standings     TO anon;
GRANT SELECT ON hub_tournament_summary TO anon;
