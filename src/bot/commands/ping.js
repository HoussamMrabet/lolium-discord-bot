import { SlashCommandBuilder } from 'discord.js';
import { replyEphemeral } from '../utils/reply.js';

export default {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check that the bot is alive and see its latency.'),

  async execute(interaction, ctx) {
    const ws = Math.max(0, Math.round(ctx.client.ws.ping));
    await replyEphemeral(
      interaction,
      `🏓 Pong! Gateway heartbeat: **${ws}ms**.`,
    );
  },
};
