import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { TIERS } from '../../config/constants.js';
import { isValidTimezone } from '../../utils/time.js';
import { baseEmbed } from '../../embeds/theme.js';
import { replyEphemeral, successReply, errorReply } from '../utils/reply.js';

const FEATURES = [
  { name: 'Match alerts', value: 'alerts' },
  { name: 'Promotions', value: 'promotions' },
  { name: 'Streaks', value: 'streaks' },
  { name: 'Betting', value: 'betting' },
  { name: 'Role sync', value: 'roleSync' },
];

const TIER_CHOICES = TIERS.map((t) => ({
  name: t.charAt(0) + t.slice(1).toLowerCase(),
  value: t,
}));

const onOff = (v) => (v ? '🟢 on' : '🔴 off');

export default {
  guildOnly: true,
  adminOnly: true,

  data: new SlashCommandBuilder()
    .setName('settings')
    .setDescription('View and edit this server’s bot settings.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) =>
      s.setName('view').setDescription('Show the current settings.'),
    )
    .addSubcommand((s) =>
      s
        .setName('feature')
        .setDescription('Enable or disable a feature.')
        .addStringOption((o) =>
          o
            .setName('name')
            .setDescription('Which feature')
            .setRequired(true)
            .addChoices(...FEATURES),
        )
        .addBooleanOption((o) =>
          o.setName('enabled').setDescription('On or off').setRequired(true),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName('recap')
        .setDescription('Configure the recap schedule.')
        .addBooleanOption((o) =>
          o.setName('daily').setDescription('Post a daily recap'),
        )
        .addBooleanOption((o) =>
          o.setName('weekly').setDescription('Post a weekly recap'),
        )
        .addBooleanOption((o) =>
          o.setName('monthly').setDescription('Post a monthly recap'),
        )
        .addIntegerOption((o) =>
          o
            .setName('hour')
            .setDescription('Local hour to post (0–23)')
            .setMinValue(0)
            .setMaxValue(23),
        )
        .addStringOption((o) =>
          o
            .setName('timezone')
            .setDescription('IANA timezone, e.g. Europe/London'),
        ),
    )
    .addSubcommandGroup((g) =>
      g
        .setName('role')
        .setDescription('Configure automatic rank roles.')
        .addSubcommand((s) =>
          s
            .setName('set')
            .setDescription('Map a rank tier to a Discord role.')
            .addStringOption((o) =>
              o
                .setName('tier')
                .setDescription('Rank tier')
                .setRequired(true)
                .addChoices(...TIER_CHOICES),
            )
            .addRoleOption((o) =>
              o.setName('role').setDescription('Role to assign').setRequired(true),
            ),
        )
        .addSubcommand((s) =>
          s
            .setName('remove')
            .setDescription('Remove a tier’s role mapping.')
            .addStringOption((o) =>
              o
                .setName('tier')
                .setDescription('Rank tier')
                .setRequired(true)
                .addChoices(...TIER_CHOICES),
            ),
        ),
    ),

  async execute(interaction, ctx) {
    const group = interaction.options.getSubcommandGroup(false);
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId;
    const { guildSettings } = ctx.repositories;

    if (group === 'role') {
      const tier = interaction.options.getString('tier', true);
      if (sub === 'set') {
        const role = interaction.options.getRole('role', true);
        if (role.managed || role.id === guildId) {
          return errorReply(interaction, 'That role cannot be assigned by the bot.');
        }
        await guildSettings.setRole(guildId, tier, role.id);
        return successReply(interaction, `Mapped **${tier}** → <@&${role.id}>.`);
      }
      await guildSettings.removeRole(guildId, tier);
      return successReply(interaction, `Removed the role mapping for **${tier}**.`);
    }

    if (sub === 'feature') {
      const name = interaction.options.getString('name', true);
      const enabled = interaction.options.getBoolean('enabled', true);
      await guildSettings.setFeature(guildId, name, enabled);
      return successReply(
        interaction,
        `Feature **${name}** is now ${enabled ? 'enabled' : 'disabled'}.`,
      );
    }

    if (sub === 'recap') {
      const set = {};
      for (const key of ['daily', 'weekly', 'monthly']) {
        const val = interaction.options.getBoolean(key);
        if (val !== null) set[`recap.${key}`] = val;
      }
      const hour = interaction.options.getInteger('hour');
      if (hour !== null) set['recap.hour'] = hour;
      const timezone = interaction.options.getString('timezone');
      if (timezone !== null) {
        if (!isValidTimezone(timezone)) {
          return errorReply(
            interaction,
            `\`${timezone}\` is not a valid IANA timezone (e.g. \`Europe/London\`).`,
          );
        }
        set['recap.timezone'] = timezone;
      }
      if (Object.keys(set).length === 0) {
        return errorReply(interaction, 'Provide at least one recap option to change.');
      }
      await guildSettings.patch(guildId, set);
      return successReply(interaction, 'Recap schedule updated.');
    }

    // view
    const settings = await guildSettings.getOrCreate(guildId);
    const show = (id) => (id ? `<#${id}>` : '`not set`');
    const roleEntries = [...(settings.roles?.entries?.() ?? [])];
    const rolesText = roleEntries.length
      ? roleEntries.map(([tier, roleId]) => `${tier}: <@&${roleId}>`).join('\n')
      : '`none configured`';

    const embed = baseEmbed()
      .setTitle('Server settings')
      .addFields(
        {
          name: 'Channels',
          value: [
            `Alerts: ${show(settings.channels.alerts)}`,
            `Leaderboard: ${show(settings.channels.leaderboard)}`,
            `Recaps: ${show(settings.channels.recaps)}`,
            `Betting: ${show(settings.channels.betting)}`,
          ].join('\n'),
        },
        {
          name: 'Features',
          value: [
            `Alerts: ${onOff(settings.features.alerts)}`,
            `Promotions: ${onOff(settings.features.promotions)}`,
            `Streaks: ${onOff(settings.features.streaks)}`,
            `Betting: ${onOff(settings.features.betting)}`,
            `Role sync: ${onOff(settings.features.roleSync)}`,
          ].join('\n'),
          inline: true,
        },
        {
          name: 'Recaps',
          value: [
            `Daily: ${onOff(settings.recap.daily)}`,
            `Weekly: ${onOff(settings.recap.weekly)}`,
            `Monthly: ${onOff(settings.recap.monthly)}`,
            `At: ${settings.recap.hour}:00 ${settings.recap.timezone}`,
          ].join('\n'),
          inline: true,
        },
        { name: 'Rank roles', value: rolesText },
      );

    return replyEphemeral(interaction, { embeds: [embed] });
  },
};
