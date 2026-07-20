import { baseEmbed, COLORS } from '../theme.js';
import { profileIconUrl, championIconUrl } from '../assets.js';
import { compact } from '../../utils/format.js';
import { formatDuration } from '../../utils/time.js';
import { SUMMONER_SPELLS, KEYSTONES, queueLabel } from '../staticMaps.js';

/**
 * The rich match-alert embed: result, champion, KDA, LP, damage, CS, vision,
 * gold, spells, keystone, and MVP, topped with the (no-AI) funny description.
 */
export function matchEmbed({
  summoner,
  participant: p,
  description,
  lpDelta = null,
  mvp = false,
  queueId,
  durationSec = 0,
  kda,
}) {
  const embed = baseEmbed(p.win ? COLORS.WIN : COLORS.LOSS)
    .setAuthor({
      name: `${summoner.riotId.gameName}#${summoner.riotId.tagLine}`,
      iconURL: profileIconUrl(summoner.profileIconId),
    })
    .setThumbnail(championIconUrl(p.championName))
    .setTitle(`${p.win ? '🟢 Victory' : '🔴 Defeat'} • ${p.championName}`)
    .setDescription(description)
    .addFields(
      {
        name: 'KDA',
        value: `${p.kills} / ${p.deaths} / ${p.assists}  (${kda})`,
        inline: true,
      },
      { name: 'Damage', value: compact(p.totalDamageToChampions), inline: true },
      { name: 'CS', value: `${p.cs} (${p.csPerMin}/min)`, inline: true },
      { name: 'Vision', value: String(p.visionScore), inline: true },
      {
        name: 'KP',
        value: `${Math.round((p.killParticipation ?? 0) * 100)}%`,
        inline: true,
      },
      { name: 'Gold', value: compact(p.goldEarned), inline: true },
    );

  if (lpDelta !== null && lpDelta !== undefined) {
    embed.addFields({
      name: 'LP',
      value: lpDelta > 0 ? `+${lpDelta}` : String(lpDelta),
      inline: true,
    });
  }

  const spells = (p.summonerSpells ?? [])
    .map((id) => SUMMONER_SPELLS[id])
    .filter(Boolean)
    .join(' + ');
  if (spells) embed.addFields({ name: 'Spells', value: spells, inline: true });

  const keystone = KEYSTONES[p.perks?.keystone];
  if (keystone) embed.addFields({ name: 'Keystone', value: keystone, inline: true });

  const footer = [queueLabel(queueId), formatDuration(durationSec)];
  if (mvp) footer.unshift('🏆 MVP');
  embed.setFooter({ text: footer.join(' • ') });

  return embed;
}

export default matchEmbed;
