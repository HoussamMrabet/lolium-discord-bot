import { Routes } from 'discord.js';
import { baseEmbed, COLORS } from '../embeds/theme.js';
import { recapEmbed } from '../embeds/builders/recapEmbed.js';
import { renderBarChart } from '../embeds/charts/barChart.js';
import { renderLineChart } from '../embeds/charts/lineChart.js';

/**
 * recap-generate worker: builds a guild's recap, renders charts (weekly/monthly)
 * with @napi-rs/canvas, and posts the embeds + PNG attachments to the recaps
 * channel. Daily recaps are text-only; weekly/monthly include a "Top LP gained"
 * bar chart and the top gainer's rank-progression line chart.
 */
export function createRecapGenerateProcessor({ repositories, recap, rest, logger }) {
  return async function process(job) {
    const { guildId, period } = job.data;
    const settings = await repositories.guildSettings.getByGuild(guildId);
    const channelId = settings?.channels?.recaps;
    if (!channelId) return { skipped: 'no-channel' };

    const data = await recap.buildRecap(guildId, period);
    const embeds = [];
    const files = [];
    const withCharts = period !== 'daily' && data.totalGames > 0;

    if (withCharts && data.topLpGainers.length) {
      files.push({
        name: 'top-lp.png',
        data: renderBarChart({
          title: 'Top LP Gained',
          bars: data.topLpGainers.map((g) => ({ label: g.displayName, value: g.value })),
        }),
      });
      embeds.push(recapEmbed(data, { imageName: 'top-lp.png' }));
    } else {
      embeds.push(recapEmbed(data));
    }

    if (withCharts && data.playerOfPeriod) {
      const series = await repositories.rankHistory.series(
        data.playerOfPeriod.summonerId,
        'RANKED_SOLO_5x5',
        recap.sinceFor(period),
      );
      if (series.length >= 2) {
        files.push({
          name: 'progression.png',
          data: renderLineChart({
            title: `${data.playerOfPeriod.displayName} — Rank Progression`,
            yLabel: 'LP',
            points: series.map((h) => ({
              x: h.at.toISOString().slice(5, 10),
              y: h.absoluteLp,
            })),
          }),
        });
        embeds.push(
          baseEmbed(COLORS.INFO)
            .setTitle('📈 Player of the Period')
            .setImage('attachment://progression.png'),
        );
      }
    }

    try {
      await rest.post(Routes.channelMessages(channelId), { body: { embeds }, files });
    } catch (err) {
      logger.warn({ guildId, period, code: err?.code ?? err?.status }, 'recap post failed');
      throw err;
    }
    return { posted: true, period, charts: files.length };
  };
}
