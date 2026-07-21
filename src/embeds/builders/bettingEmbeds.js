import { baseEmbed, COLORS } from '../theme.js';
import { compact } from '../../utils/format.js';

/** The "will X happen?" question behind each market. */
export const MARKET_QUESTIONS = Object.freeze({
  winner: 'Will they win the game?',
  inter: 'Will they int? (8+ deaths and under 1.5 KDA)',
  topDamage: 'Will they deal the most damage on their team?',
  mostDeaths: 'Will they have the most deaths on their team?',
});

const MEDALS = ['🥇', '🥈', '🥉'];

export function bettingLeaderboardEmbed({ entries = [], seasonId = 'S1' }) {
  const embed = baseEmbed(COLORS.PRIMARY).setTitle(`💰 Betting Leaderboard • Season ${seasonId}`);
  if (!entries.length) {
    embed.setDescription('No bettors yet — place a bet with `/betting place`.');
    return embed;
  }
  embed.setDescription(
    entries
      .map((e, i) => {
        const pos = MEDALS[i] ?? `**${i + 1}.**`;
        return `${pos} <@${e.discordUserId}> — **${compact(e.balance)}** gold`;
      })
      .join('\n'),
  );
  return embed;
}

export function liveGameEmbed({ targetUser, summoner, open }) {
  const embed = baseEmbed(open ? COLORS.SUCCESS : COLORS.NEUTRAL)
    .setTitle('🎲 Live game')
    .setDescription(
      open
        ? `**${summoner.riotId.gameName}** is in a live game — betting is **open**!`
        : `**${summoner.riotId.gameName}** is in a game, but the betting window has closed.`,
    )
    .addFields(
      Object.entries(MARKET_QUESTIONS).map(([market, question]) => ({
        name: market,
        value: question,
        inline: false,
      })),
    )
    .setFooter({
      text: `Bet with /betting place player:@${targetUser.username} market:<…> prediction:<yes|no> amount:<gold>`,
    });
  return embed;
}
