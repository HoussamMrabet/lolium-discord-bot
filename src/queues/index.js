import { Queue } from 'bullmq';
import { getBullConnection } from '../core/redis.js';
import { QUEUE_NAMES, riotFetchQueueName } from '../config/constants.js';

/**
 * Queue registry. Queues are created lazily and cached. Sensible default job
 * options (bounded retention + exponential-backoff retries) apply to every
 * queue; terminal failures are surfaced via BullMQ's failed set and can be moved
 * to the dead-letter queue for inspection/replay.
 */
const queues = new Map();

const DEFAULT_JOB_OPTIONS = {
  attempts: 5,
  backoff: { type: 'exponential', delay: 2000 },
  removeOnComplete: { count: 1000, age: 24 * 3600 },
  removeOnFail: { count: 5000, age: 7 * 24 * 3600 },
};

export function getQueue(name, jobOptions = {}) {
  if (!queues.has(name)) {
    queues.set(
      name,
      new Queue(name, {
        connection: getBullConnection(),
        defaultJobOptions: { ...DEFAULT_JOB_OPTIONS, ...jobOptions },
      }),
    );
  }
  return queues.get(name);
}

// NOTE: For 7a we use a single riot-fetch queue and rely on the per-region Redis
// rate limiter. Per-region queues (via riotFetchQueueName) are a future
// optimization to isolate one region's throttle from another's backlog.
export const riotFetchQueue = () => getQueue(QUEUE_NAMES.RIOT_FETCH);
export const matchProcessQueue = () => getQueue(QUEUE_NAMES.MATCH_PROCESS);
export const notifyQueue = () => getQueue(QUEUE_NAMES.NOTIFY_DISPATCH);
export const roleSyncQueue = () => getQueue(QUEUE_NAMES.ROLE_SYNC);
export const leaderboardQueue = () => getQueue(QUEUE_NAMES.LEADERBOARD_COMPUTE);
export const recapQueue = () => getQueue(QUEUE_NAMES.RECAP_GENERATE);
export const deadLetterQueue = () => getQueue(QUEUE_NAMES.DEAD_LETTER);

export { riotFetchQueueName };

export async function closeQueues() {
  await Promise.all([...queues.values()].map((q) => q.close()));
  queues.clear();
}
