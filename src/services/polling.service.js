import { POLL_TIERS, POLL_CADENCE_MS } from '../config/constants.js';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/**
 * Adaptive poll-tier selection. A fresh match => active; otherwise the tier
 * decays with how long it's been since the last game.
 */
export function computePollTier({ lastMatchStartAt, hadNewMatch }, now = Date.now()) {
  if (hadNewMatch) return POLL_TIERS.ACTIVE;
  if (!lastMatchStartAt) return POLL_TIERS.DORMANT;
  const age = now - new Date(lastMatchStartAt).getTime();
  if (age < HOUR) return POLL_TIERS.ACTIVE;
  if (age < DAY) return POLL_TIERS.IDLE;
  return POLL_TIERS.DORMANT;
}

/** Next check time for a tier, plus a deterministic stagger offset. */
export function computeNextCheckAt(pollTier, now = Date.now(), stagger = 0) {
  const base = POLL_CADENCE_MS[pollTier] ?? POLL_CADENCE_MS[POLL_TIERS.IDLE];
  return new Date(now + base + stagger);
}

/**
 * Deterministic per-account offset in [0, windowMs), spreading checks across the
 * interval so tens of thousands of accounts don't all come due on one tick.
 */
export function staggerFor(puuid, windowMs) {
  let hash = 0;
  for (let i = 0; i < puuid.length; i += 1) {
    hash = (hash * 31 + puuid.charCodeAt(i)) >>> 0;
  }
  return hash % Math.max(1, windowMs);
}
