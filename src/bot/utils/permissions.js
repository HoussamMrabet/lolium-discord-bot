import { PermissionFlagsBits } from 'discord.js';

/**
 * True if the invoking member may administer the bot in this guild.
 * We require the **Manage Server** permission (guild owners have it implicitly).
 * Fail-closed: anything outside a guild, or without the permission, is denied.
 */
export function isAdmin(interaction) {
  if (!interaction.inGuild()) return false;
  const perms = interaction.memberPermissions;
  return Boolean(perms?.has(PermissionFlagsBits.ManageGuild));
}
