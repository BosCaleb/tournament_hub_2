/**
 * Scorecard domain logic
 *
 * - DEFAULT_TEMPLATE: built-in fallback template config
 * - resolveTemplate: template precedence resolution
 * - applyEventToState: pure reducer for score events → current state
 * - deriveStateFromEvents: replay full event log
 * - createScoreEvent: factory for new score event objects
 * - getScorecardStatus: human-readable status label
 */

// ─── Default template ─────────────────────────────────────────────────────────

export const DEFAULT_BRANDING = {
  logoUrl: '',
  schoolName: '',
  primaryColor: '#0D1C3E',
  secondaryColor: '#F47820',
  accentColor: '#FFC500',
  headerText: '',
  footerText: '',
  sponsorLogoUrl: '',
};

export const DEFAULT_LAYOUT = {
  density: 'comfortable',       // 'compact' | 'comfortable'
  showQuarterBreakdown: true,
  showNotes: true,
  showOfficials: false,
  headerStyle: 'branded',       // 'branded' | 'minimal'
  scoreControlsStyle: 'large_buttons',  // 'large_buttons' | 'compact'
};

export const DEFAULT_FIELDS = [
  { key: 'tournament_name',  visible: true,  order: 1 },
  { key: 'fixture_date',     visible: true,  order: 2 },
  { key: 'fixture_time',     visible: true,  order: 3 },
  { key: 'court',            visible: true,  order: 4 },
  { key: 'round',            visible: true,  order: 5 },
  { key: 'home_team',        visible: true,  order: 6 },
  { key: 'away_team',        visible: true,  order: 7 },
  { key: 'quarter_scores',   visible: true,  order: 8 },
  { key: 'scorekeeper_name', visible: true,  order: 9 },
  { key: 'umpire_names',     visible: false, order: 10 },
  { key: 'notes',            visible: true,  order: 11 },
  { key: 'dispute_flag',     visible: false, order: 12 },
];

export const FIELD_LABELS = {
  tournament_name:  'Tournament Name',
  fixture_date:     'Date',
  fixture_time:     'Time',
  court:            'Court',
  round:            'Round',
  home_team:        'Home Team',
  away_team:        'Away Team',
  quarter_scores:   'Quarter Scores',
  scorekeeper_name: 'Scorekeeper Name',
  umpire_names:     'Umpire Names',
  notes:            'Notes',
  dispute_flag:     'Dispute Flag',
};

export const DEFAULT_TEMPLATE = {
  name: 'Standard Netball Scorecard',
  scope_type: 'global',
  sport_code: 'netball',
  is_default: true,
  is_active: true,
  branding_config: DEFAULT_BRANDING,
  layout_config: DEFAULT_LAYOUT,
  field_config: DEFAULT_FIELDS,
};

// ─── Template resolution ──────────────────────────────────────────────────────

/**
 * Resolve the most specific applicable template for a fixture.
 * Precedence (highest → lowest):
 *   1. fixture-specific  (scope_type='fixture', scope_id=fixtureId)
 *   2. tournament-specific (scope_type='tournament', scope_id=tournamentId)
 *   3. age_group default  (scope_type='age_group', age_group matches)
 *   4. sport default      (scope_type='sport', sport_code matches)
 *   5. global default     (scope_type='global', is_default=true)
 *   6. built-in DEFAULT_TEMPLATE
 *
 * @param {object[]} templates - all templates from DB
 * @param {string}   fixtureId
 * @param {string}   tournamentId
 * @param {string}   sport
 * @param {string}   ageGroup
 * @returns {object} resolved template
 */
export function resolveTemplate(templates, fixtureId, tournamentId, sport, ageGroup) {
  const active = templates.filter(t => t.is_active);

  const fixture    = active.find(t => t.scope_type === 'fixture'    && t.scope_id === fixtureId);
  if (fixture) return fixture;

  const tournament = active.find(t => t.scope_type === 'tournament' && t.scope_id === tournamentId);
  if (tournament) return tournament;

  const ageGroupT  = ageGroup
    ? active.find(t => t.scope_type === 'age_group' && t.age_group === ageGroup && t.sport_code === sport)
    : null;
  if (ageGroupT) return ageGroupT;

  const sportT     = active.find(t => t.scope_type === 'sport' && t.sport_code === sport && t.is_default);
  if (sportT) return sportT;

  const globalT    = active.find(t => t.scope_type === 'global' && t.is_default);
  if (globalT) return globalT;

  return DEFAULT_TEMPLATE;
}

/**
 * Snapshot a template's config into a scorecard instance.
 * This freezes the branding/layout/fields so future template edits
 * don't retroactively alter historical match scorecards.
 */
export function snapshotTemplate(template) {
  return {
    branding_snapshot: { ...DEFAULT_BRANDING, ...(template.branding_config || {}) },
    layout_snapshot:   { ...DEFAULT_LAYOUT,   ...(template.layout_config   || {}) },
    field_snapshot:    template.field_config?.length
      ? [...template.field_config]
      : [...DEFAULT_FIELDS],
  };
}

// ─── Score event types ────────────────────────────────────────────────────────

export const EVENT_TYPES = {
  MATCH_STARTED:    'match_started',
  QUARTER_STARTED:  'quarter_started',
  GOAL_ADDED_HOME:  'goal_added_home',
  GOAL_ADDED_AWAY:  'goal_added_away',
  GOAL_REMOVED_HOME:'goal_removed_home',
  GOAL_REMOVED_AWAY:'goal_removed_away',
  QUARTER_ENDED:    'quarter_ended',
  HALFTIME_STARTED: 'halftime_started',
  HALFTIME_ENDED:   'halftime_ended',
  MATCH_PAUSED:     'match_paused',
  MATCH_RESUMED:    'match_resumed',
  NOTE_ADDED:       'note_added',
  MATCH_FINALISED:  'match_finalised',
  SCORE_CORRECTED:  'score_corrected',
  MATCH_REOPENED:   'match_reopened',
};

// ─── Initial scorecard state ──────────────────────────────────────────────────

export function initialScorecardState() {
  return {
    homeScore:      0,
    awayScore:      0,
    currentQuarter: 1,
    quarterScores:  [],   // [{ q: 1, home: 5, away: 3 }, ...]
    status:         'pending',
    notes:          [],
    lastEventAt:    null,
  };
}

// ─── Score event reducer (pure) ───────────────────────────────────────────────

/**
 * Apply a single score event to the current state.
 * This is a pure function — given state + event → new state.
 * Used for both real-time optimistic updates and full replay.
 *
 * @param {object} state  - current scorecard state
 * @param {object} event  - score event from DB or optimistic queue
 * @returns {object} next state
 */
export function applyEventToState(state, event) {
  const s = { ...state };

  switch (event.event_type) {
    case EVENT_TYPES.MATCH_STARTED:
      return { ...s, status: 'live', currentQuarter: 1 };

    case EVENT_TYPES.QUARTER_STARTED:
      return {
        ...s,
        status: 'live',
        currentQuarter: event.event_payload?.quarter ?? s.currentQuarter,
      };

    case EVENT_TYPES.GOAL_ADDED_HOME:
      return { ...s, homeScore: s.homeScore + 1 };

    case EVENT_TYPES.GOAL_ADDED_AWAY:
      return { ...s, awayScore: s.awayScore + 1 };

    case EVENT_TYPES.GOAL_REMOVED_HOME:
      return { ...s, homeScore: Math.max(0, s.homeScore - 1) };

    case EVENT_TYPES.GOAL_REMOVED_AWAY:
      return { ...s, awayScore: Math.max(0, s.awayScore - 1) };

    case EVENT_TYPES.QUARTER_ENDED: {
      const q = event.event_payload?.quarter ?? s.currentQuarter;
      const existing = s.quarterScores.find(qs => qs.q === q);
      const quarterScores = existing
        ? s.quarterScores.map(qs => qs.q === q
            ? { q, home: s.homeScore, away: s.awayScore }
            : qs
          )
        : [...s.quarterScores, { q, home: s.homeScore, away: s.awayScore }];
      return { ...s, quarterScores, status: 'paused' };
    }

    case EVENT_TYPES.HALFTIME_STARTED:
      return { ...s, status: 'halftime' };

    case EVENT_TYPES.HALFTIME_ENDED:
      return { ...s, status: 'live', currentQuarter: 3 };

    case EVENT_TYPES.MATCH_PAUSED:
      return { ...s, status: 'paused' };

    case EVENT_TYPES.MATCH_RESUMED:
      return { ...s, status: 'live' };

    case EVENT_TYPES.NOTE_ADDED: {
      const notes = [...(s.notes || []), {
        text: event.event_payload?.text || '',
        at: event.created_at,
        by: event.created_by,
      }];
      return { ...s, notes };
    }

    case EVENT_TYPES.MATCH_FINALISED:
      return { ...s, status: 'final' };

    case EVENT_TYPES.SCORE_CORRECTED:
      return {
        ...s,
        homeScore: event.event_payload?.homeScore ?? s.homeScore,
        awayScore: event.event_payload?.awayScore ?? s.awayScore,
        status: 'corrected',
      };

    case EVENT_TYPES.MATCH_REOPENED:
      return { ...s, status: 'live' };

    default:
      return s;
  }
}

/**
 * Replay all events to derive the full current state.
 * Events must be sorted by sequence_number ascending.
 *
 * @param {object[]} events
 * @returns {object} derived state
 */
export function deriveStateFromEvents(events) {
  return events
    .slice()
    .sort((a, b) => a.sequence_number - b.sequence_number)
    .reduce(applyEventToState, initialScorecardState());
}

// ─── Event factory ────────────────────────────────────────────────────────────

/**
 * Create a new score event object.
 * client_generated_id ensures idempotent upserts for offline queue.
 *
 * @param {object} opts
 * @returns {object} score event (without DB-assigned id/created_at)
 */
export function createScoreEvent({
  scorecardInstanceId,
  tournamentId,
  fixtureId,
  eventType,
  teamSide = null,
  payload = {},
  sequenceNumber,
  createdBy,
}) {
  return {
    scorecard_instance_id: scorecardInstanceId,
    tournament_id:  tournamentId,
    fixture_id:     fixtureId,
    event_type:     eventType,
    team_side:      teamSide,
    event_payload:  payload,
    sequence_number: sequenceNumber,
    created_by:     createdBy,
    created_at:     new Date().toISOString(),
    client_generated_id: `${fixtureId}-${sequenceNumber}-${Date.now()}`,
  };
}

// ─── Status helpers ───────────────────────────────────────────────────────────

export function getScorecardStatusLabel(status) {
  const labels = {
    pending:   'Not Started',
    live:      'Live',
    paused:    'Paused',
    halftime:  'Half Time',
    final:     'Final',
    corrected: 'Final (Corrected)',
  };
  return labels[status] || status;
}

export function isScorecardEditable(status) {
  return ['live', 'paused', 'halftime'].includes(status);
}

export function isScorecardFinal(status) {
  return ['final', 'corrected'].includes(status);
}

/**
 * Get quarter label for display
 */
export function quarterLabel(q) {
  const labels = { 1: 'Q1', 2: 'Q2', 3: 'Q3', 4: 'Q4' };
  return labels[q] || `Q${q}`;
}
