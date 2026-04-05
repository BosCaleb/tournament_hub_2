import { describe, it, expect, beforeEach } from 'vitest';
import { loadState, saveState, clearState } from './storage.js';

const KEY = 'statedge_netball_v1';

describe('storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // ─── loadState ─────────────────────────────────────────────────────────────

  describe('loadState', () => {
    it('returns default state when localStorage is empty', () => {
      const state = loadState();
      expect(state.tournaments).toEqual([]);
      expect(state.theme).toBe('light');
      expect(state.schemaVersion).toBe(1);
    });

    it('returns stored state when valid data exists', () => {
      const stored = {
        tournaments: [{ id: 't1', name: 'Cup', sport: 'netball' }],
        theme: 'dark',
        schemaVersion: 1,
      };
      localStorage.setItem(KEY, JSON.stringify(stored));
      const state = loadState();
      expect(state.tournaments).toHaveLength(1);
      expect(state.theme).toBe('dark');
    });

    it('returns default state when localStorage contains corrupt JSON', () => {
      localStorage.setItem(KEY, 'not-valid-json{{{');
      const state = loadState();
      expect(state.tournaments).toEqual([]);
    });

    it('migrates old tournaments without sport field to netball', () => {
      const old = {
        tournaments: [{ id: 't1', name: 'Cup' }], // no sport field
        theme: 'light',
        schemaVersion: 0, // wrong version triggers migration
      };
      localStorage.setItem(KEY, JSON.stringify(old));
      const state = loadState();
      expect(state.tournaments[0].sport).toBe('netball');
    });

    it('does not overwrite existing sport field during migration', () => {
      const old = {
        tournaments: [{ id: 't1', name: 'Cup', sport: 'football' }],
        theme: 'light',
        schemaVersion: 0,
      };
      localStorage.setItem(KEY, JSON.stringify(old));
      const state = loadState();
      // sport already set — should keep it
      expect(state.tournaments[0].sport).toBe('football');
    });
  });

  // ─── saveState ─────────────────────────────────────────────────────────────

  describe('saveState', () => {
    it('persists state to localStorage', () => {
      saveState({ tournaments: [], theme: 'dark' });
      const raw = JSON.parse(localStorage.getItem(KEY));
      expect(raw.theme).toBe('dark');
      expect(raw.schemaVersion).toBe(1);
    });

    it('always writes schemaVersion', () => {
      saveState({ tournaments: [] });
      const raw = JSON.parse(localStorage.getItem(KEY));
      expect(raw.schemaVersion).toBe(1);
    });
  });

  // ─── clearState ────────────────────────────────────────────────────────────

  describe('clearState', () => {
    it('removes the key from localStorage', () => {
      saveState({ tournaments: [] });
      expect(localStorage.getItem(KEY)).not.toBeNull();
      clearState();
      expect(localStorage.getItem(KEY)).toBeNull();
    });
  });

  // ─── round-trip ────────────────────────────────────────────────────────────

  describe('round-trip', () => {
    it('save then load returns identical data', () => {
      const state = {
        tournaments: [{ id: 'x1', name: 'My Tournament', sport: 'netball', teams: [] }],
        theme: 'light',
      };
      saveState(state);
      const loaded = loadState();
      expect(loaded.tournaments[0].name).toBe('My Tournament');
      expect(loaded.theme).toBe('light');
    });
  });
});
