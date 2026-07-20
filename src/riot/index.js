import { env } from '../config/env.js';
import { getRedis } from '../core/redis.js';
import { createLogger } from '../core/logger.js';
import { RiotRateLimiter } from './rateLimiter.js';
import { RiotCache } from './cache.js';
import { RiotClient } from './client.js';
import { RiotService } from './service.js';

/**
 * Composition root for the Riot layer. Wires the rate limiter, cache, and HTTP
 * client and returns a RiotService facade. Dependencies are injectable so tests
 * can pass fakes (fake limiter, in-memory cache) without touching Redis.
 */
export function createRiotService(overrides = {}) {
  const logger = overrides.logger ?? createLogger('riot');

  // Only touch Redis if we actually need to build a limiter or cache.
  let redis = overrides.redis;
  const ensureRedis = () => (redis ??= getRedis());

  const limiter =
    overrides.limiter ?? new RiotRateLimiter(ensureRedis(), { logger });
  const cache = overrides.cache ?? new RiotCache(ensureRedis());
  const client =
    overrides.client ??
    new RiotClient({
      apiKey: overrides.apiKey ?? env.RIOT_API_KEY,
      limiter,
      cache,
      maxRetries: overrides.maxRetries ?? env.RIOT_MAX_RETRIES,
      logger,
    });

  return new RiotService(client);
}

export { RiotService, RiotClient, RiotRateLimiter, RiotCache };
