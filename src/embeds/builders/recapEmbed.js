import { baseEmbed, COLORS } from '../theme.js';

const TITLES = {
  daily: '📅 Daily Recap',
  weekly: '🗓️ Weekly Recap',
  monthly: '📆 Monthly Recap',
};

function mention(entry) {
  if (!entry) return '—';
  return entry.discordUserId ? `<@${entry.discordUserId}>` : entry.displayName;
}

function gameLine(entry) {
  if (!entry) return '—';
  return `${mention(entry)} — ${entry.championName} ${entry.kills}/${entry.deaths}/${entry.assists}`;
}

/**
 * The recap embed. Pass `imageName` to reference an attached chart via
 * `attachment://<name>`.
 */
export function recapEmbed(data, { imageName } = {}) {
  const embed = baseEmbed(COLORS.PRIMARY).setTitle(TITLES[data.period] ?? 'Recap');

  if (!data.totalGames) {
    embed.setDescription('No games were tracked in this period.');
    return embed;
  }

  embed.addFields(
    {
      name: '📈 Most LP Gained',
      value: data.mostLpGained ? `${mention(data.mostLpGained)} (+${data.mostLpGained.value} LP)` : '—',
      inline: true,
    },
    {
      name: '📉 Most LP Lost',
      value: data.mostLpLost ? `${mention(data.mostLpLost)} (${data.mostLpLost.value} LP)` : '—',
      inline: true,
    },
    {
      name: '🎮 Most Games',
      value: data.mostGames ? `${mention(data.mostGames)} (${data.mostGames.value})` : '—',
      inline: true,
    },
    { name: '⚔️ Best KDA', value: gameLine(data.bestKda) },
    { name: '💀 Worst KDA', value: gameLine(data.worstKda) },
    {
      name: '🦸 Biggest Carry',
      value: data.biggestCarry
        ? `${mention(data.biggestCarry)} — ${data.biggestCarry.championName} (${Math.round((data.biggestCarry.damageShare ?? 0) * 100)}% dmg)`
        : '—',
    },
    {
      name: '🃏 Biggest Int',
      value: data.biggestInt
        ? `${mention(data.biggestInt)} — ${data.biggestInt.championName} (${data.biggestInt.deaths} deaths)`
        : '—',
    },
  );

  embed.setFooter({ text: `${data.totalGames} games tracked` });
  if (imageName) embed.setImage(`attachment://${imageName}`);
  return embed;
}

export default recapEmbed;
