/**
 * ScorekeeperContext
 *
 * Manages the scorekeeper session — who is logged in and which tournament
 * they are accessing. Scorekeepers log in with a tournament-specific
 * scorekeeper code (set by the admin) plus their name.
 *
 * Session is stored in sessionStorage so it survives page refresh but
 * clears when the tab closes (same pattern as AdminAuthContext).
 *
 * The scorekeeper's fixture assignments live in
 *   tournament.scorekeeperAssignments[]
 * which is stored inside the existing JSONB tournament document.
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const SESSION_KEY = 'statedge_scorekeeper_session';

const ScorekeeperContext = createContext(null);

export function ScorekeeperProvider({ children }) {
  const [session, setSession] = useState(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  /** Persist session whenever it changes */
  useEffect(() => {
    if (session) {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } else {
      sessionStorage.removeItem(SESSION_KEY);
    }
  }, [session]);

  /**
   * Log in as a scorekeeper.
   * @param {object[]} tournaments - all loaded tournaments
   * @param {string}   code        - tournament scorekeeper code entered
   * @param {string}   name        - scorekeeper's name (case-insensitive match)
   * @returns {boolean} success
   */
  const login = useCallback(async (tournaments, code, name) => {
    setLoading(true);
    setError('');

    const trimCode = code.trim().toUpperCase();
    const trimName = name.trim();

    if (!trimCode || !trimName) {
      setError('Please enter both a code and your name.');
      setLoading(false);
      return false;
    }

    // Find tournament matching the code
    const tournament = tournaments.find(
      t => (t.scorekeeperCode || '').toUpperCase() === trimCode
    );

    if (!tournament) {
      setError('Invalid code. Check with your tournament administrator.');
      setLoading(false);
      return false;
    }

    // Check that this name has at least one active assignment
    const assignments = (tournament.scorekeeperAssignments || []).filter(a =>
      a.active &&
      a.scorekeeperName.trim().toLowerCase() === trimName.toLowerCase()
    );

    if (assignments.length === 0) {
      setError('Your name was not found for this tournament. Check with your administrator.');
      setLoading(false);
      return false;
    }

    setSession({
      scorekeeperName: trimName,
      tournamentId: tournament.id,
      tournamentName: tournament.name,
      sport: tournament.sport,
    });
    setLoading(false);
    return true;
  }, []);

  const logout = useCallback(() => {
    setSession(null);
    setError('');
  }, []);

  const isLoggedIn = Boolean(session);

  /**
   * Get this scorekeeper's assigned fixture IDs for their tournament.
   * @param {object} tournament
   * @returns {string[]}
   */
  const getAssignedFixtureIds = useCallback((tournament) => {
    if (!session || !tournament) return [];
    return (tournament.scorekeeperAssignments || [])
      .filter(a =>
        a.active &&
        a.scorekeeperName.trim().toLowerCase() === session.scorekeeperName.toLowerCase()
      )
      .map(a => a.fixtureId);
  }, [session]);

  return (
    <ScorekeeperContext.Provider value={{
      session,
      isLoggedIn,
      login,
      logout,
      error,
      loading,
      getAssignedFixtureIds,
    }}>
      {children}
    </ScorekeeperContext.Provider>
  );
}

export function useScorekeeperAuth() {
  const ctx = useContext(ScorekeeperContext);
  if (!ctx) throw new Error('useScorekeeperAuth must be used inside ScorekeeperProvider');
  return ctx;
}
