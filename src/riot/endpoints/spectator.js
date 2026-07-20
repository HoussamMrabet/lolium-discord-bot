import { platformHost, normalizePlatform } from '../routing.js';
import { CACHE_KEYS, CACHE_TTL } from '../../config/constants.js';

/**
 * spectator-v5 — the player's active game, or `null` when they aren't in one
 * (Riot returns 404, which we translate to null via `allowNull`). Used sparingly
 * (only for `active`-tier players) to open betting windows. Cached ~20s.
 */
export function getActiveGameByPuuid(client, { puuid, platform }) {
  const p = normalizePlatform(platform);
  const url = `${platformHost(platform)}/lol/spectator/v5/active-games/by-summoner/${encodeURIComponent(puuid)}`;
  return client.request(p, url, {
    methodId: 'spectator.activeGame',
    allowNull: true,
    cache: {
      key: CACHE_KEYS.spectator(p, puuid),
      ttl: CACHE_TTL.SPECTATOR,
      negativeTtl: CACHE_TTL.SPECTATOR,
    },
  });
}
