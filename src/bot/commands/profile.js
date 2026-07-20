import { SlashCommandBuilder } from 'discord.js';
import { profileEmbed } from '../../embeds/builders/profileEmbed.js';
import { resolveTarget, respondAccountAutocomplete } from '../utils/accounts.js';
import { errorReply } from '../utils/reply.js';

export default {
  guildOnly: true,

  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('View a tracked player’s profile.')
    .addUserOption((o) =>
      o.setName('user').setDescription('Whose profile (defaults to you)'),
    )
    .addStringOption((o) =>
      o
        .setName('account')
        .setDescription('Which of your linked accounts')
        .setAutocomplete(true),
    ),

  autocomplete: (interaction, ctx) => respondAccountAutocomplete(interaction, ctx),

  async execute(interaction, ctx) {
    const { targetUser, account, accounts } = await resolveTarget(ctx, interaction);
    if (!account) {
      const who = targetUser.id === interaction.user.id ? 'You have' : 'That user has';
      return errorReply(interaction, `${who} no linked accounts in this server.`);
    }
    const embed = profileEmbed(account.summoner, {
      targetUser,
      accountsCount: accounts.length,
    });
    return interaction.reply({ embeds: [embed] });
  },
};
