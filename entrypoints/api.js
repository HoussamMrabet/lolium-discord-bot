import { env } from '../src/config/env.js';
import { connectMongo, disconnectMongo } from '../src/database/connection.js';
import { getRedis, closeRedis } from '../src/core/redis.js';
import { createLogger } from '../src/core/logger.js';
import { registerShutdown } from '../src/core/shutdown.js';
import { repositories } from '../src/database/repositories/index.js';
import { createRiotService } from '../src/riot/index.js';
import { createServices } from '../src/services/index.js';
import { createApp } from '../src/api/app.js';

/** REST API process for the dashboard. */
const log = createLogger('api');

function assertOauthConfigured() {
  const missing = [];
  if (!env.DISCORD_CLIENT_SECRET) missing.push('DISCORD_CLIENT_SECRET');
  if (!env.DISCORD_OAUTH_REDIRECT_URI) missing.push('DISCORD_OAUTH_REDIRECT_URI');
  if (missing.length) {
    log.error({ missing }, 'OAuth is not configured — API cannot start');
    process.exit(1);
  }
}

async function main() {
  assertOauthConfigured();
  await connectMongo();

  const redis = getRedis();
  const riot = createRiotService();
  const services = createServices({ riot, repositories, logger: log });
  const app = createApp({ repositories, services, redis });

  const server = app.listen(env.API_PORT, () =>
    log.info({ port: env.API_PORT }, 'api listening'),
  );

  registerShutdown([
    () => new Promise((resolve) => server.close(resolve)),
    closeRedis,
    disconnectMongo,
  ]);
}

main().catch((err) => {
  log.error({ err }, 'api failed to start');
  process.exit(1);
});
