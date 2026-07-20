import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
} from 'discord.js';
import { baseEmbed } from '../../embeds/theme.js';
import { replyEphemeral, successReply } from '../utils/reply.js';

const CHANNEL_TYPES = [
  { name: 'Match alerts', value: 'alerts' },
  { name: 'Leaderboard', value: 'leaderboard' },
  { name: 'Recaps', value: 'recaps' },
  { name: 'Betting', value: 'betting' },
];

const TEXT_CHANNELS = [ChannelType.GuildText, ChannelType.GuildAnnouncement];

export default {
  guildOnly: true,
  adminOnly: true,

  data: new SlashCommandBuilder()
    .setName('channel')
    .setDescription('Manage the channels the bot posts to.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) =>
      s
        .setName('set')
        .setDescription('Set a channel for a given post type.')
        .addStringOption((o) =>
          o
            .setName('type')
            .setDescription('Which kind of posts')
            .setRequired(true)
            .addChoices(...CHANNEL_TYPES),
        )
        .addChannelOption((o) =>
          o
            .setName('channel')
            .setDescription('Target channel')
            .setRequired(true)
            .addChannelTypes(...TEXT_CHANNELS),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName('clear')
        .setDescription('Unset a channel for a given post type.')
        .addStringOption((o) =>
          o
            .setName('type')
            .setDescription('Which kind of posts')
            .setRequired(true)
            .addChoices(...CHANNEL_TYPES),
        ),
    )
    .addSubcommand((s) =>
      s.setName('view').setDescription('Show the currently configured channels.'),
    ),

  async execute(interaction, ctx) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId;

    if (sub === 'set') {
      const type = interaction.options.getString('type', true);
      const channel = interaction.options.getChannel('channel', true);
      await ctx.repositories.guildSettings.setChannel(guildId, type, channel.id);
      return successReply(interaction, `Set **${type}** channel to <#${channel.id}>.`);
    }

    if (sub === 'clear') {
      const type = interaction.options.getString('type', true);
      await ctx.repositories.guildSettings.setChannel(guildId, type, null);
      return successReply(interaction, `Cleared the **${type}** channel.`);
    }

    // view
    const settings = await ctx.repositories.guildSettings.getOrCreate(guildId);
    const show = (id) => (id ? `<#${id}>` : '`not set`');
    const embed = baseEmbed()
      .setTitle('Configured channels')
      .addFields(
        { name: 'Alerts', value: show(settings.channels.alerts), inline: true },
        {
          name: 'Leaderboard',
          value: show(settings.channels.leaderboard),
          inline: true,
        },
        { name: 'Recaps', value: show(settings.channels.recaps), inline: true },
        { name: 'Betting', value: show(settings.channels.betting), inline: true },
      );
    return replyEphemeral(interaction, { embeds: [embed] });
  },
};
