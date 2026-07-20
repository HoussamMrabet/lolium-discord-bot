import { Worker } from 'bullmq';
import { createBullConnection } from '../core/redis.js';
import { createLogger } from '../core/logger.js';

const log = createLogger('worker-runner');

/**
 * Starts a BullMQ worker with its own dedicated Redis connection (workers issue
 * blocking commands, so they must not share a connection). Failures are logged;
 * BullMQ handles retry/backoff per the queue's job options.
 */
export function startWorker(name, processor, { concurrency = 5 } = {}) {
  const worker = new Worker(name, processor, {
    connection: createBullConnection(),
    concurrency,
  });

  worker.on('failed', (job, err) =>
    log.error({ queue: name, jobId: job?.id, err }, 'job failed'),
  );
  worker.on('error', (err) => log.error({ queue: name, err }, 'worker error'));

  return worker;
}

export { createRiotFetchProcessor } from './riotFetch.js';
export { createMatchProcessProcessor } from './matchProcess.js';
export { createNotifyDispatchProcessor } from './notifyDispatch.js';
