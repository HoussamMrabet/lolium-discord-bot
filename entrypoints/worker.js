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
import { matchProcessQueue, notifyQueue, closeQueues } from '../src/queues/index.js';
import {
  startWorker,
  createRiotFetchProcessor,
  createMatchProcessProcessor,
  createNotifyDispatchProcessor,
} from '../src/workers/index.js';

/**
 * Worker process. `WORKER_TYPE` selects which queue to consume
 * (riot-fetch | match-process | notify-dispatch | all). Horizontally scalable —
 * run as many replicas as queue depth demands.
 */
const log = createLogger('worker');

async function main() {
  await connectMongo();

  const riot = createRiotService();
  const services = createServices({ riot, repositories, logger: log });
  const notifications = createNotificationService({
    repositories,
    notifyQueue,
    logger: log,
  });
  const pollStore = createPollStore(getRedis());
  const type = env.WORKER_TYPE || 'all';
  const concurrency = env.WORKER_CONCURRENCY;
  const workers = [];

  if (type === QUEUE_NAMES.RIOT_FETCH || type === 'all') {
    workers.push(
      startWorker(
        QUEUE_NAMES.RIOT_FETCH,
        createRiotFetchProcessor({
          repositories,
          riot,
          matchProcessQueue,
          pollStore,
          logger: log,
        }),
        { concurrency },
      ),
    );
  }

  if (type === QUEUE_NAMES.MATCH_PROCESS || type === 'all') {
    workers.push(
      startWorker(
        QUEUE_NAMES.MATCH_PROCESS,
        createMatchProcessProcessor({ services, notifications, logger: log }),
        { concurrency },
      ),
    );
  }

  if (type === QUEUE_NAMES.NOTIFY_DISPATCH || type === 'all') {
    const rest = new REST({ version: '10' }).setToken(env.DISCORD_TOKEN);
    workers.push(
      startWorker(
        QUEUE_NAMES.NOTIFY_DISPATCH,
        createNotifyDispatchProcessor({ repositories, rest, logger: log }),
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
