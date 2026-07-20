import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
} from 'discord.js';
import { baseEmbed, COLORS } from '../../embeds/theme.js';
import { replyEphemeral } from '../utils/reply.js';

const TEXT_CHANNELS = [ChannelType.GuildText, ChannelType.GuildAnnouncement];

const CHANNEL_OPTIONS = [
  ['alerts', 'Where match alerts are posted'],
  ['leaderboard', 'Where the auto-updating leaderboards live'],
  ['recaps', 'Where daily/weekly recaps are posted'],
  ['betting', 'Where betting messages are posted'],
];

export default {
  guildOnly: true,
  adminOnly: true,

  data: (() => {
    const b = new SlashCommandBuilder()
      .setName('setup')
      .setDescription('Quick-configure the main channels the bot posts to.')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);
    for (const [key, desc] of CHANNEL_OPTIONS) {
      b.addChannelOption((o) =>
        o
          .setName(key)
          .setDescription(desc)
          .addChannelTypes(...TEXT_CHANNELS),
      );
    }
    return b;
  })(),

  async execute(interaction, ctx) {
    const settings = await ctx.repositories.guildSettings.getOrCreate(
      interaction.guildId,
    );

    const applied = [];
    for (const [key] of CHANNEL_OPTIONS) {
      const channel = interaction.options.getChannel(key);
      if (channel) {
        await ctx.repositories.guildSettings.setChannel(
          interaction.guildId,
          key,
          channel.id,
        );
        settings.channels[key] = channel.id;
        applied.push(key);
      }
    }

    const status = (id) => (id ? `<#${id}>` : '`not set`');
    const embed = baseEmbed(applied.length ? COLORS.SUCCESS : COLORS.INFO)
      .setTitle('Server setup')
      .setDescription(
        applied.length
          ? `Updated: ${applied.map((k) => `**${k}**`).join(', ')}.`
          : 'Provide one or more channel options to configure them.',
      )
      .addFields(
        { name: 'Alerts', value: status(settings.channels.alerts), inline: true },
        {
          name: 'Leaderboard',
          value: status(settings.channels.leaderboard),
          inline: true,
        },
        { name: 'Recaps', value: status(settings.channels.recaps), inline: true },
        { name: 'Betting', value: status(settings.channels.betting), inline: true },
      )
      .setFooter({
        text: 'Next: link accounts with /link, and set rank roles with /settings role set.',
      });

    await replyEphemeral(interaction, { embeds: [embed] });
  },
};
