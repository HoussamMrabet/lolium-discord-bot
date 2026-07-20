import { platformHost, normalizePlatform } from '../routing.js';
import { CACHE_KEYS, CACHE_TTL } from '../../config/constants.js';

/**
 * summoner-v4 by PUUID — level, profile icon, encrypted summoner id.
 * Platform host (na1, euw1, ...). Slow-moving, cached 12h.
 */
export function getSummonerByPuuid(client, { puuid, platform }) {
  const p = normalizePlatform(platform);
  const url = `${platformHost(platform)}/lol/summoner/v4/summoners/by-puuid/${encodeURIComponent(puuid)}`;
  return client.request(p, url, {
    methodId: 'summoner.byPuuid',
    cache: { key: CACHE_KEYS.summoner(p, puuid), ttl: CACHE_TTL.SUMMONER },
  });
}
