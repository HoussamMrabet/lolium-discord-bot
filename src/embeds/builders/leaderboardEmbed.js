import { baseEmbed, COLORS } from '../theme.js';
import { formatRank } from '../../utils/ladder.js';
import { compact } from '../../utils/format.js';

const LABELS = {
  highestRank: '🏆 Highest Rank',
  mostWins: '✅ Most Wins',
  highestWinRate: '📈 Highest Win Rate',
  mostLpGained: '📊 Most LP Gained',
  longestWinStreak: '🔥 Longest Win Streak',
  mostGames: '🎮 Most Games',
  mostDamage: '💥 Most Damage',
  highestKda: '⚔️ Highest KDA',
  mostVision: '👁️ Most Vision',
  mostPentakills: '🌟 Most Pentakills',
};

const PERIOD_LABELS = {
  daily: 'Today',
  weekly: 'This Week',
  monthly: 'This Month',
};

const MEDALS = ['🥇', '🥈', '🥉'];

function formatValue(category, entry) {
  switch (category) {
    case 'highestRank':
      return formatRank({
        tier: entry.meta?.tier,
        division: entry.meta?.division,
        lp: entry.meta?.lp,
      });
    case 'highestWinRate':
      return `${entry.value}%${entry.meta?.games ? ` (${entry.meta.games} games)` : ''}`;
    case 'mostDamage':
      return compact(entry.value);
    case 'mostLpGained':
      return `${entry.value > 0 ? '+' : ''}${entry.value} LP`;
    case 'highestKda':
      return `${entry.value} KDA`;
    default:
      return String(entry.value);
  }
}

export function leaderboardEmbed({ category, period = 'all', entries = [] }) {
  const suffix = PERIOD_LABELS[period] ? ` • ${PERIOD_LABELS[period]}` : '';
  const embed = baseEmbed(COLORS.PRIMARY).setTitle(
    `${LABELS[category] ?? category}${suffix}`,
  );

  if (!entries.length) {
    embed.setDescription('No data yet — check back after some games are tracked.');
    return embed;
  }

  embed.setDescription(
    entries
      .map((e) => {
        const pos = MEDALS[e.rank - 1] ?? `**${e.rank}.**`;
        const who = e.discordUserId ? `<@${e.discordUserId}>` : e.displayName;
        return `${pos} ${who} — **${formatValue(category, e)}**`;
      })
      .join('\n'),
  );
  return embed;
}

export default leaderboardEmbed;
