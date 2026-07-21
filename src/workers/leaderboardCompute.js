import { Routes } from 'discord.js';
import { leaderboardEmbed } from '../embeds/builders/leaderboardEmbed.js';

const UNKNOWN_MESSAGE = 10008;

/**
 * leaderboard-compute worker: for a guild, recompute each enabled leaderboard
 * category and post/edit its message in the configured leaderboard channel
 * (edit-in-place, so the board updates without spamming new messages).
 */
export function createLeaderboardComputeProcessor({ repositories, leaderboard, rest, logger }) {
  async function postOrEdit(guildId, category, period, channelId, embedJson) {
    const lb = await repositories.leaderboards.get(guildId, category, period);
    const ref = lb?.message;

    async function postNew() {
      const msg = await rest.post(Routes.channelMessages(channelId), {
        body: { embeds: [embedJson] },
      });
      await repositories.leaderboards.setMessageRef(guildId, category, period, channelId, msg.id);
    }

    if (ref?.messageId && ref.channelId === channelId) {
      try {
        await rest.patch(Routes.channelMessage(channelId, ref.messageId), {
          body: { embeds: [embedJson] },
        });
      } catch (err) {
        if ((err?.code ?? err?.status) === UNKNOWN_MESSAGE) {
          await postNew(); // the old message was deleted — repost
        } else {
          throw err;
        }
      }
    } else {
      await postNew();
    }
  }

  return async function process(job) {
    const { guildId, period = 'all' } = job.data;
    const settings = await repositories.guildSettings.getByGuild(guildId);
    const channelId = settings?.channels?.leaderboard;
    const categories = settings?.enabledLeaderboards ?? [];

    let posted = 0;
    for (const category of categories) {
      const { entries } = await leaderboard.computeAndSave(guildId, category, period);
      if (!channelId) continue;
      try {
        await postOrEdit(
          guildId,
          category,
          period,
          channelId,
          leaderboardEmbed({ category, period, entries }).toJSON(),
        );
        posted += 1;
      } catch (err) {
        logger.warn(
          { guildId, category, code: err?.code ?? err?.status },
          'leaderboard post failed',
        );
      }
    }
    return { categories: categories.length, posted };
  };
}
