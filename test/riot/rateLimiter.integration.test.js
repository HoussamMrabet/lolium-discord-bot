import Redis from 'ioredis';
import { RiotRateLimiter } from '../../src/riot/rateLimiter.js';

/**
 * Exercises the Lua-backed limiter against a real Redis. Skips gracefully when
 * Redis isn't reachable (e.g. local dev without the stack running); CI runs it
 * with a Redis service. Uses unique region keys per test so it never touches or
 * flushes existing data.
 */
describe('RiotRateLimiter (redis integration)', () => {
  let redis;
  let available = false;

  const region = () =>
    `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  beforeAll(async () => {
    redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      retryStrategy: () => null,
    });
    try {
      await redis.connect();
      await redis.ping();
      available = true;
    } catch {
      available = false;
    }
  });

  afterAll(async () => {
    if (redis) {
      try {
        await redis.quit();
      } catch {
        redis.disconnect();
      }
    }
  });

  it('allows up to the limit, then blocks with a positive retry hint', async () => {
    if (!available) {
      console.warn('redis unavailable — skipping limiter integration test');
      return;
    }
    const r = region();
    const limiter = new RiotRateLimiter(redis, {
      appWindows: [[3, 60000]],
      safetyFactor: 1,
    });

    for (let i = 0; i < 3; i += 1) {
      const res = await limiter.tryAcquire(r);
      expect(res.allowed).toBe(true);
    }
    const blocked = await limiter.tryAcquire(r);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });

  it('reports a region pause', async () => {
    if (!available) return;
    const r = region();
    const limiter = new RiotRateLimiter(redis, { appWindows: [[100, 60000]] });
    await limiter.pauseRegion(r, 500);
    expect(await limiter.getPauseMs(r)).toBeGreaterThan(0);
  });
});
