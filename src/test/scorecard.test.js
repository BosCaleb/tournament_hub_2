/**
 * Unit tests for scorecard domain logic.
 * Covers: score event reducer, state derivation, template resolution,
 * template snapshot, and permission helpers.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  applyEventToState,
  deriveStateFromEvents,
  createScoreEvent,
  initialScorecardState,
  resolveTemplate,
  snapshotTemplate,
  EVENT_TYPES,
  isScorecardEditable,
  isScorecardFinal,
  getScorecardStatusLabel,
  quarterLabel,
  DEFAULT_TEMPLATE,
  DEFAULT_BRANDING,
  DEFAULT_LAYOUT,
  DEFAULT_FIELDS,
} from '../lib/scorecard.js';

// ─── applyEventToState ────────────────────────────────────────────────────────

describe('applyEventToState', () => {
  let state;

  beforeEach(() => {
    state = initialScorecardState();
  });

  it('MATCH_STARTED transitions status to live', () => {
    const event = { event_type: EVENT_TYPES.MATCH_STARTED };
    const next = applyEventToState(state, event);
    expect(next.status).toBe('live');
    expect(next.currentQuarter).toBe(1);
  });

  it('GOAL_ADDED_HOME increments homeScore', () => {
    const event = { event_type: EVENT_TYPES.GOAL_ADDED_HOME };
    const next = applyEventToState(state, event);
    expect(next.homeScore).toBe(1);
    expect(next.awayScore).toBe(0);
  });

  it('GOAL_ADDED_AWAY increments awayScore', () => {
    const event = { event_type: EVENT_TYPES.GOAL_ADDED_AWAY };
    const next = applyEventToState(state, event);
    expect(next.homeScore).toBe(0);
    expect(next.awayScore).toBe(1);
  });

  it('GOAL_REMOVED_HOME decrements homeScore, not below 0', () => {
    const withGoal = { ...state, homeScore: 3 };
    const next = applyEventToState(withGoal, { event_type: EVENT_TYPES.GOAL_REMOVED_HOME });
    expect(next.homeScore).toBe(2);

    // Cannot go below 0
    const atZero = { ...state, homeScore: 0 };
    const clamped = applyEventToState(atZero, { event_type: EVENT_TYPES.GOAL_REMOVED_HOME });
    expect(clamped.homeScore).toBe(0);
  });

  it('GOAL_REMOVED_AWAY decrements awayScore, not below 0', () => {
    const withGoal = { ...state, awayScore: 5 };
    const next = applyEventToState(withGoal, { event_type: EVENT_TYPES.GOAL_REMOVED_AWAY });
    expect(next.awayScore).toBe(4);
  });

  it('QUARTER_ENDED saves current scores to quarterScores and pauses match', () => {
    const live = { ...state, status: 'live', homeScore: 5, awayScore: 3, currentQuarter: 1 };
    const event = { event_type: EVENT_TYPES.QUARTER_ENDED, event_payload: { quarter: 1 } };
    const next = applyEventToState(live, event);
    expect(next.status).toBe('paused');
    expect(next.quarterScores).toHaveLength(1);
    expect(next.quarterScores[0]).toEqual({ q: 1, home: 5, away: 3 });
  });

  it('QUARTER_ENDED updates existing quarter score if already exists', () => {
    const state2 = {
      ...state,
      status: 'live',
      homeScore: 7,
      awayScore: 4,
      currentQuarter: 1,
      quarterScores: [{ q: 1, home: 5, away: 3 }],
    };
    const next = applyEventToState(state2, {
      event_type: EVENT_TYPES.QUARTER_ENDED,
      event_payload: { quarter: 1 },
    });
    expect(next.quarterScores).toHaveLength(1);
    expect(next.quarterScores[0]).toEqual({ q: 1, home: 7, away: 4 });
  });

  it('HALFTIME_STARTED sets status to halftime', () => {
    const next = applyEventToState({ ...state, status: 'paused' }, { event_type: EVENT_TYPES.HALFTIME_STARTED });
    expect(next.status).toBe('halftime');
  });

  it('HALFTIME_ENDED resumes match at Q3', () => {
    const next = applyEventToState({ ...state, status: 'halftime' }, { event_type: EVENT_TYPES.HALFTIME_ENDED });
    expect(next.status).toBe('live');
    expect(next.currentQuarter).toBe(3);
  });

  it('MATCH_PAUSED pauses live match', () => {
    const next = applyEventToState({ ...state, status: 'live' }, { event_type: EVENT_TYPES.MATCH_PAUSED });
    expect(next.status).toBe('paused');
  });

  it('MATCH_RESUMED resumes paused match', () => {
    const next = applyEventToState({ ...state, status: 'paused' }, { event_type: EVENT_TYPES.MATCH_RESUMED });
    expect(next.status).toBe('live');
  });

  it('MATCH_FINALISED sets status to final', () => {
    const next = applyEventToState({ ...state, status: 'live' }, { event_type: EVENT_TYPES.MATCH_FINALISED });
    expect(next.status).toBe('final');
  });

  it('NOTE_ADDED appends note to notes array', () => {
    const event = {
      event_type: EVENT_TYPES.NOTE_ADDED,
      event_payload: { text: 'Injury stoppage' },
      created_by: 'Thandi',
      created_at: '2026-04-09T10:00:00Z',
    };
    const next = applyEventToState(state, event);
    expect(next.notes).toHaveLength(1);
    expect(next.notes[0].text).toBe('Injury stoppage');
    expect(next.notes[0].by).toBe('Thandi');
  });

  it('SCORE_CORRECTED overrides scores', () => {
    const event = {
      event_type: EVENT_TYPES.SCORE_CORRECTED,
      event_payload: { homeScore: 12, awayScore: 8 },
    };
    const next = applyEventToState({ ...state, homeScore: 10, awayScore: 9 }, event);
    expect(next.homeScore).toBe(12);
    expect(next.awayScore).toBe(8);
    expect(next.status).toBe('corrected');
  });

  it('MATCH_REOPENED sets status to live', () => {
    const next = applyEventToState({ ...state, status: 'final' }, { event_type: EVENT_TYPES.MATCH_REOPENED });
    expect(next.status).toBe('live');
  });

  it('unknown event type returns state unchanged', () => {
    const next = applyEventToState(state, { event_type: 'unknown_event_xyz' });
    expect(next).toEqual(state);
  });
});

// ─── deriveStateFromEvents ────────────────────────────────────────────────────

describe('deriveStateFromEvents', () => {
  it('returns initial state for empty event list', () => {
    const result = deriveStateFromEvents([]);
    expect(result).toEqual(initialScorecardState());
  });

  it('replays events in sequence_number order regardless of array order', () => {
    const events = [
      { event_type: EVENT_TYPES.GOAL_ADDED_HOME, sequence_number: 3 },
      { event_type: EVENT_TYPES.MATCH_STARTED,   sequence_number: 1 },
      { event_type: EVENT_TYPES.GOAL_ADDED_AWAY, sequence_number: 2 },
    ];
    const result = deriveStateFromEvents(events);
    expect(result.status).toBe('live');
    expect(result.homeScore).toBe(1);
    expect(result.awayScore).toBe(1);
  });

  it('accurately derives final score from a full match sequence', () => {
    const events = [
      { event_type: EVENT_TYPES.MATCH_STARTED,    sequence_number: 1 },
      { event_type: EVENT_TYPES.GOAL_ADDED_HOME,  sequence_number: 2 },
      { event_type: EVENT_TYPES.GOAL_ADDED_HOME,  sequence_number: 3 },
      { event_type: EVENT_TYPES.GOAL_ADDED_AWAY,  sequence_number: 4 },
      { event_type: EVENT_TYPES.GOAL_REMOVED_HOME,sequence_number: 5 },  // undo
      { event_type: EVENT_TYPES.MATCH_FINALISED,  sequence_number: 6 },
    ];
    const result = deriveStateFromEvents(events);
    expect(result.homeScore).toBe(1);   // 2 added, 1 removed
    expect(result.awayScore).toBe(1);
    expect(result.status).toBe('final');
  });
});

// ─── createScoreEvent ─────────────────────────────────────────────────────────

describe('createScoreEvent', () => {
  it('creates a well-formed event object', () => {
    const event = createScoreEvent({
      scorecardInstanceId: 'inst-1',
      tournamentId: 'tourn-1',
      fixtureId: 'fix-1',
      eventType: EVENT_TYPES.GOAL_ADDED_HOME,
      teamSide: 'home',
      payload: { note: 'clean goal' },
      sequenceNumber: 5,
      createdBy: 'Thandi',
    });

    expect(event.scorecard_instance_id).toBe('inst-1');
    expect(event.event_type).toBe(EVENT_TYPES.GOAL_ADDED_HOME);
    expect(event.team_side).toBe('home');
    expect(event.sequence_number).toBe(5);
    expect(event.created_by).toBe('Thandi');
    expect(event.client_generated_id).toMatch(/fix-1-5-/);
  });

  it('includes a unique client_generated_id', () => {
    const e1 = createScoreEvent({ scorecardInstanceId: 'i', tournamentId: 't', fixtureId: 'f', eventType: 'goal_added_home', sequenceNumber: 1, createdBy: 'X' });
    const e2 = createScoreEvent({ scorecardInstanceId: 'i', tournamentId: 't', fixtureId: 'f', eventType: 'goal_added_home', sequenceNumber: 2, createdBy: 'X' });
    expect(e1.client_generated_id).not.toBe(e2.client_generated_id);
  });
});

// ─── resolveTemplate ─────────────────────────────────────────────────────────

describe('resolveTemplate', () => {
  const globalDefault = {
    id: 'global-1', scope_type: 'global', is_default: true, is_active: true, sport_code: 'netball',
  };
  const sportTemplate = {
    id: 'sport-1', scope_type: 'sport', is_default: true, is_active: true, sport_code: 'netball',
  };
  const ageGroupTemplate = {
    id: 'ag-1', scope_type: 'age_group', is_active: true, sport_code: 'netball', age_group: 'U16',
  };
  const tournamentTemplate = {
    id: 't-1', scope_type: 'tournament', is_active: true, scope_id: 'tourn-1', sport_code: 'netball',
  };
  const fixtureTemplate = {
    id: 'f-1', scope_type: 'fixture', is_active: true, scope_id: 'fix-1', sport_code: 'netball',
  };

  it('returns DEFAULT_TEMPLATE when no templates are available', () => {
    const result = resolveTemplate([], 'fix-x', 'tourn-x', 'netball', 'U16');
    expect(result).toBe(DEFAULT_TEMPLATE);
  });

  it('returns global default when no more specific template exists', () => {
    const result = resolveTemplate([globalDefault], 'fix-x', 'tourn-x', 'netball', 'U12');
    expect(result.id).toBe('global-1');
  });

  it('sport template takes precedence over global default', () => {
    const result = resolveTemplate([globalDefault, sportTemplate], 'fix-x', 'tourn-x', 'netball', 'U12');
    expect(result.id).toBe('sport-1');
  });

  it('age_group template takes precedence over sport template', () => {
    const result = resolveTemplate([globalDefault, sportTemplate, ageGroupTemplate], 'fix-x', 'tourn-x', 'netball', 'U16');
    expect(result.id).toBe('ag-1');
  });

  it('tournament template takes precedence over age_group template', () => {
    const templates = [globalDefault, sportTemplate, ageGroupTemplate, tournamentTemplate];
    const result = resolveTemplate(templates, 'fix-x', 'tourn-1', 'netball', 'U16');
    expect(result.id).toBe('t-1');
  });

  it('fixture-specific template takes highest precedence', () => {
    const templates = [globalDefault, sportTemplate, ageGroupTemplate, tournamentTemplate, fixtureTemplate];
    const result = resolveTemplate(templates, 'fix-1', 'tourn-1', 'netball', 'U16');
    expect(result.id).toBe('f-1');
  });

  it('skips inactive templates', () => {
    const inactive = { ...fixtureTemplate, is_active: false };
    const result = resolveTemplate([inactive, globalDefault], 'fix-1', 'tourn-x', 'netball', 'U16');
    expect(result.id).toBe('global-1');
  });

  it('does not match age_group template if age_group does not match', () => {
    const result = resolveTemplate([globalDefault, ageGroupTemplate], 'fix-x', 'tourn-x', 'netball', 'U12');
    expect(result.id).toBe('global-1');
  });
});

// ─── snapshotTemplate ─────────────────────────────────────────────────────────

describe('snapshotTemplate', () => {
  it('produces a snapshot with all three config keys', () => {
    const template = {
      branding_config: { schoolName: 'Test School', primaryColor: '#FF0000' },
      layout_config:   { density: 'compact' },
      field_config:    [{ key: 'court', visible: true, order: 1 }],
    };
    const snapshot = snapshotTemplate(template);
    expect(snapshot).toHaveProperty('branding_snapshot');
    expect(snapshot).toHaveProperty('layout_snapshot');
    expect(snapshot).toHaveProperty('field_snapshot');
    expect(snapshot.branding_snapshot.schoolName).toBe('Test School');
    expect(snapshot.branding_snapshot.primaryColor).toBe('#FF0000');
    expect(snapshot.layout_snapshot.density).toBe('compact');
    expect(snapshot.field_snapshot).toHaveLength(1);
  });

  it('fills in missing branding/layout keys from defaults', () => {
    const template = {
      branding_config: { schoolName: 'Minimal' },
      layout_config:   {},
      field_config:    [],
    };
    const snapshot = snapshotTemplate(template);
    // Missing keys should be filled from DEFAULT_BRANDING
    expect(snapshot.branding_snapshot.primaryColor).toBe(DEFAULT_BRANDING.primaryColor);
    // Missing layout keys filled from DEFAULT_LAYOUT
    expect(snapshot.layout_snapshot.density).toBe(DEFAULT_LAYOUT.density);
    // Empty field_config falls back to DEFAULT_FIELDS
    expect(snapshot.field_snapshot).toHaveLength(DEFAULT_FIELDS.length);
  });
});

// ─── Status helpers ───────────────────────────────────────────────────────────

describe('isScorecardEditable', () => {
  it('returns true for live, paused, halftime', () => {
    expect(isScorecardEditable('live')).toBe(true);
    expect(isScorecardEditable('paused')).toBe(true);
    expect(isScorecardEditable('halftime')).toBe(true);
  });

  it('returns false for final, corrected, pending', () => {
    expect(isScorecardEditable('final')).toBe(false);
    expect(isScorecardEditable('corrected')).toBe(false);
    expect(isScorecardEditable('pending')).toBe(false);
  });
});

describe('isScorecardFinal', () => {
  it('returns true for final and corrected', () => {
    expect(isScorecardFinal('final')).toBe(true);
    expect(isScorecardFinal('corrected')).toBe(true);
  });

  it('returns false for other statuses', () => {
    expect(isScorecardFinal('live')).toBe(false);
    expect(isScorecardFinal('pending')).toBe(false);
  });
});

describe('getScorecardStatusLabel', () => {
  it('returns human-readable labels', () => {
    expect(getScorecardStatusLabel('live')).toBe('Live');
    expect(getScorecardStatusLabel('final')).toBe('Final');
    expect(getScorecardStatusLabel('halftime')).toBe('Half Time');
    expect(getScorecardStatusLabel('corrected')).toBe('Final (Corrected)');
  });

  it('falls back to the raw status for unknown values', () => {
    expect(getScorecardStatusLabel('some_unknown_status')).toBe('some_unknown_status');
  });
});

describe('quarterLabel', () => {
  it('returns Q1 through Q4', () => {
    expect(quarterLabel(1)).toBe('Q1');
    expect(quarterLabel(4)).toBe('Q4');
  });

  it('handles arbitrary quarter numbers', () => {
    expect(quarterLabel(5)).toBe('Q5');
  });
});
