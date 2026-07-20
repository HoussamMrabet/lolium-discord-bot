import { REDIS_KEYS } from '../config/constants.js';
import { createLogger } from '../core/logger.js';
import { RiotRateLimitError } from '../core/errors.js';
import { sleep, jitter } from '../utils/async.js';

/**
 * Distributed Riot rate limiter.
 *
 * Riot's app rate limit is GLOBAL per routing region (each host has its own
 * bucket), but we run many worker replicas — so the limiter must be shared, not
 * per-process. It lives in Redis and is enforced by an atomic Lua script.
 *
 * We honor Riot's *live* limits: after every response we read `X-App-Rate-Limit`
 * and adopt those windows for the region, so upgrading from a dev key to a
 * production key needs zero code change. A `safetyFactor` keeps us a hair under
 * the real ceiling. On a 429 we pause the whole region for `Retry-After`.
 */

// Dev-key defaults until we learn the real limits from response headers.
const DEFAULT_APP_WINDOWS = [
  [20, 1000], // 20 requests / 1s
  [100, 120000], // 100 requests / 2min
];

/**
 * Atomic multi-window sliding-log limiter. For each (key, limit, windowMs):
 * evict expired members, and if ANY window is full, block and report the
 * longest wait. Only if every window has room do we consume a slot in all of
 * them — so app + method windows can be checked together without partial spend.
 *
 * KEYS[i]   = ZSET for window i
 * ARGV      = now_ms, member, then (limit, windowMs) pairs per window
 * returns   = { allowed(0|1), retryMs }
 */
const ACQUIRE_LUA = `
local now = tonumber(ARGV[1])
local member = ARGV[2]
local n = #KEYS
local retry = 0
local blocked = 0
for i = 1, n do
  local limit = tonumber(ARGV[1 + (i * 2)])
  local windowMs = tonumber(ARGV[2 + (i * 2)])
  local key = KEYS[i]
  redis.call('ZREMRANGEBYSCORE', key, 0, now - windowMs)
  local count = redis.call('ZCARD', key)
  if count >= limit then
    blocked = 1
    local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
    local wait = windowMs
    if oldest[2] then
      wait = (tonumber(oldest[2]) + windowMs) - now
    end
    if wait > retry then retry = wait end
  end
end
if blocked == 1 then
  return { 0, retry }
end
for i = 1, n do
  local windowMs = tonumber(ARGV[2 + (i * 2)])
  local key = KEYS[i]
  redis.call('ZADD', key, now, member)
  redis.call('PEXPIRE', key, windowMs + 1000)
end
return { 1, 0 }
`;

/** Parses "20:1,100:120" -> [[20,1000],[100,120000]]. */
export function parseLimitHeader(value) {
  if (!value) return null;
  const windows = [];
  for (const part of String(value).split(',')) {
    const [count, seconds] = part.split(':').map((n) => Number(n.trim()));
    if (Number.isFinite(count) && Number.isFinite(seconds) && seconds > 0) {
      windows.push([count, seconds * 1000]);
    }
  }
  return windows.length ? windows : null;
}

/** Retry-After (seconds) -> milliseconds, with a fallback. */
export function parseRetryAfter(value, fallbackMs = 1000) {
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  return fallbackMs;
}

export class RiotRateLimiter {
  constructor(
    redis,
    {
      appWindows = DEFAULT_APP_WINDOWS,
      safetyFactor = 0.9,
      logger = createLogger('riot-limiter'),
    } = {},
  ) {
    this.redis = redis;
    this.defaultWindows = appWindows;
    this.regionWindows = new Map(); // region -> learned windows
    this.safetyFactor = safetyFactor;
    this.logger = logger;
    this._counter = 0;
  }

  windowsFor(region) {
    return this.regionWindows.get(region) ?? this.defaultWindows;
  }

  /** Adopt the region's real limits from a Riot response's headers. */
  syncFromHeaders(region, headers = {}) {
    const learned = parseLimitHeader(
      headers['x-app-rate-limit'] ?? headers['X-App-Rate-Limit'],
    );
    if (learned) this.regionWindows.set(region, learned);
  }

  async pauseRegion(region, ms) {
    await this.redis.set(
      REDIS_KEYS.regionPause(region),
      '1',
      'PX',
      Math.max(1, Math.ceil(ms)),
    );
    this.logger.warn({ region, ms }, 'region paused after 429');
  }

  async getPauseMs(region) {
    const ttl = await this.redis.pttl(REDIS_KEYS.regionPause(region));
    return ttl > 0 ? ttl : 0;
  }

  /** One non-blocking attempt. Returns { allowed, retryAfterMs }. */
  async tryAcquire(region) {
    const windows = this.windowsFor(region);
    const now = Date.now();
    this._counter = (this._counter + 1) % 1_000_000;
    const member = `${now}-${this._counter}-${Math.random().toString(36).slice(2, 8)}`;

    const keys = windows.map(([, w]) => `${REDIS_KEYS.rateLimitApp(region)}:w${w}`);
    const argv = [String(now), member];
    for (const [limit, w] of windows) {
      const eff = Math.max(1, Math.floor(limit * this.safetyFactor));
      argv.push(String(eff), String(w));
    }

    const [allowed, retry] = await this.redis.eval(
      ACQUIRE_LUA,
      keys.length,
      ...keys,
      ...argv,
    );
    return { allowed: Number(allowed) === 1, retryAfterMs: Number(retry) };
  }

  /**
   * Blocks until a slot is acquired for `region`, honoring region pauses and
   * window waits. Throws RiotRateLimitError if it would exceed `maxWaitMs`
   * (so a queue job fails fast and is retried rather than blocking forever).
   */
  async take(region, { maxWaitMs = 30_000 } = {}) {
    const deadline = Date.now() + maxWaitMs;
    for (;;) {
      const paused = await this.getPauseMs(region);
      if (paused > 0) {
        if (Date.now() + paused > deadline) {
          throw new RiotRateLimitError('region paused', {
            retryAfter: paused / 1000,
            region,
          });
        }
        await sleep(Math.min(paused, maxWaitMs));
        continue;
      }

      const { allowed, retryAfterMs } = await this.tryAcquire(region);
      if (allowed) return;

      const wait = Math.max(retryAfterMs, 20);
      if (Date.now() + wait > deadline) {
        throw new RiotRateLimitError('local rate-limit wait exceeded', {
          retryAfter: wait / 1000,
          region,
        });
      }
      await sleep(wait + jitter(25));
    }
  }
}

export default RiotRateLimiter;
