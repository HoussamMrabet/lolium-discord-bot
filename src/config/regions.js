/**
 * Riot API routing.
 *
 * Riot splits its endpoints across two kinds of hosts:
 *  - PLATFORM routes (na1, euw1, kr, ...): summoner-v4, league-v4, spectator-v5
 *  - REGIONAL routes (americas, asia, europe, sea): match-v5, account-v1
 *
 * `matchRoute`   -> host cluster for match-v5 (supports the SEA cluster).
 * `accountRoute` -> host cluster for account-v1 (only americas/asia/europe; SEA
 *                   platforms are directed to their nearest supported cluster).
 *
 * Mis-routing is the #1 cause of spurious 404s, so this map is the single
 * authority and is covered by unit tests.
 */

export const REGIONAL_ROUTES = Object.freeze({
  AMERICAS: 'americas',
  ASIA: 'asia',
  EUROPE: 'europe',
  SEA: 'sea',
});

export const PLATFORMS = Object.freeze({
  na1: { name: 'North America', matchRoute: 'americas', accountRoute: 'americas' },
  br1: { name: 'Brazil', matchRoute: 'americas', accountRoute: 'americas' },
  la1: { name: 'LAN', matchRoute: 'americas', accountRoute: 'americas' },
  la2: { name: 'LAS', matchRoute: 'americas', accountRoute: 'americas' },
  euw1: { name: 'EU West', matchRoute: 'europe', accountRoute: 'europe' },
  eun1: { name: 'EU Nordic & East', matchRoute: 'europe', accountRoute: 'europe' },
  tr1: { name: 'Turkey', matchRoute: 'europe', accountRoute: 'europe' },
  ru: { name: 'Russia', matchRoute: 'europe', accountRoute: 'europe' },
  kr: { name: 'Korea', matchRoute: 'asia', accountRoute: 'asia' },
  jp1: { name: 'Japan', matchRoute: 'asia', accountRoute: 'asia' },
  oc1: { name: 'Oceania', matchRoute: 'sea', accountRoute: 'americas' },
  ph2: { name: 'Philippines', matchRoute: 'sea', accountRoute: 'asia' },
  sg2: { name: 'Singapore', matchRoute: 'sea', accountRoute: 'asia' },
  th2: { name: 'Thailand', matchRoute: 'sea', accountRoute: 'asia' },
  tw2: { name: 'Taiwan', matchRoute: 'sea', accountRoute: 'asia' },
  vn2: { name: 'Vietnam', matchRoute: 'sea', accountRoute: 'asia' },
});

/** All platform identifiers we accept from users (lowercase). */
export const SUPPORTED_PLATFORMS = Object.freeze(Object.keys(PLATFORMS));

/** Normalizes user input (e.g. "NA1", " na1 ") to a canonical platform id. */
export function normalizePlatform(input) {
  if (typeof input !== 'string') return null;
  const key = input.trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(PLATFORMS, key) ? key : null;
}

export function isSupportedPlatform(input) {
  return normalizePlatform(input) !== null;
}

export function getPlatform(input) {
  const key = normalizePlatform(input);
  return key ? PLATFORMS[key] : null;
}

/** Regional cluster used for match-v5 given a platform id. */
export function getMatchRoute(input) {
  return getPlatform(input)?.matchRoute ?? null;
}

/** Regional cluster used for account-v1 given a platform id. */
export function getAccountRoute(input) {
  return getPlatform(input)?.accountRoute ?? null;
}
