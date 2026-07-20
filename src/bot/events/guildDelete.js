import { Events } from 'discord.js';

/** The bot was removed from a server: soft-deactivate, keep history. */
export default {
  name: Events.GuildDelete,
  async execute(guild, ctx) {
    ctx.logger.info({ guildId: guild.id }, 'left guild');
    await ctx.repositories.guilds.markInactive(guild.id);
  },
};
