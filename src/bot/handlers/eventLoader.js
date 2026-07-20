import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createLogger } from '../../core/logger.js';

const log = createLogger('event-loader');

/**
 * Registers every event module in `dir` onto the client. Modules default-export
 * `{ name, once?, execute(...args, ctx) }`. The shared `ctx` (repositories,
 * logger, loaded commands, component handlers) is appended as the final arg, and
 * every handler is wrapped so a throw is logged, never crashing the gateway.
 */
export async function loadEvents(client, dir, ctx) {
  let files;
  try {
    files = await readdir(dir);
  } catch (err) {
    log.warn({ err, dir }, 'no events directory found');
    return 0;
  }

  let count = 0;
  for (const file of files) {
    if (!file.endsWith('.js') || file.startsWith('_')) continue;
    const url = pathToFileURL(path.join(dir, file)).href;
    const mod = (await import(url)).default;
    if (!mod?.name || typeof mod.execute !== 'function') {
      log.warn({ file }, 'skipping invalid event module');
      continue;
    }

    const handler = (...args) =>
      Promise.resolve(mod.execute(...args, ctx)).catch((err) =>
        ctx.logger.error({ err, event: mod.name }, 'event handler error'),
      );

    if (mod.once) client.once(mod.name, handler);
    else client.on(mod.name, handler);
    count += 1;
  }

  log.info({ count }, 'events registered');
  return count;
}
