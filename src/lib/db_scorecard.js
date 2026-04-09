/**
 * Database layer for scorecard feature.
 * Tables: scorecard_templates, scorecard_instances, score_events
 *
 * All functions return null gracefully when Supabase is not configured.
 */

import { supabase, isSupabaseEnabled } from './supabase.js';

const T = 'scorecard_templates';
const I = 'scorecard_instances';
const E = 'score_events';

// ─── Templates ────────────────────────────────────────────────────────────────

export async function loadTemplates(filters = {}) {
  if (!isSupabaseEnabled) return [];

  let q = supabase.from(T).select('*').eq('is_active', true);

  if (filters.sport_code) q = q.eq('sport_code', filters.sport_code);
  q = q.order('created_at', { ascending: false });

  const { data, error } = await q;
  if (error) {
    console.error('[db_scorecard] loadTemplates error:', error.message);
    return [];
  }
  return data || [];
}

export async function loadTemplate(id) {
  if (!isSupabaseEnabled) return null;

  const { data, error } = await supabase
    .from(T).select('*').eq('id', id).single();

  if (error) {
    console.error('[db_scorecard] loadTemplate error:', error.message);
    return null;
  }
  return data;
}

export async function upsertTemplate(template) {
  if (!isSupabaseEnabled) return null;

  const row = {
    ...template,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from(T)
    .upsert(row, { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    console.error('[db_scorecard] upsertTemplate error:', error.message);
    return null;
  }
  return data;
}

export async function deleteTemplate(id) {
  if (!isSupabaseEnabled) return;

  const { error } = await supabase
    .from(T)
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) console.error('[db_scorecard] deleteTemplate error:', error.message);
}

export async function duplicateTemplate(id, newName) {
  if (!isSupabaseEnabled) return null;

  const source = await loadTemplate(id);
  if (!source) return null;

  const { id: _omit, created_at: _c, updated_at: _u, ...rest } = source;
  return upsertTemplate({ ...rest, name: newName, is_default: false });
}

// ─── Scorecard Instances ──────────────────────────────────────────────────────

export async function loadScorecardInstance(fixtureId) {
  if (!isSupabaseEnabled) return null;

  const { data, error } = await supabase
    .from(I)
    .select('*')
    .eq('fixture_id', fixtureId)
    .maybeSingle();

  if (error) {
    console.error('[db_scorecard] loadScorecardInstance error:', error.message);
    return null;
  }
  return data;
}

export async function loadScorecardInstancesByTournament(tournamentId) {
  if (!isSupabaseEnabled) return [];

  const { data, error } = await supabase
    .from(I)
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[db_scorecard] loadScorecardInstancesByTournament error:', error.message);
    return [];
  }
  return data || [];
}

export async function upsertScorecardInstance(instance) {
  if (!isSupabaseEnabled) return null;

  const { data, error } = await supabase
    .from(I)
    .upsert({ ...instance, updated_at: new Date().toISOString() }, { onConflict: 'fixture_id' })
    .select()
    .single();

  if (error) {
    console.error('[db_scorecard] upsertScorecardInstance error:', error.message);
    return null;
  }
  return data;
}

export async function updateScorecardState(instanceId, currentState, status, extraFields = {}) {
  if (!isSupabaseEnabled) return null;

  const update = {
    current_state: currentState,
    status,
    updated_at: new Date().toISOString(),
    ...extraFields,
  };

  const { data, error } = await supabase
    .from(I)
    .update(update)
    .eq('id', instanceId)
    .select()
    .single();

  if (error) {
    console.error('[db_scorecard] updateScorecardState error:', error.message);
    return null;
  }
  return data;
}

// ─── Score Events ─────────────────────────────────────────────────────────────

export async function loadScoreEvents(scorecardInstanceId) {
  if (!isSupabaseEnabled) return [];

  const { data, error } = await supabase
    .from(E)
    .select('*')
    .eq('scorecard_instance_id', scorecardInstanceId)
    .order('sequence_number', { ascending: true });

  if (error) {
    console.error('[db_scorecard] loadScoreEvents error:', error.message);
    return [];
  }
  return data || [];
}

/**
 * Insert a score event with idempotent handling via client_generated_id.
 * Safe to retry on network failure.
 */
export async function insertScoreEvent(event) {
  if (!isSupabaseEnabled) return null;

  const { data, error } = await supabase
    .from(E)
    .upsert(event, { onConflict: 'client_generated_id' })
    .select()
    .single();

  if (error) {
    console.error('[db_scorecard] insertScoreEvent error:', error.message);
    return null;
  }
  return data;
}

/**
 * Get the next sequence number for a scorecard instance.
 * Returns 1 if no events exist yet.
 */
export async function getNextSequenceNumber(scorecardInstanceId) {
  if (!isSupabaseEnabled) return 1;

  const { data, error } = await supabase
    .from(E)
    .select('sequence_number')
    .eq('scorecard_instance_id', scorecardInstanceId)
    .order('sequence_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[db_scorecard] getNextSequenceNumber error:', error.message);
    return 1;
  }
  return (data?.sequence_number ?? 0) + 1;
}

// ─── Real-time subscriptions ──────────────────────────────────────────────────

/**
 * Subscribe to live changes on a specific scorecard instance.
 * Fires onUpdate(instance) when the instance row changes.
 * Returns an unsubscribe function.
 */
export function subscribeScorecardInstance(fixtureId, onUpdate) {
  if (!isSupabaseEnabled) return () => {};

  const channel = supabase
    .channel(`scorecard:${fixtureId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: I, filter: `fixture_id=eq.${fixtureId}` },
      payload => onUpdate(payload.new)
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

/**
 * Subscribe to new score events for a scorecard instance.
 * Fires onEvent(event) for each new event row.
 * Returns an unsubscribe function.
 */
export function subscribeScoreEvents(scorecardInstanceId, onEvent) {
  if (!isSupabaseEnabled) return () => {};

  const channel = supabase
    .channel(`score_events:${scorecardInstanceId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: E, filter: `scorecard_instance_id=eq.${scorecardInstanceId}` },
      payload => onEvent(payload.new)
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}
