import { baseEmbed, COLORS } from '../theme.js';
import { profileIconUrl } from '../assets.js';
import { winRate, kda, compact, round1 } from '../../utils/format.js';

const ROLE_LABELS = {
  TOP: 'Top',
  JUNGLE: 'Jungle',
  MIDDLE: 'Mid',
  BOTTOM: 'Bot',
  UTILITY: 'Support',
};

/**
 * Lifetime statistics from processed games. Shows an empty state until match
 * processing has recorded games for this summoner.
 */
export function statsEmbed(summoner, { targetUser, stats, champions = [], roles = [] } = {}) {
  const embed = baseEmbed(COLORS.INFO)
    .setAuthor({ name: `${summoner.riotId.gameName}#${summoner.riotId.tagLine}` })
    .setThumbnail(profileIconUrl(summoner.profileIconId))
    .setTitle('Lifetime statistics');

  if (targetUser) embed.setFooter({ text: targetUser.username });

  if (!stats || !stats.games) {
    embed.setDescription(
      'No tracked games yet — statistics appear once matches are processed.',
    );
    return embed;
  }

  const wr = winRate(stats.wins, stats.games - stats.wins);
  const overallKda = kda(stats.kills, stats.deaths, stats.assists);

  embed.addFields(
    { name: 'Games', value: String(stats.games), inline: true },
    { name: 'Win rate', value: `${wr}%`, inline: true },
    { name: 'KDA', value: String(overallKda), inline: true },
    { name: 'Avg CS/min', value: String(round1(stats.avgCsPerMin)), inline: true },
    { name: 'Avg vision', value: String(round1(stats.avgVision)), inline: true },
    { name: 'Avg damage', value: compact(stats.avgDamage), inline: true },
  );

  if (champions.length) {
    const pool = champions
      .map((c) => {
        const cwr = winRate(c.wins, c.games - c.wins);
        const ckda = kda(c.kills, c.deaths, c.assists);
        return `**${c._id.championName ?? 'Unknown'}** — ${c.games} games, ${cwr}% WR, ${ckda} KDA`;
      })
      .join('\n');
    embed.addFields({ name: 'Champion pool', value: pool });
  }

  if (roles.length) {
    const dist = roles
      .map((r) => `${ROLE_LABELS[r._id] ?? r._id}: ${r.games}`)
      .join(' • ');
    embed.addFields({ name: 'Roles', value: dist });
  }

  if (stats.pentaKills) {
    embed.addFields({ name: 'Pentakills', value: String(stats.pentaKills), inline: true });
  }

  return embed;
}

export default statsEmbed;
