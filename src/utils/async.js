/** Resolves after `ms` milliseconds. */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));
}

/** A small random jitter in [0, ms) — spreads retries so they don't sync up. */
export function jitter(ms) {
  return Math.floor(Math.random() * Math.max(0, ms));
}
