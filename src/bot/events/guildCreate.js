import { Events } from 'discord.js';

/** The bot was added to a server: register it and seed default settings. */
export default {
  name: Events.GuildCreate,
  async execute(guild, ctx) {
    ctx.logger.info({ guildId: guild.id, name: guild.name }, 'joined guild');
    await ctx.repositories.guilds.upsertOnJoin({
      id: guild.id,
      name: guild.name,
      iconHash: guild.icon,
      ownerId: guild.ownerId,
      shardId: guild.shardId ?? 0,
      memberCount: guild.memberCount ?? 0,
    });
    await ctx.repositories.guildSettings.getOrCreate(guild.id);
  },
};
