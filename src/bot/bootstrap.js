import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { connectMongo, disconnectMongo } from '../database/connection.js';
import { env } from '../config/env.js';
import { createLogger } from '../core/logger.js';
import { registerShutdown } from '../core/shutdown.js';
import { createBotClient } from './client.js';
import { createBotContext } from './context.js';
import { loadCommands } from './handlers/commandLoader.js';
import { loadComponents } from './handlers/componentLoader.js';
import { loadEvents } from './handlers/eventLoader.js';

const log = createLogger('bot');
const dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Boots a single gateway client: connect Mongo, load commands/components/events,
 * then log in. Runnable directly (as a ShardingManager child, or standalone in
 * mono mode).
 */
export async function startBot() {
  await connectMongo();

  const client = createBotClient();
  const ctx = createBotContext(client);

  ctx.commands = await loadCommands(path.join(dirname, 'commands'));
  ctx.componentHandlers = await loadComponents(path.join(dirname, 'interactions'));
  await loadEvents(client, path.join(dirname, 'events'), ctx);

  log.info(
    { commands: ctx.commands.size, components: ctx.componentHandlers.size },
    'bot components loaded',
  );

  registerShutdown([
    () => client.destroy(),
    () => disconnectMongo(),
  ]);

  await client.login(env.DISCORD_TOKEN);
  return { client, ctx };
}

// Run when executed directly (ShardingManager spawns this file).
const invokedDirectly =
  process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (invokedDirectly) {
  startBot().catch((err) => {
    log.error({ err }, 'failed to start bot');
    process.exit(1);
  });
}
