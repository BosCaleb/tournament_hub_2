const STORAGE_KEY = 'statedge_netball_v1';
const SCHEMA_VERSION = 1;

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    if (parsed.schemaVersion !== SCHEMA_VERSION) return migrateState(parsed);
    return parsed;
  } catch {
    return defaultState();
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, schemaVersion: SCHEMA_VERSION }));
  } catch (e) {
    console.error('Failed to save state:', e);
  }
}

export function clearState() {
  localStorage.removeItem(STORAGE_KEY);
}

function defaultState() {
  return {
    tournaments: [],
    theme: 'light',
    schemaVersion: SCHEMA_VERSION,
  };
}

function migrateState(old) {
  const base = { ...defaultState(), ...old, schemaVersion: SCHEMA_VERSION };
  // Backfill missing fields on older tournaments
  base.tournaments = (base.tournaments || []).map(t => ({
    sport: 'netball',
    lockedRounds: [],
    roundNames: {},
    playoffFlows: [],
    rankingLists: [],
    deletedItems: { teams: [], fixtures: [], players: [] },
    ...t,
  }));
  return base;
}
