import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createLogger } from '../../core/logger.js';

const log = createLogger('command-loader');

/**
 * Discovers every command module in `dir` and returns a Map name -> module.
 * A command module default-exports `{ data, execute, autocomplete?, guildOnly?,
 * adminOnly?, hidden? }`. Adding a command is just adding a file — no central
 * registry to edit (maintainability, architecture §2).
 */
export async function loadCommands(dir) {
  const commands = new Map();
  let files;
  try {
    files = await readdir(dir);
  } catch (err) {
    log.warn({ err, dir }, 'no commands directory found');
    return commands;
  }

  for (const file of files) {
    if (!file.endsWith('.js') || file.startsWith('_')) continue;
    const url = pathToFileURL(path.join(dir, file)).href;
    const mod = (await import(url)).default;
    if (!mod?.data || typeof mod.execute !== 'function') {
      log.warn({ file }, 'skipping invalid command module');
      continue;
    }
    if (commands.has(mod.data.name)) {
      throw new Error(`Duplicate command name: ${mod.data.name}`);
    }
    commands.set(mod.data.name, mod);
  }

  return commands;
}
