import { SlashCommandBuilder } from 'discord.js';
import { leaderboardEmbed } from '../../embeds/builders/leaderboardEmbed.js';

const CATEGORY_CHOICES = [
  { name: 'Highest Rank', value: 'highestRank' },
  { name: 'Most Wins', value: 'mostWins' },
  { name: 'Highest Win Rate', value: 'highestWinRate' },
  { name: 'Most LP Gained', value: 'mostLpGained' },
  { name: 'Longest Win Streak', value: 'longestWinStreak' },
  { name: 'Most Games', value: 'mostGames' },
  { name: 'Most Damage', value: 'mostDamage' },
  { name: 'Highest KDA', value: 'highestKda' },
  { name: 'Most Vision', value: 'mostVision' },
  { name: 'Most Pentakills', value: 'mostPentakills' },
];

const PERIOD_CHOICES = [
  { name: 'All time', value: 'all' },
  { name: 'Daily', value: 'daily' },
  { name: 'Weekly', value: 'weekly' },
  { name: 'Monthly', value: 'monthly' },
];

export default {
  guildOnly: true,

  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Show a server leaderboard.')
    .addStringOption((o) =>
      o
        .setName('category')
        .setDescription('Which leaderboard (default: Highest Rank)')
        .addChoices(...CATEGORY_CHOICES),
    )
    .addStringOption((o) =>
      o
        .setName('period')
        .setDescription('Time window (default: all time)')
        .addChoices(...PERIOD_CHOICES),
    ),

  async execute(interaction, ctx) {
    const category = interaction.options.getString('category') ?? 'highestRank';
    const period = interaction.options.getString('period') ?? 'all';

    await interaction.deferReply();
    const { entries } = await ctx.services.leaderboard.compute(
      interaction.guildId,
      category,
      period,
    );
    await interaction.editReply({
      embeds: [leaderboardEmbed({ category, period, entries })],
    });
  },
};
