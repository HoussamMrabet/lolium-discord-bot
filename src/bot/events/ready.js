import { Events, ActivityType } from 'discord.js';

/**
 * Fired once the client is fully connected. Sets presence and backfills Guild /
 * GuildSettings documents for every guild already in cache (covers guilds joined
 * while the bot was offline).
 */
export default {
  name: Events.ClientReady,
  once: true,
  async execute(client, ctx) {
    ctx.logger.info(
      { tag: client.user.tag, guilds: client.guilds.cache.size },
      'bot ready',
    );

    client.user.setPresence({
      status: 'online',
      activities: [{ name: '/help • tracking LoL', type: ActivityType.Watching }],
    });

    for (const guild of client.guilds.cache.values()) {
      try {
        await ctx.repositories.guilds.upsertOnJoin({
          id: guild.id,
          name: guild.name,
          iconHash: guild.icon,
          ownerId: guild.ownerId,
          shardId: guild.shardId ?? 0,
          memberCount: guild.memberCount ?? 0,
        });
        await ctx.repositories.guildSettings.getOrCreate(guild.id);
      } catch (err) {
        ctx.logger.warn({ err, guildId: guild.id }, 'guild backfill failed');
      }
    }
  },
};
