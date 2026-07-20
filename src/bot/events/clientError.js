import { Events } from 'discord.js';

/** Surfaces gateway-level errors/warnings through structured logging. */
export default {
  name: Events.Error,
  execute(error, ctx) {
    ctx.logger.error({ err: error }, 'discord client error');
  },
};
