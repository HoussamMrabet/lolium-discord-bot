import { repositories } from '../database/repositories/index.js';
import { logger } from '../core/logger.js';
import { env } from '../config/env.js';

/**
 * Builds the shared context passed to every command and event. This is the bot's
 * dependency-injection seam: handlers receive their dependencies here rather than
 * importing singletons, which keeps them testable. `commands` and
 * `componentHandlers` are populated by the loaders during bootstrap.
 */
export function createBotContext(client, extra = {}) {
  return {
    client,
    repositories,
    config: env,
    logger: logger.child({ component: 'bot' }),
    commands: new Map(),
    componentHandlers: new Map(),
    ...extra,
  };
}
