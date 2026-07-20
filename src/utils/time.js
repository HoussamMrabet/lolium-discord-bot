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
