import { Routes } from 'discord.js';

const UNKNOWN_MEMBER = new Set([10007, 10013]);

/**
 * role-sync worker: reconcile a member's rank roles. Fetches their current
 * roles, diffs against the desired tier role, and applies the minimal set of
 * add/remove edits via REST — only ever touching roles the guild configured.
 * Permission/hierarchy failures are logged to the RoleSync audit, never crash.
 */
export function createRoleSyncProcessor({ repositories, roleSync, rest, logger }) {
  return async function process(job) {
    const { guildId, discordUserId } = job.data;

    const desired = await roleSync.computeDesired(guildId, discordUserId);
    if (!desired.enabled) return { skipped: 'disabled' };

    let member;
    try {
      member = await rest.get(Routes.guildMember(guildId, discordUserId));
    } catch (err) {
      if (UNKNOWN_MEMBER.has(err?.code ?? err?.status)) return { skipped: 'no-member' };
      throw err;
    }

    const { toAdd, toRemove } = roleSync.diffRoles(
      member.roles ?? [],
      desired.desiredRoleId,
      desired.managedRoleIds,
    );

    async function apply(action, roleId) {
      try {
        if (action === 'add') {
          await rest.put(Routes.guildMemberRole(guildId, discordUserId, roleId));
        } else {
          await rest.delete(Routes.guildMemberRole(guildId, discordUserId, roleId));
        }
        await repositories.roleSyncs.log({
          guildId,
          discordUserId,
          action,
          roleId,
          tier: desired.tier,
          success: true,
        });
      } catch (err) {
        await repositories.roleSyncs.log({
          guildId,
          discordUserId,
          action,
          roleId,
          tier: desired.tier,
          success: false,
          error: err?.message ?? String(err),
        });
        logger.warn(
          { guildId, discordUserId, roleId, action, code: err?.code ?? err?.status },
          'role edit failed (permissions/hierarchy?)',
        );
      }
    }

    for (const roleId of toRemove) await apply('remove', roleId);
    for (const roleId of toAdd) await apply('add', roleId);

    return { added: toAdd.length, removed: toRemove.length };
  };
}
