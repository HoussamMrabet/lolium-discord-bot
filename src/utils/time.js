/**
 * Validates an IANA timezone string (e.g. "Europe/London"). Invalid zones make
 * Intl throw a RangeError, which we translate to a boolean.
 */
export function isValidTimezone(tz) {
  if (typeof tz !== 'string' || tz.length === 0) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Formats a game duration (seconds) as M:SS. */
export function formatDuration(seconds) {
  const total = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(total / 60);
  const rem = total % 60;
  return `${minutes}:${String(rem).padStart(2, '0')}`;
}

/** Start of the UTC day N days ago (for recap windows). */
export function daysAgo(n, from = new Date()) {
  return new Date(from.getTime() - n * 24 * 60 * 60 * 1000);
}

const WEEKDAYS = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/**
 * Extracts calendar parts of `date` in a given IANA timezone — used to decide
 * when a guild's local recap hour/day has arrived. `weekKey`/`monthKey` are
 * stable per-week/per-month strings for dedupe (weekly fires on Monday, monthly
 * on the 1st, so those keys are unique per occurrence).
 */
export function getLocalParts(date, timeZone = 'UTC') {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(date).map((p) => [p.type, p.value]),
  );
  const hour = Number.parseInt(parts.hour, 10) % 24;
  const day = Number.parseInt(parts.day, 10);
  const dateKey = `${parts.year}-${parts.month}-${parts.day}`;
  return {
    hour,
    day,
    weekday: WEEKDAYS[parts.weekday] ?? 0,
    dateKey,
    weekKey: dateKey, // weekly only enqueues on Monday, so the Monday date is unique per week
    monthKey: `${parts.year}-${parts.month}`,
  };
}
