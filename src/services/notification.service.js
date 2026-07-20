import { NOTIFICATION_TYPES } from '../config/constants.js';
import { createLogger } from '../core/logger.js';
import { buildDescription } from './description.service.js';
import { streakMilestone } from './streak.service.js';
import { matchEmbed } from '../embeds/builders/matchEmbed.js';
import {
  promotionEmbed,
  demotionEmbed,
  streakEmbed,
} from '../embeds/builders/eventEmbeds.js';

/**
 * Turns a processed match into per-guild Discord notifications.
 *
 * For each guild tracking the summoner, respects that guild's feature toggles
 * and channel config, builds the relevant embeds, and records them in the
 * NotificationQueue outbox via `claim` (unique dedupeKey) — so a given alert is
 * enqueued for dispatch **exactly once**, even if the match is reprocessed.
 *
 * The one Riot fetch behind a match thus fans out to every guild here: poll
 * once, notify many.
 */
export function createNotificationService({
  repositories,
  notifyQueue,
  logger = createLogger('notifications'),
}) {
  async function enqueue({ guildId, channelId, type, dedupeKey, embeds }) {
    const { inserted } = await repositories.notifications.claim({
      guildId,
      channelId,
      type,
      dedupeKey,
      payload: { embeds },
    });
    if (inserted) {
      await notifyQueue().add('dispatch', { dedupeKey }, { jobId: dedupeKey });
    }
    return inserted;
  }

  async function fanOutMatch({ puuid, summonerId, result }) {
    const summoner = await repositories.summoners.findByPuuid(puuid);
    if (!summoner) return { enqueued: 0 };

    const {
      participant,
      match,
      rankEvent,
      streakEvent,
      performanceBucket,
      mvp,
      kda,
      queueType,
    } = result;

    const links = await repositories.players.findGuildsTrackingPuuid(puuid);
    let enqueued = 0;

    for (const link of links) {
      const settings = await repositories.guildSettings.getByGuild(link.guildId);
      const channelId = settings?.channels?.alerts;
      if (!settings || !channelId) continue;

      const base = { guildId: link.guildId, channelId };

      // --- Match alert ---
      if (settings.features?.alerts) {
        const description = buildDescription({
          bucket: performanceBucket,
          name: link.nickname || summoner.riotId.gameName,
          champion: participant.championName,
          kills: participant.kills,
          deaths: participant.deaths,
          assists: participant.assists,
          kda,
          seed: `${match._id}:${summonerId}`,
        });
        const embed = matchEmbed({
          summoner,
          participant,
          description,
          lpDelta: rankEvent?.lpDelta ?? null,
          mvp,
          queueId: match.queueId,
          durationSec: match.gameDuration,
          kda,
        });
        if (
          await enqueue({
            ...base,
            type: NOTIFICATION_TYPES.MATCH_ALERT,
            dedupeKey: `matchAlert:${link.guildId}:${match._id}:${summonerId}`,
            embeds: [embed.toJSON()],
          })
        ) {
          enqueued += 1;
        }
      }

      // --- Promotion / demotion ---
      if (settings.features?.promotions && rankEvent && queueType) {
        if (rankEvent.promotion) {
          if (
            await enqueue({
              ...base,
              type: NOTIFICATION_TYPES.PROMOTION,
              dedupeKey: `promotion:${link.guildId}:${match._id}:${summonerId}`,
              embeds: [
                promotionEmbed({ summoner, queueType, after: rankEvent.after }).toJSON(),
              ],
            })
          ) {
            enqueued += 1;
          }
        } else if (rankEvent.demotion) {
          if (
            await enqueue({
              ...base,
              type: NOTIFICATION_TYPES.DEMOTION,
              dedupeKey: `demotion:${link.guildId}:${match._id}:${summonerId}`,
              embeds: [
                demotionEmbed({ summoner, queueType, after: rankEvent.after }).toJSON(),
              ],
            })
          ) {
            enqueued += 1;
          }
        }
      }

      // --- Streak milestone (per-guild thresholds) ---
      if (settings.features?.streaks && streakEvent) {
        const milestone = streakMilestone(
          streakEvent.streak.current,
          settings.streakThresholds,
        );
        if (milestone) {
          if (
            await enqueue({
              ...base,
              type: NOTIFICATION_TYPES.STREAK,
              dedupeKey: `streak:${link.guildId}:${match._id}:${summonerId}`,
              embeds: [streakEmbed({ summoner, milestone }).toJSON()],
            })
          ) {
            enqueued += 1;
          }
        }
      }
    }

    logger.debug({ puuid, matchId: match._id, enqueued }, 'fanned out match');
    return { enqueued };
  }

  return { fanOutMatch };
}

export default createNotificationService;
