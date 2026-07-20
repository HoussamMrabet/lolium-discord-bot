import { accountHost, getAccountRoute } from '../routing.js';
import { CACHE_KEYS, CACHE_TTL } from '../../config/constants.js';

/**
 * account-v1 — Riot ID <-> PUUID. Regional host (americas/asia/europe).
 * PUUID is permanent, so we cache aggressively (24h) and negative-cache misses.
 */
export function getAccountByRiotId(client, { gameName, tagLine, platform }) {
  const route = getAccountRoute(platform);
  const url = `${accountHost(platform)}/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;
  return client.request(route, url, {
    methodId: 'account.byRiotId',
    cache: {
      key: CACHE_KEYS.account(route, gameName, tagLine),
      ttl: CACHE_TTL.ACCOUNT,
      negativeTtl: CACHE_TTL.NEGATIVE,
    },
  });
}

export function getAccountByPuuid(client, { puuid, platform }) {
  const route = getAccountRoute(platform);
  const url = `${accountHost(platform)}/riot/account/v1/accounts/by-puuid/${encodeURIComponent(puuid)}`;
  return client.request(route, url, {
    methodId: 'account.byPuuid',
    cache: { key: `riot:account:puuid:${route}:${puuid}`, ttl: CACHE_TTL.ACCOUNT },
  });
}
