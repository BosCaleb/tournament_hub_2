/** Generate a unique ID */
export function generateId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Format ISO date → dd/MM/yyyy (SA convention) */
export function formatDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

/** Format time string */
export function formatTime(time) {
  if (!time) return '';
  return time.slice(0, 5);
}

/** Format date + time */
export function formatDateTime(date, time) {
  if (!date && !time) return '—';
  const parts = [];
  if (date) parts.push(formatDate(date));
  if (time) parts.push(formatTime(time));
  return parts.join(' · ');
}

/** Today as ISO date string */
export function todayISO() {
  return new Date().toISOString().split('T')[0];
}

/** Simple SHA-256-ish hash for PIN storage (not cryptographically secure, but fine for client-side PIN) */
export async function hashPin(pin) {
  const msgBuffer = new TextEncoder().encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Verify PIN against stored hash */
export async function verifyPin(pin, hash) {
  const pinHash = await hashPin(pin);
  return pinHash === hash;
}

/** Download a string as a file */
export function downloadFile(content, filename, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Download JSON */
export function downloadJSON(data, filename) {
  downloadFile(JSON.stringify(data, null, 2), filename, 'application/json');
}

/** Download CSV */
export function downloadCSV(rows, headers, filename) {
  const escape = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [
    headers.map(escape).join(','),
    ...rows.map(row => headers.map(h => escape(row[h])).join(',')),
  ];
  downloadFile(lines.join('\n'), filename, 'text/csv');
}

/** Clamp number */
export function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

/** Ordinal number (1st, 2nd, 3rd...) */
export function ordinal(n) {
  const s = ['th','st','nd','rd'];
  const v = n % 100;
  return n + (s[(v-20)%10] || s[v] || s[0]);
}

/** Get team color (fallback palette by index) */
const PALETTE = [
  '#2563EB','#DC2626','#16A34A','#D97706','#7C3AED',
  '#0891B2','#DB2777','#059669','#EA580C','#4338CA',
];
export function teamColor(team, index = 0) {
  return team?.colors?.primary || PALETTE[index % PALETTE.length];
}

/** Parse CSV text into array of objects */
export function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  return lines.slice(1).map(line => {
    const values = line.match(/(".*?"|[^,]+|(?<=,)(?=,)|^(?=,)|(?<=,)$)/g) || [];
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = (values[i] || '').replace(/^"|"$/g, '').trim();
    });
    return obj;
  });
}

/** Debounce */
export function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/** Get initials from name */
export function initials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

/** Format score display */
export function formatScore(home, away) {
  if (home === null || away === null) return 'vs';
  return `${home} – ${away}`;
}

/** Get result from perspective of a team */
export function getResult(teamId, fixture) {
  if (!fixture.played || fixture.homeScore === null) return null;
  const isHome = fixture.homeTeamId === teamId;
  const myScore = isHome ? fixture.homeScore : fixture.awayScore;
  const oppScore = isHome ? fixture.awayScore : fixture.homeScore;
  if (myScore > oppScore) return 'W';
  if (myScore < oppScore) return 'L';
  return 'D';
}
