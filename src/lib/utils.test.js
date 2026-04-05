import { describe, it, expect } from 'vitest';
import {
  formatDate,
  formatTime,
  formatDateTime,
  formatScore,
  getResult,
  initials,
  ordinal,
  clamp,
  parseCSV,
  hashPin,
  verifyPin,
  generateId,
} from './utils.js';

// ─── generateId ──────────────────────────────────────────────────────────────

describe('generateId', () => {
  it('returns a non-empty string', () => {
    expect(typeof generateId()).toBe('string');
    expect(generateId().length).toBeGreaterThan(0);
  });

  it('generates unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, generateId));
    expect(ids.size).toBe(100);
  });
});

// ─── formatDate ──────────────────────────────────────────────────────────────

describe('formatDate', () => {
  it('converts ISO to dd/MM/yyyy (SA format)', () => {
    expect(formatDate('2025-09-15')).toBe('15/09/2025');
  });

  it('returns — for null', () => {
    expect(formatDate(null)).toBe('—');
  });

  it('returns — for undefined', () => {
    expect(formatDate(undefined)).toBe('—');
  });

  it('returns — for empty string', () => {
    expect(formatDate('')).toBe('—');
  });

  it('does NOT return US format (MM/DD/YYYY)', () => {
    // 2025-09-15 → should be 15/09, not 09/15
    expect(formatDate('2025-09-15')).not.toBe('09/15/2025');
  });
});

// ─── formatTime ──────────────────────────────────────────────────────────────

describe('formatTime', () => {
  it('returns HH:MM from full time string', () => {
    expect(formatTime('09:30:00')).toBe('09:30');
  });

  it('returns as-is when already HH:MM', () => {
    expect(formatTime('14:00')).toBe('14:00');
  });

  it('returns empty string for null', () => {
    expect(formatTime(null)).toBe('');
  });

  it('returns empty string for empty string', () => {
    expect(formatTime('')).toBe('');
  });
});

// ─── formatDateTime ──────────────────────────────────────────────────────────

describe('formatDateTime', () => {
  it('combines date and time with separator', () => {
    expect(formatDateTime('2025-09-15', '09:30')).toBe('15/09/2025 · 09:30');
  });

  it('returns just date when no time', () => {
    expect(formatDateTime('2025-09-15', null)).toBe('15/09/2025');
  });

  it('returns just time when no date', () => {
    expect(formatDateTime(null, '09:30')).toBe('09:30');
  });

  it('returns — when both null', () => {
    expect(formatDateTime(null, null)).toBe('—');
  });
});

// ─── formatScore ─────────────────────────────────────────────────────────────

describe('formatScore', () => {
  it('formats played score', () => {
    expect(formatScore(30, 20)).toBe('30 – 20');
  });

  it('returns "vs" when either score is null', () => {
    expect(formatScore(null, null)).toBe('vs');
    expect(formatScore(30, null)).toBe('vs');
    expect(formatScore(null, 20)).toBe('vs');
  });

  it('handles 0-0', () => {
    expect(formatScore(0, 0)).toBe('0 – 0');
  });
});

// ─── getResult ───────────────────────────────────────────────────────────────

describe('getResult', () => {
  const base = { homeTeamId: 't1', awayTeamId: 't2', played: true };

  it('returns W when home team wins as home', () => {
    expect(getResult('t1', { ...base, homeScore: 30, awayScore: 20 })).toBe('W');
  });

  it('returns L when home team loses as home', () => {
    expect(getResult('t1', { ...base, homeScore: 20, awayScore: 30 })).toBe('L');
  });

  it('returns W when away team wins as away', () => {
    expect(getResult('t2', { ...base, homeScore: 20, awayScore: 30 })).toBe('W');
  });

  it('returns L when away team loses as away', () => {
    expect(getResult('t2', { ...base, homeScore: 30, awayScore: 20 })).toBe('L');
  });

  it('returns D on a draw', () => {
    expect(getResult('t1', { ...base, homeScore: 25, awayScore: 25 })).toBe('D');
  });

  it('returns null when not played', () => {
    expect(getResult('t1', { ...base, played: false, homeScore: null, awayScore: null })).toBeNull();
  });
});

// ─── initials ────────────────────────────────────────────────────────────────

describe('initials', () => {
  it('returns first two initials uppercased', () => {
    expect(initials('Jane Smith')).toBe('JS');
  });

  it('returns single initial for one word', () => {
    expect(initials('Pretoria')).toBe('P');
  });

  it('returns ? for empty string', () => {
    expect(initials('')).toBe('?');
  });

  it('returns ? for null', () => {
    expect(initials(null)).toBe('?');
  });

  it('only uses first two words', () => {
    expect(initials('St Mary DSG Pretoria')).toBe('SM');
  });
});

// ─── ordinal ─────────────────────────────────────────────────────────────────

describe('ordinal', () => {
  it('1 → 1st', () => expect(ordinal(1)).toBe('1st'));
  it('2 → 2nd', () => expect(ordinal(2)).toBe('2nd'));
  it('3 → 3rd', () => expect(ordinal(3)).toBe('3rd'));
  it('4 → 4th', () => expect(ordinal(4)).toBe('4th'));
  it('11 → 11th (special case)', () => expect(ordinal(11)).toBe('11th'));
  it('12 → 12th (special case)', () => expect(ordinal(12)).toBe('12th'));
  it('13 → 13th (special case)', () => expect(ordinal(13)).toBe('13th'));
  it('21 → 21st', () => expect(ordinal(21)).toBe('21st'));
});

// ─── clamp ───────────────────────────────────────────────────────────────────

describe('clamp', () => {
  it('returns value when within range', () => expect(clamp(5, 0, 10)).toBe(5));
  it('clamps to min', () => expect(clamp(-5, 0, 10)).toBe(0));
  it('clamps to max', () => expect(clamp(15, 0, 10)).toBe(10));
  it('handles equal min and max', () => expect(clamp(5, 7, 7)).toBe(7));
});

// ─── parseCSV ────────────────────────────────────────────────────────────────

describe('parseCSV', () => {
  it('parses simple CSV with headers', () => {
    const csv = `name,jerseyNumber,position\nJane Smith,7,GS\nAmy Jones,3,GK`;
    const result = parseCSV(csv);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ name: 'Jane Smith', jerseyNumber: '7', position: 'GS' });
    expect(result[1]).toMatchObject({ name: 'Amy Jones', jerseyNumber: '3', position: 'GK' });
  });

  it('handles quoted values', () => {
    const csv = `name,team\n"Smith, Jane","St Mary's"`;
    const result = parseCSV(csv);
    expect(result[0].name).toBe('Smith, Jane');
  });

  it('returns empty array for header-only CSV', () => {
    expect(parseCSV('name,position')).toEqual([]);
  });

  it('returns empty array for empty string', () => {
    expect(parseCSV('')).toEqual([]);
  });
});

// ─── hashPin / verifyPin ─────────────────────────────────────────────────────

describe('hashPin / verifyPin', () => {
  it('hashes a PIN to a hex string', async () => {
    const hash = await hashPin('1234');
    expect(typeof hash).toBe('string');
    expect(hash).toMatch(/^[0-9a-f]{64}$/); // SHA-256 = 64 hex chars
  });

  it('same PIN produces same hash (deterministic)', async () => {
    const h1 = await hashPin('9876');
    const h2 = await hashPin('9876');
    expect(h1).toBe(h2);
  });

  it('different PINs produce different hashes', async () => {
    const h1 = await hashPin('1234');
    const h2 = await hashPin('4321');
    expect(h1).not.toBe(h2);
  });

  it('verifyPin returns true for correct PIN', async () => {
    const hash = await hashPin('5678');
    expect(await verifyPin('5678', hash)).toBe(true);
  });

  it('verifyPin returns false for wrong PIN', async () => {
    const hash = await hashPin('5678');
    expect(await verifyPin('8765', hash)).toBe(false);
  });

  it('handles empty string PIN without throwing', async () => {
    await expect(hashPin('')).resolves.toMatch(/^[0-9a-f]{64}$/);
  });
});
