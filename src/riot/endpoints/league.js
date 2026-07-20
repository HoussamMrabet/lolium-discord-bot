import { platformHost, normalizePlatform } from '../routing.js';
import { CACHE_KEYS, CACHE_TTL } from '../../config/constants.js';

/**
 * league-v4 ranked entries by PUUID. Returns an array (empty when unranked).
 * Cached only briefly (90s) to dedupe bursts — the DB is the source of truth
 * for LP deltas, not the cache.
 */
export function getLeagueEntriesByPuuid(client, { puuid, platform }) {
  const p = normalizePlatform(platform);
  const url = `${platformHost(platform)}/lol/league/v4/entries/by-puuid/${encodeURIComponent(puuid)}`;
  return client.request(p, url, {
    methodId: 'league.byPuuid',
    cache: { key: CACHE_KEYS.league(p, puuid), ttl: CACHE_TTL.LEAGUE },
  });
}
