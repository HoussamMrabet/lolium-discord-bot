import IORedis from 'ioredis';
import { env } from '../config/env.js';
import { createLogger } from './logger.js';

const log = createLogger('redis');

/**
 * Connection registry. We keep two long-lived connections with different
 * semantics and lazily create more on demand:
 *
 *  - `bull`  : used by BullMQ. Requires `maxRetriesPerRequest: null` and no
 *              ready-check gating so blocking commands (BRPOPLPUSH etc.) work.
 *  - `cache` : general purpose (response cache, rate limiter, locks, ZSETs).
 *
 * Mixing these settings on one connection is a well-known BullMQ footgun, so the
 * factory hands out the correct connection per use.
 */
const connections = new Map();

function build(purpose, overrides = {}) {
  const conn = new IORedis(env.REDIS_URL, {
    enableReadyCheck: true,
    ...overrides,
  });

  conn.on('ready', () => log.info({ purpose }, 'redis connection ready'));
  conn.on('error', (err) => log.error({ purpose, err }, 'redis connection error'));
  conn.on('close', () => log.warn({ purpose }, 'redis connection closed'));
  conn.on('reconnecting', (delay) =>
    log.warn({ purpose, delay }, 'redis reconnecting'),
  );

  return conn;
}

/** Shared connection for BullMQ producers (Queue instances). */
export function getBullConnection() {
  if (!connections.has('bull')) {
    connections.set(
      'bull',
      build('bull', { maxRetriesPerRequest: null, enableReadyCheck: false }),
    );
  }
  return connections.get('bull');
}

/**
 * A FRESH BullMQ-compatible connection (not cached). Each BullMQ Worker needs
 * its own connection because it issues blocking commands; sharing one across
 * workers would serialize them.
 */
export function createBullConnection() {
  return build('bull-worker', {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}

/** Shared general-purpose connection (cache, limiter, locks, leaderboards). */
export function getRedis() {
  if (!connections.has('cache')) {
    connections.set('cache', build('cache'));
  }
  return connections.get('cache');
}

/** Gracefully close every connection (called on shutdown). */
export async function closeRedis() {
  const conns = [...connections.values()];
  connections.clear();
  await Promise.all(
    conns.map((c) => c.quit().catch(() => c.disconnect())),
  );
  log.info('redis connections closed');
}
