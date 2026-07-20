/**
 * Redis-backed JSON cache for Riot responses.
 *
 * Convention:
 *   get(key) -> undefined  => cache MISS
 *   get(key) -> null       => negative cache HIT ("we know this doesn't exist")
 *   get(key) -> value      => positive cache HIT
 *
 * This lets us cache 404s (negative caching) so a missing account isn't
 * re-fetched from Riot on every attempt.
 */
export class RiotCache {
  constructor(redis) {
    this.redis = redis;
  }

  async get(key) {
    const raw = await this.redis.get(key);
    if (raw === null || raw === undefined) return undefined; // miss
    try {
      return JSON.parse(raw); // may be `null` for a negative cache entry
    } catch {
      return undefined;
    }
  }

  async set(key, value, ttlSeconds) {
    const raw = JSON.stringify(value ?? null);
    if (ttlSeconds && ttlSeconds > 0) {
      await this.redis.set(key, raw, 'EX', ttlSeconds);
    } else {
      await this.redis.set(key, raw);
    }
  }

  del(key) {
    return this.redis.del(key);
  }
}

export default RiotCache;
