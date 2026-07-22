import { REST } from 'discord.js';
import { env } from '../src/config/env.js';
import { QUEUE_NAMES } from '../src/config/constants.js';
import { connectMongo, disconnectMongo } from '../src/database/connection.js';
import { getRedis, closeRedis } from '../src/core/redis.js';
import { createLogger } from '../src/core/logger.js';
import { registerShutdown } from '../src/core/shutdown.js';
import { repositories } from '../src/database/repositories/index.js';
import { createRiotService } from '../src/riot/index.js';
import { createServices } from '../src/services/index.js';
import { createNotificationService } from '../src/services/notification.service.js';
import { createPollStore } from '../src/jobs/pollStore.js';
import { createPollScheduler } from '../src/jobs/pollScheduler.js';
import { createLeaderboardScheduler } from '../src/jobs/leaderboardScheduler.js';
import { createRecapScheduler } from '../src/jobs/recapScheduler.js';
import { createRoleTrigger } from '../src/jobs/roleTrigger.js';
import {
  riotFetchQueue,
  matchProcessQueue,
  notifyQueue,
  roleSyncQueue,
  leaderboardQueue,
  recapQueue,
  closeQueues,
} from '../src/queues/index.js';
import {
  startWorker,
  createRiotFetchProcessor,
  createMatchProcessProcessor,
  createNotifyDispatchProcessor,
  createLeaderboardComputeProcessor,
  createRoleSyncProcessor,
  createRecapGenerateProcessor,
} from '../src/workers/index.js';
import { startBot } from '../src/bot/bootstrap.js';
import { createApp } from '../src/api/app.js';

/**
 * Single-process mode: runs the bot (one shard, no ShardingManager), the
 * scheduler loops, every worker, and the API in one Node process. Ideal for
 * small/single-server deployments. Larger deployments run each entrypoint
 * separately and scale workers independently.
 */
const log = createLogger('mono');
const LEADERBOARD_INTERVAL_MS = 15 * 60 * 1000;
const RECAP_INTERVAL_MS = 20 * 60 * 1000;

async function main() {
  await connectMongo();

  const redis = getRedis();
  const riot = createRiotService();
  const services = createServices({ riot, repositories, logger: log });
  const notifications = createNotificationService({ repositories, notifyQueue, logger: log });
  const roleTrigger = createRoleTrigger({ repositories, roleSyncQueue });
  const pollStore = createPollStore(redis);
  const rest = new REST({ version: '10' }).setToken(env.DISCORD_TOKEN);
  const concurrency = env.WORKER_CONCURRENCY;

  const workers = [
    startWorker(QUEUE_NAMES.RIOT_FETCH, createRiotFetchProcessor({ repositories, riot, matchProcessQueue, pollStore, logger: log }), { concurrency }),
    startWorker(QUEUE_NAMES.MATCH_PROCESS, createMatchProcessProcessor({ services, notifications, roleTrigger, logger: log }), { concurrency }),
    startWorker(QUEUE_NAMES.NOTIFY_DISPATCH, createNotifyDispatchProcessor({ repositories, rest, logger: log }), { concurrency }),
    startWorker(QUEUE_NAMES.LEADERBOARD_COMPUTE, createLeaderboardComputeProcessor({ repositories, leaderboard: services.leaderboard, rest, logger: log }), { concurrency }),
    startWorker(QUEUE_NAMES.ROLE_SYNC, createRoleSyncProcessor({ repositories, roleSync: services.roleSync, rest, logger: log }), { concurrency }),
    startWorker(QUEUE_NAMES.RECAP_GENERATE, createRecapGenerateProcessor({ repositories, recap: services.recap, rest, logger: log }), { concurrency }),
  ];

  const pollScheduler = createPollScheduler({ pollStore, repositories, riotFetchQueue, logger: log });
  const leaderboardScheduler = createLeaderboardScheduler({ repositories, leaderboardQueue, logger: log });
  const recapScheduler = createRecapScheduler({ repositories, recapQueue, logger: log });

  const pollTimer = setInterval(() => pollScheduler.tick(), env.POLL_TICK_INTERVAL_MS);
  const lbTimer = setInterval(
    () => leaderboardScheduler.enqueueDueGuilds().catch((err) => log.error({ err }, 'leaderboard tick failed')),
    LEADERBOARD_INTERVAL_MS,
  );
  const recapTimer = setInterval(
    () => recapScheduler.enqueueDue().catch((err) => log.error({ err }, 'recap tick failed')),
    RECAP_INTERVAL_MS,
  );
  await pollScheduler.tick();

  const { client } = await startBot();

  let server;
  if (env.DISCORD_CLIENT_SECRET && env.DISCORD_OAUTH_REDIRECT_URI) {
    const app = createApp({ repositories, services, redis, riot });
    server = app.listen(env.API_PORT, () => log.info({ port: env.API_PORT }, 'api listening'));
  } else {
    log.warn('OAuth not configured — dashboard API disabled in mono mode');
  }

  log.info({ workers: workers.length, api: Boolean(server) }, 'mono process started');

  registerShutdown([
    () => {
      clearInterval(pollTimer);
      clearInterval(lbTimer);
      clearInterval(recapTimer);
    },
    () => Promise.all(workers.map((w) => w.close())),
    () => (server ? new Promise((resolve) => server.close(resolve)) : undefined),
    () => client.destroy(),
    closeQueues,
    closeRedis,
    disconnectMongo,
  ]);
}

main().catch((err) => {
  log.error({ err }, 'mono failed to start');
  process.exit(1);
});
