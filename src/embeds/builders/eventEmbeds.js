import { baseEmbed, COLORS, TIER_COLORS } from '../theme.js';
import { profileIconUrl } from '../assets.js';
import { formatRank } from '../../utils/ladder.js';
import { queueLabelForType } from '../staticMaps.js';

export function promotionEmbed({ summoner, queueType, after }) {
  return baseEmbed(TIER_COLORS[after.tier] ?? COLORS.SUCCESS)
    .setTitle('⬆️ Promotion!')
    .setThumbnail(profileIconUrl(summoner.profileIconId))
    .setDescription(
      `**${summoner.riotId.gameName}** climbed to **${formatRank(after)}** in ${queueLabelForType(queueType)}!`,
    );
}

export function demotionEmbed({ summoner, queueType, after }) {
  return baseEmbed(COLORS.LOSS)
    .setTitle('⬇️ Demotion')
    .setThumbnail(profileIconUrl(summoner.profileIconId))
    .setDescription(
      `**${summoner.riotId.gameName}** dropped to **${formatRank(after)}** in ${queueLabelForType(queueType)}.`,
    );
}

export function streakEmbed({ summoner, milestone }) {
  const isWin = milestone.type === 'win';
  return baseEmbed(isWin ? COLORS.WIN : COLORS.LOSS)
    .setTitle(
      isWin
        ? `🔥 ${milestone.magnitude}-game win streak!`
        : `💀 ${milestone.magnitude}-game loss streak`,
    )
    .setThumbnail(profileIconUrl(summoner.profileIconId))
    .setDescription(
      isWin
        ? `**${summoner.riotId.gameName}** is heating up with **${milestone.magnitude}** wins in a row!`
        : `**${summoner.riotId.gameName}** is on a **${milestone.magnitude}**-game skid. Sending thoughts.`,
    );
}
