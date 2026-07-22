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
import { createRoleTrigger } from '../src/jobs/roleTrigger.js';
import {
  matchProcessQueue,
  notifyQueue,
  roleSyncQueue,
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

/**
 * Worker process. `WORKER_TYPE` selects which queue(s) to consume:
 * riot-fetch | match-process | notify-dispatch | leaderboard-compute |
 * role-sync | all. Horizontally scalable.
 */
const log = createLogger('worker');

async function main() {
  await connectMongo();

  const riot = createRiotService();
  const services = createServices({ riot, repositories, logger: log });
  const notifications = createNotificationService({ repositories, notifyQueue, logger: log });
  const roleTrigger = createRoleTrigger({ repositories, roleSyncQueue });
  const pollStore = createPollStore(getRedis());
  const rest = new REST({ version: '10' }).setToken(env.DISCORD_TOKEN);

  const type = env.WORKER_TYPE || 'all';
  const concurrency = env.WORKER_CONCURRENCY;
  const all = type === 'all';
  const workers = [];

  if (all || type === QUEUE_NAMES.RIOT_FETCH) {
    workers.push(
      startWorker(
        QUEUE_NAMES.RIOT_FETCH,
        createRiotFetchProcessor({ repositories, riot, matchProcessQueue, pollStore, logger: log }),
        { concurrency },
      ),
    );
  }

  if (all || type === QUEUE_NAMES.MATCH_PROCESS) {
    workers.push(
      startWorker(
        QUEUE_NAMES.MATCH_PROCESS,
        createMatchProcessProcessor({ services, notifications, roleTrigger, logger: log }),
        { concurrency },
      ),
    );
  }

  if (all || type === QUEUE_NAMES.NOTIFY_DISPATCH) {
    workers.push(
      startWorker(
        QUEUE_NAMES.NOTIFY_DISPATCH,
        createNotifyDispatchProcessor({ repositories, rest, logger: log }),
        { concurrency },
      ),
    );
  }

  if (all || type === QUEUE_NAMES.LEADERBOARD_COMPUTE) {
    workers.push(
      startWorker(
        QUEUE_NAMES.LEADERBOARD_COMPUTE,
        createLeaderboardComputeProcessor({
          repositories,
          leaderboard: services.leaderboard,
          rest,
          logger: log,
        }),
        { concurrency },
      ),
    );
  }

  if (all || type === QUEUE_NAMES.ROLE_SYNC) {
    workers.push(
      startWorker(
        QUEUE_NAMES.ROLE_SYNC,
        createRoleSyncProcessor({
          repositories,
          roleSync: services.roleSync,
          rest,
          logger: log,
        }),
        { concurrency },
      ),
    );
  }

  if (all || type === QUEUE_NAMES.RECAP_GENERATE) {
    workers.push(
      startWorker(
        QUEUE_NAMES.RECAP_GENERATE,
        createRecapGenerateProcessor({
          repositories,
          recap: services.recap,
          rest,
          logger: log,
        }),
        { concurrency },
      ),
    );
  }

  if (!workers.length) {
    log.error({ type }, 'unknown WORKER_TYPE');
    process.exit(1);
  }

  log.info({ type, count: workers.length, concurrency }, 'workers started');

  registerShutdown([
    () => Promise.all(workers.map((w) => w.close())),
    closeQueues,
    closeRedis,
    disconnectMongo,
  ]);
}

main().catch((err) => {
  log.error({ err }, 'worker failed to start');
  process.exit(1);
});
