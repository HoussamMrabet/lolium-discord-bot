import { isAdmin } from '../utils/permissions.js';
import { errorReply } from '../utils/reply.js';

/**
 * Routes a chat-input command interaction: existence, guild/admin gating, then
 * execution inside a try/catch that logs and returns a safe error message. The
 * gating here is defense-in-depth on top of Discord's own default-member
 * permissions (deny-by-default — OWASP A01).
 */
export async function handleCommand(interaction, ctx) {
  const command = ctx.commands.get(interaction.commandName);
  if (!command) return errorReply(interaction, 'Unknown command.');

  if (command.guildOnly && !interaction.inGuild()) {
    return errorReply(interaction, 'This command can only be used in a server.');
  }
  if (command.adminOnly && !isAdmin(interaction)) {
    return errorReply(
      interaction,
      'You need the **Manage Server** permission to use this command.',
    );
  }

  const log = ctx.logger.child({
    command: interaction.commandName,
    guildId: interaction.guildId,
    userId: interaction.user.id,
  });

  try {
    await command.execute(interaction, { ...ctx, log });
  } catch (err) {
    log.error({ err }, 'command execution failed');
    await errorReply(
      interaction,
      'Something went wrong running that command. Please try again.',
    ).catch(() => {});
  }
}

/** Routes an autocomplete interaction to the command's optional handler. */
export async function handleAutocomplete(interaction, ctx) {
  const command = ctx.commands.get(interaction.commandName);
  if (!command || typeof command.autocomplete !== 'function') {
    return interaction.respond([]).catch(() => {});
  }
  try {
    await command.autocomplete(interaction, ctx);
  } catch (err) {
    ctx.logger.error(
      { err, command: interaction.commandName },
      'autocomplete failed',
    );
    await interaction.respond([]).catch(() => {});
  }
}

/** Routes a button/select/modal interaction by customId prefix. */
export async function handleComponent(interaction, ctx) {
  const prefix = interaction.customId.split(':')[0];
  const handler = ctx.componentHandlers.get(prefix);
  if (!handler) {
    return errorReply(interaction, 'This interaction has expired.');
  }
  try {
    await handler.execute(interaction, ctx);
  } catch (err) {
    ctx.logger.error(
      { err, customId: interaction.customId },
      'component handler failed',
    );
    await errorReply(interaction, 'Something went wrong.').catch(() => {});
  }
}
