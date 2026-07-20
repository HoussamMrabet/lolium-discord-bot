import { Routes } from 'discord.js';

// Discord error codes we shouldn't retry — the target is gone or we lack access.
const TERMINAL_CODES = new Set([
  10003, // Unknown Channel
  50001, // Missing Access
  50013, // Missing Permissions
]);

/**
 * notify-dispatch worker: posts a queued notification's embeds to its channel
 * via the Discord REST API (works cross-shard, no gateway needed). The outbox
 * row guards exactly-once, and `@discordjs/rest` handles Discord's own rate
 * limits transparently. Permission/unknown-channel errors are terminal
 * (skipped); everything else is thrown for BullMQ to retry with backoff.
 */
export function createNotifyDispatchProcessor({ repositories, rest, logger }) {
  return async function process(job) {
    const { dedupeKey } = job.data;
    const notif = await repositories.notifications.findOne({ dedupeKey });
    if (!notif) return { skipped: 'missing' };
    if (notif.status !== 'pending') return { skipped: notif.status };

    try {
      const message = await rest.post(Routes.channelMessages(notif.channelId), {
        body: {
          embeds: notif.payload?.embeds ?? [],
          ...(notif.payload?.content ? { content: notif.payload.content } : {}),
        },
      });
      await repositories.notifications.markSent(dedupeKey, message.id);
      return { sent: true };
    } catch (err) {
      const code = err?.code ?? err?.status;
      if (TERMINAL_CODES.has(code) || code === 403) {
        await repositories.notifications.markSkipped(dedupeKey, `discord:${code}`);
        logger.warn({ dedupeKey, code }, 'notification skipped (channel/permission)');
        return { skipped: 'terminal' };
      }
      await repositories.notifications.recordFailure(dedupeKey, err?.message ?? err);
      throw err; // transient — let BullMQ retry
    }
  };
}
