import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { REST, Routes } from 'discord.js';
import { env } from '../config/env.js';
import { createLogger } from '../core/logger.js';
import { loadCommands } from './handlers/commandLoader.js';

const log = createLogger('deploy-commands');
const dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Registers slash commands with Discord.
 * - If `DISCORD_DEV_GUILD_ID` is set: registers to that guild (updates are
 *   instant — ideal for development).
 * - Otherwise: registers globally (can take up to ~1h to propagate).
 */
export async function deployCommands() {
  const commands = await loadCommands(path.join(dirname, 'commands'));
  const body = [...commands.values()].map((c) => c.data.toJSON());

  const rest = new REST({ version: '10' }).setToken(env.DISCORD_TOKEN);

  if (env.DISCORD_DEV_GUILD_ID) {
    await rest.put(
      Routes.applicationGuildCommands(
        env.DISCORD_CLIENT_ID,
        env.DISCORD_DEV_GUILD_ID,
      ),
      { body },
    );
    log.info(
      { count: body.length, guildId: env.DISCORD_DEV_GUILD_ID },
      'registered guild commands',
    );
  } else {
    await rest.put(Routes.applicationCommands(env.DISCORD_CLIENT_ID), { body });
    log.info({ count: body.length }, 'registered global commands');
  }

  return body.length;
}

const invokedDirectly =
  process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (invokedDirectly) {
  deployCommands().catch((err) => {
    log.error({ err }, 'command deployment failed');
    process.exit(1);
  });
}
