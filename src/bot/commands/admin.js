import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { baseEmbed } from '../../embeds/theme.js';
import { replyEphemeral } from '../utils/reply.js';

export default {
  guildOnly: true,
  adminOnly: true,

  data: new SlashCommandBuilder()
    .setName('admin')
    .setDescription('Admin utilities for this server.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) =>
      s.setName('info').setDescription('Show tracking stats for this server.'),
    ),
  // Note: `sync` and `force-update` subcommands are added once the queue layer
  // exists (they enqueue Riot-fetch jobs).

  async execute(interaction, ctx) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId;

    if (sub === 'info') {
      const [linkedRows, uniquePuuids, settings] = await Promise.all([
        ctx.repositories.players.countByGuild(guildId),
        ctx.repositories.players.distinctPuuidsByGuild(guildId),
        ctx.repositories.guildSettings.getOrCreate(guildId),
      ]);

      const enabledFeatures = Object.entries(settings.features)
        .filter(([, v]) => v)
        .map(([k]) => k);

      const embed = baseEmbed()
        .setTitle('Server tracking info')
        .addFields(
          { name: 'Linked accounts', value: String(linkedRows), inline: true },
          {
            name: 'Unique Riot accounts',
            value: String(uniquePuuids.length),
            inline: true,
          },
          {
            name: 'Enabled features',
            value: enabledFeatures.length ? enabledFeatures.join(', ') : 'none',
          },
          {
            name: 'Alerts channel',
            value: settings.channels.alerts
              ? `<#${settings.channels.alerts}>`
              : '`not set`',
            inline: true,
          },
        );

      return replyEphemeral(interaction, { embeds: [embed] });
    }
  },
};
