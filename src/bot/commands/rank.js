import { SlashCommandBuilder } from 'discord.js';
import { rankEmbed } from '../../embeds/builders/rankEmbed.js';
import { resolveTarget, respondAccountAutocomplete } from '../utils/accounts.js';
import { errorReply } from '../utils/reply.js';

export default {
  guildOnly: true,

  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Show a tracked player’s ranked standing.')
    .addUserOption((o) =>
      o.setName('user').setDescription('Whose rank (defaults to you)'),
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
    return interaction.reply({
      embeds: [rankEmbed(account.summoner, { targetUser })],
    });
  },
};
