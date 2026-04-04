import { createContext, useContext, useState, useCallback } from 'react';
import { hashPin, verifyPin } from '../lib/utils.js';

const ADMIN_CONFIG_KEY = 'statedge_admin_config';
const ADMIN_SESSION_KEY = 'statedge_admin_session';

const AdminAuthContext = createContext(null);

function loadConfig() {
  try {
    const raw = localStorage.getItem(ADMIN_CONFIG_KEY);
    return raw ? JSON.parse(raw) : { pinHash: null };
  } catch {
    return { pinHash: null };
  }
}

function saveConfig(config) {
  localStorage.setItem(ADMIN_CONFIG_KEY, JSON.stringify(config));
}

export function AdminAuthProvider({ children }) {
  const [config, setConfig] = useState(loadConfig);
  const [isAdmin, setIsAdmin] = useState(() => {
    return sessionStorage.getItem(ADMIN_SESSION_KEY) === 'true';
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const hasPin = Boolean(config.pinHash);

  const login = useCallback(async (pin) => {
    setError('');
    setLoading(true);
    try {
      // No PIN set → open access
      if (!config.pinHash) {
        sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');
        setIsAdmin(true);
        return true;
      }
      const match = await verifyPin(pin, config.pinHash);
      if (match) {
        sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');
        setIsAdmin(true);
        return true;
      } else {
        setError('Incorrect PIN. Please try again.');
        return false;
      }
    } finally {
      setLoading(false);
    }
  }, [config.pinHash]);

  const logout = useCallback(() => {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    setIsAdmin(false);
  }, []);

  const setPin = useCallback(async (newPin) => {
    const pinHash = await hashPin(newPin);
    const updated = { ...config, pinHash };
    saveConfig(updated);
    setConfig(updated);
  }, [config]);

  const removePin = useCallback(() => {
    const updated = { ...config, pinHash: null };
    saveConfig(updated);
    setConfig(updated);
  }, [config]);

  return (
    <AdminAuthContext.Provider value={{ isAdmin, hasPin, login, logout, setPin, removePin, error, setError, loading }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return ctx;
}
