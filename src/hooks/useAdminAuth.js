import { useState, useCallback } from 'react';
import { verifyPin } from '../lib/utils.js';

const SESSION_KEY = 'statedge_admin_session';

export function useAdminAuth(tournament) {
  const [authed, setAuthed] = useState(() => {
    if (!tournament?.adminPinHash) return true; // no PIN set = open
    return sessionStorage.getItem(SESSION_KEY) === tournament?.id;
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const login = useCallback(async (pin) => {
    if (!tournament?.adminPinHash) { setAuthed(true); return true; }
    setLoading(true);
    setError('');
    try {
      const ok = await verifyPin(pin, tournament.adminPinHash);
      if (ok) {
        sessionStorage.setItem(SESSION_KEY, tournament.id);
        setAuthed(true);
        return true;
      } else {
        setError('Incorrect PIN. Please try again.');
        return false;
      }
    } finally {
      setLoading(false);
    }
  }, [tournament]);

  const logout = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    setAuthed(false);
  }, []);

  // Re-check if no PIN set
  const isOpen = !tournament?.adminPinHash;

  return { authed: authed || isOpen, login, logout, error, loading };
}
