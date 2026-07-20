import { createLogger } from './logger.js';

const log = createLogger('shutdown');

/**
 * Registers graceful-shutdown handlers. Each handler runs once on SIGINT/SIGTERM
 * (and unhandled fatal errors), letting us close the Discord client, Mongo, and
 * Redis cleanly before exit.
 *
 * @param {Array<() => Promise<void> | void>} handlers
 */
export function registerShutdown(handlers = []) {
  let shuttingDown = false;

  const run = async (signal, code = 0) => {
    if (shuttingDown) return;
    shuttingDown = true;
    log.info({ signal }, 'graceful shutdown started');
    for (const handler of handlers) {
      try {
        await handler();
      } catch (err) {
        log.error({ err }, 'shutdown handler failed');
      }
    }
    log.info('graceful shutdown complete');
    process.exit(code);
  };

  process.once('SIGINT', () => run('SIGINT'));
  process.once('SIGTERM', () => run('SIGTERM'));
  process.once('uncaughtException', (err) => {
    log.fatal({ err }, 'uncaught exception');
    run('uncaughtException', 1);
  });
  process.once('unhandledRejection', (reason) => {
    log.fatal({ err: reason }, 'unhandled rejection');
    run('unhandledRejection', 1);
  });
}
