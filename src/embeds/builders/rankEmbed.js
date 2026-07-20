import { baseEmbed, TIER_COLORS, COLORS } from '../theme.js';
import { profileIconUrl } from '../assets.js';
import { formatRank } from '../../utils/ladder.js';
import { winRate } from '../../utils/format.js';

function queueField(name, entry) {
  if (!entry?.tier) return { name, value: 'Unranked', inline: true };
  const wr = winRate(entry.wins, entry.losses);
  const value = [
    formatRank(entry),
    `${entry.wins}W ${entry.losses}L • ${wr}% WR`,
    entry.hotStreak ? '🔥 On a hot streak' : null,
  ]
    .filter(Boolean)
    .join('\n');
  return { name, value, inline: true };
}

/** Focused ranked standing for Solo/Duo and Flex. */
export function rankEmbed(summoner, { targetUser } = {}) {
  const solo = summoner.ranked?.RANKED_SOLO_5x5;
  const color = solo?.tier ? (TIER_COLORS[solo.tier] ?? COLORS.PRIMARY) : COLORS.PRIMARY;

  const embed = baseEmbed(color)
    .setAuthor({ name: `${summoner.riotId.gameName}#${summoner.riotId.tagLine}` })
    .setThumbnail(profileIconUrl(summoner.profileIconId))
    .addFields(
      queueField('Solo/Duo', solo),
      queueField('Flex', summoner.ranked?.RANKED_FLEX_SR),
    );

  if (targetUser) embed.setFooter({ text: targetUser.username });
  return embed;
}

export default rankEmbed;
