import { SlashCommandBuilder } from 'discord.js';
import { statsEmbed } from '../../embeds/builders/statsEmbed.js';
import { resolveTarget, respondAccountAutocomplete } from '../utils/accounts.js';
import { errorReply } from '../utils/reply.js';

export default {
  guildOnly: true,

  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Show a tracked player’s lifetime statistics.')
    .addUserOption((o) =>
      o.setName('user').setDescription('Whose stats (defaults to you)'),
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

    const { stats, champions, roles } = await ctx.services.stats.lifetime(
      account.summoner._id,
    );
    return interaction.reply({
      embeds: [statsEmbed(account.summoner, { targetUser, stats, champions, roles })],
    });
  },
};
