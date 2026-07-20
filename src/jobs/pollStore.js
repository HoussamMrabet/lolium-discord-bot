import { REDIS_KEYS } from '../config/constants.js';

/**
 * Thin wrapper over the Redis sorted set that drives adaptive polling.
 * Members are summoner ids; scores are the epoch-ms time each is next due.
 * `ZRANGEBYSCORE ... -inf now` is an O(log n) "what's due?" query that scales to
 * 100k+ accounts without touching Mongo on the hot path.
 */
export function createPollStore(redis) {
  const KEY = REDIS_KEYS.POLL_DUE;

  return {
    /** Schedule/reschedule a summoner's next check (overwrites the score). */
    schedule(member, scoreMs) {
      return redis.zadd(KEY, scoreMs, String(member));
    },

    /** Seed members only if absent (NX) — used by reconciliation from Mongo. */
    scheduleNewOnly(pairs) {
      if (!pairs.length) return Promise.resolve(0);
      const args = ['NX'];
      for (const [score, member] of pairs) args.push(score, String(member));
      return redis.zadd(KEY, ...args);
    },

    remove(member) {
      return redis.zrem(KEY, String(member));
    },

    /** Members due at or before `nowMs` (soonest first), up to `limit`. */
    dueBefore(nowMs, limit) {
      return redis.zrangebyscore(KEY, '-inf', nowMs, 'LIMIT', 0, limit);
    },

    /**
     * Tentatively push due members forward so they aren't re-popped before their
     * poll job runs; the worker later sets the precise next time.
     */
    async tentativeRequeue(members, scoreMs) {
      if (!members.length) return;
      const pipeline = redis.pipeline();
      for (const m of members) pipeline.zadd(KEY, scoreMs, String(m));
      await pipeline.exec();
    },

    count() {
      return redis.zcard(KEY);
    },
  };
}
