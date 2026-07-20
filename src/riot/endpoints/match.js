import { matchHost, getMatchRoute } from '../routing.js';
import { CACHE_KEYS, CACHE_TTL } from '../../config/constants.js';

/**
 * match-v5 — match ids by PUUID. Regional host. This is the highest-frequency
 * poll, so the short cache (45s) is important to kill duplicate polls within a
 * scheduling window.
 */
export function getMatchIdsByPuuid(
  client,
  { puuid, platform, start = 0, count = 20, startTime, endTime, queue, type },
) {
  const route = getMatchRoute(platform);
  const url = `${matchHost(platform)}/lol/match/v5/matches/by-puuid/${encodeURIComponent(puuid)}/ids`;

  const params = { start, count };
  if (startTime !== undefined) params.startTime = startTime;
  if (endTime !== undefined) params.endTime = endTime;
  if (queue !== undefined) params.queue = queue;
  if (type !== undefined) params.type = type;

  const keySuffix = `${start}:${count}:${startTime ?? ''}:${queue ?? ''}:${type ?? ''}`;
  return client.request(route, url, {
    methodId: 'match.ids',
    params,
    cache: {
      key: `${CACHE_KEYS.matchIds(route, puuid)}:${keySuffix}`,
      ttl: CACHE_TTL.MATCH_IDS,
    },
  });
}

/**
 * match-v5 — full match detail. Immutable once the game is over, so the Redis
 * hot cache is long-lived and Mongo is the permanent canonical store.
 */
export function getMatchById(client, { matchId, platform }) {
  const route = getMatchRoute(platform);
  const url = `${matchHost(platform)}/lol/match/v5/matches/${encodeURIComponent(matchId)}`;
  return client.request(route, url, {
    methodId: 'match.byId',
    cache: { key: CACHE_KEYS.matchDetail(route, matchId), ttl: CACHE_TTL.MATCH_DETAIL },
  });
}
