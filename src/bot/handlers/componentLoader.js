import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createLogger } from '../../core/logger.js';

const log = createLogger('component-loader');

/**
 * Loads message-component / modal handlers from `dir`, keyed by a customId
 * prefix. Modules default-export `{ prefix, execute(interaction, ctx) }`. The
 * router matches on the part of a customId before the first ":".
 *
 * Returns an empty Map when no handlers exist yet (e.g. before betting/setup
 * wizard components are added) — a real router with nothing registered, not a
 * stub.
 */
export async function loadComponents(dir) {
  const handlers = new Map();
  let files;
  try {
    files = await readdir(dir);
  } catch {
    return handlers;
  }

  for (const file of files) {
    if (!file.endsWith('.js') || file.startsWith('_')) continue;
    const url = pathToFileURL(path.join(dir, file)).href;
    const mod = (await import(url)).default;
    if (!mod?.prefix || typeof mod.execute !== 'function') continue;
    handlers.set(mod.prefix, mod);
  }

  log.info({ count: handlers.size }, 'component handlers registered');
  return handlers;
}
