import { MessageFlags } from 'discord.js';

/**
 * Replies (or edits/follows-up) ephemerally, picking the right method based on
 * the interaction's current state. Ephemeral by default so command chatter stays
 * private unless a command deliberately posts publicly.
 */
export function replyEphemeral(interaction, payload) {
  const data = typeof payload === 'string' ? { content: payload } : { ...payload };
  if (interaction.deferred) return interaction.editReply(data);
  if (interaction.replied) {
    return interaction.followUp({ ...data, flags: MessageFlags.Ephemeral });
  }
  return interaction.reply({ ...data, flags: MessageFlags.Ephemeral });
}

/** Consistent user-facing error message (never leaks internals — OWASP A10). */
export function errorReply(interaction, message) {
  return replyEphemeral(interaction, { content: `⚠️ ${message}` });
}

/** Consistent success message. */
export function successReply(interaction, message) {
  return replyEphemeral(interaction, { content: `✅ ${message}` });
}
