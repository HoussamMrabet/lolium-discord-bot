import { env } from '../src/config/env.js';
import { connectMongo, disconnectMongo } from '../src/database/connection.js';
import { getRedis, closeRedis } from '../src/core/redis.js';
import { createLogger } from '../src/core/logger.js';
import { registerShutdown } from '../src/core/shutdown.js';
import { repositories } from '../src/database/repositories/index.js';
import { createPollStore } from '../src/jobs/pollStore.js';
import { createPollScheduler } from '../src/jobs/pollScheduler.js';
import { createLeaderboardScheduler } from '../src/jobs/leaderboardScheduler.js';
import { createRecapScheduler } from '../src/jobs/recapScheduler.js';
import {
  riotFetchQueue,
  leaderboardQueue,
  recapQueue,
  closeQueues,
} from '../src/queues/index.js';

/**
 * Scheduler process (singleton). Ticks the adaptive poll loop, and on slower
 * intervals enqueues leaderboard refreshes and timezone-aware recaps.
 */
const LEADERBOARD_INTERVAL_MS = 15 * 60 * 1000;
const RECAP_INTERVAL_MS = 20 * 60 * 1000;

const log = createLogger('scheduler');

async function main() {
  await connectMongo();

  const pollStore = createPollStore(getRedis());
  const pollScheduler = createPollScheduler({
    pollStore,
    repositories,
    riotFetchQueue,
    logger: log,
  });
  const leaderboardScheduler = createLeaderboardScheduler({
    repositories,
    leaderboardQueue,
    logger: log,
  });
  const recapScheduler = createRecapScheduler({
    repositories,
    recapQueue,
    logger: log,
  });

  log.info({ intervalMs: env.POLL_TICK_INTERVAL_MS }, 'scheduler starting');
  const pollTimer = setInterval(() => pollScheduler.tick(), env.POLL_TICK_INTERVAL_MS);
  const lbTimer = setInterval(
    () =>
      leaderboardScheduler
        .enqueueDueGuilds()
        .catch((err) => log.error({ err }, 'leaderboard tick failed')),
    LEADERBOARD_INTERVAL_MS,
  );
  const recapTimer = setInterval(
    () =>
      recapScheduler
        .enqueueDue()
        .catch((err) => log.error({ err }, 'recap tick failed')),
    RECAP_INTERVAL_MS,
  );
  await pollScheduler.tick(); // run one immediately on boot

  registerShutdown([
    () => clearInterval(pollTimer),
    () => clearInterval(lbTimer),
    () => clearInterval(recapTimer),
    closeQueues,
    closeRedis,
    disconnectMongo,
  ]);
}

main().catch((err) => {
  log.error({ err }, 'scheduler failed to start');
  process.exit(1);
});
