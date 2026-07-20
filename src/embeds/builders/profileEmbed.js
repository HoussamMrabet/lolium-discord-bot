import { baseEmbed, TIER_COLORS, COLORS } from '../theme.js';
import { profileIconUrl } from '../assets.js';
import { formatRank } from '../../utils/ladder.js';
import { winRate } from '../../utils/format.js';

function rankLine(entry) {
  if (!entry?.tier) return 'Unranked';
  const wr = winRate(entry.wins, entry.losses);
  return `${formatRank(entry)} • ${entry.wins}W ${entry.losses}L (${wr}%)`;
}

function streakLine(streak) {
  const cur = streak?.current ?? 0;
  if (cur > 0) return `🔥 ${cur} win streak`;
  if (cur < 0) return `💀 ${Math.abs(cur)} loss streak`;
  return 'No active streak';
}

/**
 * Player profile: identity, level, and current Solo/Flex standing.
 * Uses the stored ranked snapshot (no Riot call — a cheap DB read).
 */
export function profileEmbed(summoner, { targetUser, accountsCount = 1 } = {}) {
  const solo = summoner.ranked?.RANKED_SOLO_5x5;
  const color = solo?.tier ? (TIER_COLORS[solo.tier] ?? COLORS.PRIMARY) : COLORS.PRIMARY;

  const embed = baseEmbed(color)
    .setTitle(`${summoner.riotId.gameName}#${summoner.riotId.tagLine}`)
    .setThumbnail(profileIconUrl(summoner.profileIconId))
    .addFields(
      { name: 'Level', value: String(summoner.summonerLevel ?? 0), inline: true },
      { name: 'Region', value: summoner.platform.toUpperCase(), inline: true },
      { name: 'Streak', value: streakLine(summoner.streak), inline: true },
      { name: 'Ranked Solo/Duo', value: rankLine(solo) },
      { name: 'Ranked Flex', value: rankLine(summoner.ranked?.RANKED_FLEX_SR) },
    );

  if (targetUser) {
    const extra = accountsCount > 1 ? ` • ${accountsCount} linked accounts` : '';
    embed.setFooter({ text: `${targetUser.username}${extra}` });
  }
  return embed;
}

export default profileEmbed;
