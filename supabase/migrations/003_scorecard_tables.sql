-- ============================================================
-- 003_scorecard_tables.sql
-- Digital Netball Scorecard + Scorekeeper Mode
--
-- Run once in the Supabase SQL editor.
-- Safe to re-run (uses CREATE TABLE IF NOT EXISTS).
-- ============================================================

-- ── 1. Scorecard Templates ────────────────────────────────────────────────────
-- Reusable, branded scorecard templates created by admins.
-- Scope precedence (highest → lowest):
--   fixture → tournament → age_group → sport → global default
CREATE TABLE IF NOT EXISTS scorecard_templates (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name            TEXT NOT NULL,
  description     TEXT,
  -- Scope: global | sport | age_group | tournament | fixture
  scope_type      TEXT NOT NULL DEFAULT 'global'
                    CHECK (scope_type IN ('global','sport','age_group','tournament','fixture')),
  scope_id        TEXT,           -- tournament_id or fixture_id when scope_type needs it
  sport_code      TEXT NOT NULL DEFAULT 'netball',
  age_group       TEXT,
  is_default      BOOLEAN NOT NULL DEFAULT FALSE,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  -- Branding: logoUrl, schoolName, primaryColor, secondaryColor, accentColor,
  --           headerText, footerText, sponsorLogoUrl
  branding_config JSONB NOT NULL DEFAULT '{}',
  -- Layout: density, showQuarterBreakdown, showNotes, showOfficials,
  --         headerStyle, scoreControlsStyle
  layout_config   JSONB NOT NULL DEFAULT '{}',
  -- Fields: [{key, visible, order, label?}]
  field_config    JSONB NOT NULL DEFAULT '[]',
  created_by      TEXT,          -- scorekeeper name or admin identifier
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS scorecard_templates_scope_idx
  ON scorecard_templates (scope_type, scope_id, sport_code, age_group);

CREATE INDEX IF NOT EXISTS scorecard_templates_default_idx
  ON scorecard_templates (is_default, is_active, sport_code);

-- ── 2. Scorecard Instances ────────────────────────────────────────────────────
-- One per fixture — the live scorecard applied during a match.
-- Template config is SNAPSHOTTED so historical scorecards stay stable
-- even if the template is later edited.
CREATE TABLE IF NOT EXISTS scorecard_instances (
  id                        UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id             TEXT NOT NULL,
  fixture_id                TEXT NOT NULL UNIQUE,   -- one scorecard per fixture
  template_id               UUID REFERENCES scorecard_templates(id) ON DELETE SET NULL,
  -- Snapshots taken when template is applied (immutable for history)
  branding_snapshot         JSONB NOT NULL DEFAULT '{}',
  layout_snapshot           JSONB NOT NULL DEFAULT '{}',
  field_snapshot            JSONB NOT NULL DEFAULT '[]',
  -- Derived current state — maintained by triggers / app after each event
  -- { homeScore, awayScore, currentQuarter, quarterScores[], status, lastEventAt }
  current_state             JSONB NOT NULL DEFAULT '{"homeScore":0,"awayScore":0,"currentQuarter":1,"quarterScores":[],"status":"pending"}',
  -- Status: pending | live | paused | halftime | final | corrected
  status                    TEXT NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending','live','paused','halftime','final','corrected')),
  assigned_scorekeeper_name TEXT,
  started_at                TIMESTAMPTZ,
  finalised_at              TIMESTAMPTZ,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS scorecard_instances_tournament_idx
  ON scorecard_instances (tournament_id);

CREATE INDEX IF NOT EXISTS scorecard_instances_fixture_idx
  ON scorecard_instances (fixture_id);

CREATE INDEX IF NOT EXISTS scorecard_instances_status_idx
  ON scorecard_instances (status);

-- ── 3. Score Events ───────────────────────────────────────────────────────────
-- Immutable append-only event log. NEVER UPDATE or DELETE rows.
-- Event types: match_started | quarter_started | goal_added_home |
--   goal_added_away | goal_removed_home | goal_removed_away | quarter_ended |
--   halftime_started | halftime_ended | match_paused | match_resumed |
--   note_added | match_finalised | score_corrected | match_reopened
CREATE TABLE IF NOT EXISTS score_events (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  scorecard_instance_id UUID NOT NULL REFERENCES scorecard_instances(id) ON DELETE CASCADE,
  tournament_id         TEXT NOT NULL,
  fixture_id            TEXT NOT NULL,
  event_type            TEXT NOT NULL,
  team_side             TEXT CHECK (team_side IN ('home','away', NULL)),
  -- Payload: arbitrary metadata for the event (score at time, quarter, notes, etc.)
  event_payload         JSONB NOT NULL DEFAULT '{}',
  sequence_number       INTEGER NOT NULL,           -- monotonic per scorecard_instance
  created_by            TEXT NOT NULL DEFAULT '',   -- scorekeeper name
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Client-generated ID allows safe idempotent inserts from offline queue
  client_generated_id   TEXT UNIQUE
);

CREATE INDEX IF NOT EXISTS score_events_instance_idx
  ON score_events (scorecard_instance_id, sequence_number);

CREATE INDEX IF NOT EXISTS score_events_fixture_idx
  ON score_events (fixture_id, created_at);

CREATE INDEX IF NOT EXISTS score_events_tournament_idx
  ON score_events (tournament_id, created_at);

-- ── 4. Trigger: auto-update scorecard_instances.updated_at ───────────────────
CREATE OR REPLACE FUNCTION update_scorecard_instance_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS scorecard_instances_updated_at ON scorecard_instances;
CREATE TRIGGER scorecard_instances_updated_at
  BEFORE UPDATE ON scorecard_instances
  FOR EACH ROW EXECUTE FUNCTION update_scorecard_instance_timestamp();

DROP TRIGGER IF EXISTS scorecard_templates_updated_at ON scorecard_templates;
CREATE TRIGGER scorecard_templates_updated_at
  BEFORE UPDATE ON scorecard_templates
  FOR EACH ROW EXECUTE FUNCTION update_scorecard_instance_timestamp();

-- ── 5. Seed: default global template ─────────────────────────────────────────
INSERT INTO scorecard_templates (
  name, description, scope_type, sport_code, is_default, is_active,
  branding_config, layout_config, field_config
) VALUES (
  'Standard Netball Scorecard',
  'Default scorecard for all netball matches',
  'global',
  'netball',
  TRUE,
  TRUE,
  '{
    "logoUrl": "",
    "schoolName": "",
    "primaryColor": "#0D1C3E",
    "secondaryColor": "#F47820",
    "accentColor": "#FFC500",
    "headerText": "",
    "footerText": "",
    "sponsorLogoUrl": ""
  }',
  '{
    "density": "comfortable",
    "showQuarterBreakdown": true,
    "showNotes": true,
    "showOfficials": false,
    "headerStyle": "branded",
    "scoreControlsStyle": "large_buttons"
  }',
  '[
    {"key": "tournament_name",   "visible": true,  "order": 1},
    {"key": "fixture_date",      "visible": true,  "order": 2},
    {"key": "fixture_time",      "visible": true,  "order": 3},
    {"key": "court",             "visible": true,  "order": 4},
    {"key": "round",             "visible": true,  "order": 5},
    {"key": "home_team",         "visible": true,  "order": 6},
    {"key": "away_team",         "visible": true,  "order": 7},
    {"key": "quarter_scores",    "visible": true,  "order": 8},
    {"key": "scorekeeper_name",  "visible": true,  "order": 9},
    {"key": "umpire_names",      "visible": false, "order": 10},
    {"key": "notes",             "visible": true,  "order": 11},
    {"key": "dispute_flag",      "visible": false, "order": 12}
  ]'
) ON CONFLICT DO NOTHING;

-- ── 6. RLS Policies ───────────────────────────────────────────────────────────
-- The app currently uses the anon key for all operations.
-- Policies match the existing pattern: anon can read; anon can write
-- (tournament-level access control is enforced in application code).
-- Tighten to authenticated roles once Supabase Auth is introduced.

ALTER TABLE scorecard_templates    ENABLE ROW LEVEL SECURITY;
ALTER TABLE scorecard_instances    ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_events           ENABLE ROW LEVEL SECURITY;

-- Templates: readable by all, writable by anon (admin-gated in app)
CREATE POLICY IF NOT EXISTS "anon read scorecard_templates"
  ON scorecard_templates FOR SELECT TO anon USING (TRUE);

CREATE POLICY IF NOT EXISTS "anon write scorecard_templates"
  ON scorecard_templates FOR ALL TO anon USING (TRUE) WITH CHECK (TRUE);

-- Instances: readable by all, writable by anon
CREATE POLICY IF NOT EXISTS "anon read scorecard_instances"
  ON scorecard_instances FOR SELECT TO anon USING (TRUE);

CREATE POLICY IF NOT EXISTS "anon write scorecard_instances"
  ON scorecard_instances FOR ALL TO anon USING (TRUE) WITH CHECK (TRUE);

-- Score events: readable by all, insert-only for anon (no updates/deletes)
CREATE POLICY IF NOT EXISTS "anon read score_events"
  ON score_events FOR SELECT TO anon USING (TRUE);

CREATE POLICY IF NOT EXISTS "anon insert score_events"
  ON score_events FOR INSERT TO anon WITH CHECK (TRUE);

-- ── 7. Realtime: enable for live score broadcasting ───────────────────────────
-- Run these in Supabase Dashboard → Database → Replication if needed,
-- or run via SQL:
ALTER PUBLICATION supabase_realtime ADD TABLE scorecard_instances;
ALTER PUBLICATION supabase_realtime ADD TABLE score_events;

-- ── 8. Grant read access to anon ─────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE ON scorecard_templates  TO anon;
GRANT SELECT, INSERT, UPDATE ON scorecard_instances  TO anon;
GRANT SELECT, INSERT         ON score_events         TO anon;
