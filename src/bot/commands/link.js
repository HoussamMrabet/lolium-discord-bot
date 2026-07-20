import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { PLATFORMS, SUPPORTED_PLATFORMS } from '../../config/regions.js';
import { isAppError } from '../../core/errors.js';
import { profileEmbed } from '../../embeds/builders/profileEmbed.js';

const REGION_CHOICES = SUPPORTED_PLATFORMS.map((p) => ({
  name: `${PLATFORMS[p].name} (${p})`,
  value: p,
}));

export default {
  guildOnly: true,

  data: new SlashCommandBuilder()
    .setName('link')
    .setDescription('Link a Riot account to track it in this server.')
    .addStringOption((o) =>
      o
        .setName('riot-id')
        .setDescription('Your Riot ID, e.g. Faker#KR1')
        .setRequired(true)
        .setMaxLength(50),
    )
    .addStringOption((o) =>
      o
        .setName('region')
        .setDescription('Account region')
        .setRequired(true)
        .addChoices(...REGION_CHOICES),
    )
    .addStringOption((o) =>
      o
        .setName('nickname')
        .setDescription('Optional nickname to show for this account')
        .setMaxLength(32),
    ),

  async execute(interaction, ctx) {
    const raw = interaction.options.getString('riot-id', true).trim();
    const region = interaction.options.getString('region', true);
    const nickname = interaction.options.getString('nickname');

    const hash = raw.lastIndexOf('#');
    if (hash <= 0 || hash === raw.length - 1) {
      return interaction.reply({
        content: '⚠️ Use the format `Name#Tag`, e.g. `Faker#KR1`.',
        flags: MessageFlags.Ephemeral,
      });
    }
    const gameName = raw.slice(0, hash).trim();
    const tagLine = raw.slice(hash + 1).trim();

    // Linking hits Riot several times — defer so we don't miss the 3s window.
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const result = await ctx.services.linking.linkAccount({
        guildId: interaction.guildId,
        discordUserId: interaction.user.id,
        gameName,
        tagLine,
        platform: region,
        nickname,
      });

      const embed = profileEmbed(result.summoner, {
        targetUser: interaction.user,
      });
      await interaction.editReply({
        content: result.alreadyLinked
          ? '✅ That account is already linked — here it is:'
          : '✅ Account linked! You’ll start getting match updates soon.',
        embeds: [embed],
      });
    } catch (err) {
      if (isAppError(err)) {
        return interaction.editReply({ content: `⚠️ ${err.message}` });
      }
      ctx.log?.error({ err }, 'link failed');
      return interaction.editReply({
        content: '⚠️ Could not link that account right now. Please try again shortly.',
      });
    }
  },
};
