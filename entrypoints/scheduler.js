import { env } from '../src/config/env.js';
import { connectMongo, disconnectMongo } from '../src/database/connection.js';
import { getRedis, closeRedis } from '../src/core/redis.js';
import { createLogger } from '../src/core/logger.js';
import { registerShutdown } from '../src/core/shutdown.js';
import { repositories } from '../src/database/repositories/index.js';
import { createPollStore } from '../src/jobs/pollStore.js';
import { createPollScheduler } from '../src/jobs/pollScheduler.js';
import { riotFetchQueue, closeQueues } from '../src/queues/index.js';

/**
 * Scheduler process (singleton). Ticks the adaptive poll loop on an interval,
 * enqueuing riot-fetch jobs for due summoners. Repeatable jobs (recaps, role
 * reconciliation, betting resolution, season resets) are added in later phases.
 */
const log = createLogger('scheduler');

async function main() {
  await connectMongo();

  const pollStore = createPollStore(getRedis());
  const scheduler = createPollScheduler({
    pollStore,
    repositories,
    riotFetchQueue,
    logger: log,
  });

  log.info({ intervalMs: env.POLL_TICK_INTERVAL_MS }, 'poll scheduler starting');
  const timer = setInterval(() => scheduler.tick(), env.POLL_TICK_INTERVAL_MS);
  await scheduler.tick(); // run one immediately on boot

  registerShutdown([
    () => clearInterval(timer),
    closeQueues,
    closeRedis,
    disconnectMongo,
  ]);
}

main().catch((err) => {
  log.error({ err }, 'scheduler failed to start');
  process.exit(1);
});
