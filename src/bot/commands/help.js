import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { baseEmbed } from '../../embeds/theme.js';

export default {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('List the available commands.'),

  async execute(interaction, ctx) {
    const commands = [...ctx.commands.values()]
      .filter((c) => !c.hidden)
      .sort((a, b) => a.data.name.localeCompare(b.data.name));

    const member = [];
    const admin = [];
    for (const c of commands) {
      const line = `**/${c.data.name}** — ${c.data.description}`;
      (c.adminOnly ? admin : member).push(line);
    }

    const embed = baseEmbed()
      .setTitle('Commands')
      .setDescription(
        'League of Legends tracking for your server. Admins start with `/setup`.',
      );

    if (member.length) embed.addFields({ name: 'General', value: member.join('\n') });
    if (admin.length) {
      embed.addFields({
        name: 'Admin (Manage Server)',
        value: admin.join('\n'),
      });
    }

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};
