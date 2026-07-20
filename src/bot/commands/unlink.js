import { SlashCommandBuilder } from 'discord.js';
import { successReply, errorReply } from '../utils/reply.js';

const OBJECT_ID = /^[a-f0-9]{24}$/i;

export default {
  guildOnly: true,

  data: new SlashCommandBuilder()
    .setName('unlink')
    .setDescription('Unlink one of your Riot accounts from this server.')
    .addStringOption((o) =>
      o
        .setName('account')
        .setDescription('Which linked account to remove')
        .setRequired(true)
        .setAutocomplete(true),
    ),

  async autocomplete(interaction, ctx) {
    const focused = interaction.options.getFocused().toLowerCase();
    const links = await ctx.repositories.players.listByUser(
      interaction.guildId,
      interaction.user.id,
    );

    const choices = [];
    for (const link of links) {
      const summoner = await ctx.repositories.summoners.findByPuuid(link.puuid);
      const label =
        link.nickname ||
        (summoner
          ? `${summoner.riotId.gameName}#${summoner.riotId.tagLine} (${summoner.platform})`
          : link.puuid);
      choices.push({ name: label.slice(0, 100), value: String(link.summonerId) });
    }

    await interaction.respond(
      choices.filter((c) => c.name.toLowerCase().includes(focused)).slice(0, 25),
    );
  },

  async execute(interaction, ctx) {
    const summonerId = interaction.options.getString('account', true);
    if (!OBJECT_ID.test(summonerId)) {
      return errorReply(interaction, 'Pick one of your linked accounts from the list.');
    }

    const filter = {
      guildId: interaction.guildId,
      discordUserId: interaction.user.id,
      summonerId,
    };
    const link = await ctx.repositories.players.findOne(filter);
    if (!link) {
      return errorReply(
        interaction,
        'You don’t have that account linked in this server.',
      );
    }

    await ctx.repositories.players.unlink(filter);
    // Decrement the global tracking count so we can stop polling orphaned accounts.
    await ctx.repositories.summoners.incTrackedGuildCount(link.puuid, -1);

    return successReply(interaction, 'Account unlinked from this server.');
  },
};
