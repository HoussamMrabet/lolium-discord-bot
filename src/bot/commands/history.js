import { SlashCommandBuilder } from 'discord.js';
import { historyEmbed } from '../../embeds/builders/historyEmbed.js';
import { resolveTarget, respondAccountAutocomplete } from '../utils/accounts.js';
import { errorReply } from '../utils/reply.js';

export default {
  guildOnly: true,

  data: new SlashCommandBuilder()
    .setName('history')
    .setDescription('Show a tracked player’s recent games.')
    .addUserOption((o) =>
      o.setName('user').setDescription('Whose history (defaults to you)'),
    )
    .addStringOption((o) =>
      o
        .setName('account')
        .setDescription('Which of your linked accounts')
        .setAutocomplete(true),
    ),

  autocomplete: (interaction, ctx) => respondAccountAutocomplete(interaction, ctx),

  async execute(interaction, ctx) {
    const { targetUser, account } = await resolveTarget(ctx, interaction);
    if (!account) {
      const who = targetUser.id === interaction.user.id ? 'You have' : 'That user has';
      return errorReply(interaction, `${who} no linked accounts in this server.`);
    }

    const matches = await ctx.services.stats.recentGames(account.summoner._id, 10);
    return interaction.reply({
      embeds: [historyEmbed(account.summoner, { targetUser, matches })],
    });
  },
};
