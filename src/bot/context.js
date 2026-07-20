import { repositories } from '../database/repositories/index.js';
import { logger } from '../core/logger.js';
import { env } from '../config/env.js';
import { createRiotService } from '../riot/index.js';
import { createServices } from '../services/index.js';

/**
 * Builds the shared context passed to every command and event. This is the bot's
 * dependency-injection seam: handlers receive their dependencies here rather than
 * importing singletons, which keeps them testable. `commands` and
 * `componentHandlers` are populated by the loaders during bootstrap.
 *
 * `riot` and `services` are constructed lazily-ish here (the Riot service opens
 * its Redis-backed limiter/cache); tests that only exercise loaders never call
 * this, so they stay Redis-free.
 */
export function createBotContext(client, extra = {}) {
  const log = logger.child({ component: 'bot' });
  const riot = extra.riot ?? createRiotService({ logger: log.child({ module: 'riot' }) });
  const services =
    extra.services ?? createServices({ riot, repositories, logger: log });

  return {
    client,
    repositories,
    riot,
    services,
    config: env,
    logger: log,
    commands: new Map(),
    componentHandlers: new Map(),
    ...extra,
  };
}
