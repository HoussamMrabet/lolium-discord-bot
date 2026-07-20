import { baseEmbed, COLORS } from '../theme.js';
import { kda } from '../../utils/format.js';

function lpTag(lpDelta) {
  if (lpDelta === null || lpDelta === undefined) return '';
  if (lpDelta > 0) return ` \`+${lpDelta} LP\``;
  if (lpDelta < 0) return ` \`${lpDelta} LP\``;
  return '';
}

/** Recent tracked games as a compact list. Empty state until games exist. */
export function historyEmbed(summoner, { targetUser, matches = [] } = {}) {
  const embed = baseEmbed(COLORS.PRIMARY)
    .setAuthor({ name: `${summoner.riotId.gameName}#${summoner.riotId.tagLine}` })
    .setTitle('Recent games');

  if (targetUser) embed.setFooter({ text: targetUser.username });

  if (!matches.length) {
    embed.setDescription(
      'No tracked games yet — history appears once matches are processed.',
    );
    return embed;
  }

  const lines = matches.map((m) => {
    const result = m.win ? '🟢 W' : '🔴 L';
    const ratio = `${m.kills}/${m.deaths}/${m.assists}`;
    return `${result} • **${m.championName ?? 'Unknown'}** ${ratio} (${kda(
      m.kills,
      m.deaths,
      m.assists,
    )} KDA)${lpTag(m.lpDelta)}`;
  });

  embed.setDescription(lines.join('\n'));
  return embed;
}

export default historyEmbed;
