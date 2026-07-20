import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ShardingManager } from 'discord.js';
import { env } from '../src/config/env.js';
import { createLogger } from '../src/core/logger.js';

/**
 * Dedicated bot process. Spawns the gateway client under a ShardingManager so
 * the system scales past Discord's ~2,500-guild-per-shard limit. Each shard runs
 * `src/bot/bootstrap.js`. (Mono mode boots the client in-process instead —
 * see entrypoints/mono.js.)
 */
const log = createLogger('sharding-manager');
const dirname = path.dirname(fileURLToPath(import.meta.url));
const shardFile = path.join(dirname, '..', 'src', 'bot', 'bootstrap.js');

const manager = new ShardingManager(shardFile, {
  token: env.DISCORD_TOKEN,
  totalShards: env.SHARD_COUNT, // 'auto' or a positive integer
  respawn: true,
  execArgv: process.execArgv,
});

manager.on('shardCreate', (shard) => {
  log.info({ shardId: shard.id }, 'shard spawned');
  shard.on('death', () => log.error({ shardId: shard.id }, 'shard died'));
});

manager.spawn().catch((err) => {
  log.error({ err }, 'failed to spawn shards');
  process.exit(1);
});
