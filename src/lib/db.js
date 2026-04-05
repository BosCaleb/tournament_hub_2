/**
 * Database layer — wraps Supabase CRUD for the statedge_hub_tournaments table.
 * Falls back to a no-op when Supabase is not configured.
 *
 * Table schema (run supabase/migrations/001_hub_tournaments.sql once):
 *   id          text  PRIMARY KEY
 *   name        text
 *   sport       text
 *   data        jsonb   ← full tournament object
 *   created_at  timestamptz
 *   updated_at  timestamptz
 */

import { supabase, isSupabaseEnabled } from './supabase.js';

const TABLE = 'statedge_hub_tournaments';

// ─── Read ─────────────────────────────────────────────────────────────────────

/**
 * Load all tournaments from the database.
 * Returns an array of tournament objects (the `data` field, merged with id/name/sport).
 */
export async function loadTournaments() {
  if (!isSupabaseEnabled) return null;

  const { data, error } = await supabase
    .from(TABLE)
    .select('id, name, sport, data, created_at, updated_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[db] loadTournaments error:', error.message);
    return null;
  }

  // Merge row-level fields into the stored data blob
  return data.map(row => ({
    ...row.data,
    id: row.id,
    name: row.name,
    sport: row.sport,
    createdAt: row.data?.createdAt ?? row.created_at,
    updatedAt: row.data?.updatedAt ?? row.updated_at,
  }));
}

// ─── Write ────────────────────────────────────────────────────────────────────

/**
 * Upsert a single tournament.
 */
export async function upsertTournament(tournament) {
  if (!isSupabaseEnabled) return;

  const { error } = await supabase
    .from(TABLE)
    .upsert({
      id: tournament.id,
      name: tournament.name,
      sport: tournament.sport || 'netball',
      data: tournament,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

  if (error) {
    console.error('[db] upsertTournament error:', error.message);
  }
}

/**
 * Upsert multiple tournaments in one call.
 */
export async function upsertTournaments(tournaments) {
  if (!isSupabaseEnabled || tournaments.length === 0) return;

  const rows = tournaments.map(t => ({
    id: t.id,
    name: t.name,
    sport: t.sport || 'netball',
    data: t,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from(TABLE)
    .upsert(rows, { onConflict: 'id' });

  if (error) {
    console.error('[db] upsertTournaments error:', error.message);
  }
}

/**
 * Delete a single tournament row.
 */
export async function deleteTournament(id) {
  if (!isSupabaseEnabled) return;

  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[db] deleteTournament error:', error.message);
  }
}

// ─── Real-time ────────────────────────────────────────────────────────────────

/**
 * Subscribe to changes on a specific tournament row.
 * Returns an unsubscribe function.
 *
 * @param {string} tournamentId
 * @param {function} onUpdate  called with the updated tournament object
 */
export function subscribeTournament(tournamentId, onUpdate) {
  if (!isSupabaseEnabled) return () => {};

  const channel = supabase
    .channel(`tournament:${tournamentId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: TABLE,
        filter: `id=eq.${tournamentId}`,
      },
      payload => {
        const row = payload.new;
        onUpdate({
          ...row.data,
          id: row.id,
          name: row.name,
          sport: row.sport,
        });
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}
