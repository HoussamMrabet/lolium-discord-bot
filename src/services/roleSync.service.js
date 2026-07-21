import { tierIndex } from '../utils/ladder.js';

/**
 * Computes the desired rank role for a member and diffs it against their current
 * roles. The compute step is over repositories only; the actual Discord role
 * edits happen in the role-sync worker. A member with multiple accounts gets the
 * role for their HIGHEST solo-queue tier.
 */
export function createRoleSyncService({ repositories }) {
  function rolesMapToObject(roles) {
    if (!roles) return {};
    if (roles instanceof Map) return Object.fromEntries(roles);
    return roles;
  }

  async function computeDesired(guildId, discordUserId) {
    const settings = await repositories.guildSettings.getByGuild(guildId);
    if (!settings?.features?.roleSync) return { enabled: false };

    const roles = rolesMapToObject(settings.roles);
    const managedRoleIds = Object.values(roles);
    if (!managedRoleIds.length) return { enabled: false };

    const players = await repositories.players.listByUser(guildId, discordUserId);
    if (!players.length) {
      return { enabled: true, desiredRoleId: null, managedRoleIds, tier: null };
    }

    const puuids = [...new Set(players.map((p) => p.puuid))];
    const summoners = await repositories.summoners.findByPuuids(puuids);

    let bestTier = null;
    let bestIdx = -1;
    for (const s of summoners) {
      const tier = s.ranked?.RANKED_SOLO_5x5?.tier;
      if (tier && tierIndex(tier) > bestIdx) {
        bestIdx = tierIndex(tier);
        bestTier = tier;
      }
    }

    return {
      enabled: true,
      desiredRoleId: bestTier ? (roles[bestTier] ?? null) : null,
      managedRoleIds,
      tier: bestTier,
    };
  }

  /**
   * Pure diff: which managed roles to add/remove so the member ends up with only
   * their desired tier role. Never touches roles the bot doesn't manage.
   */
  function diffRoles(currentRoleIds, desiredRoleId, managedRoleIds) {
    const current = new Set(currentRoleIds);
    const managed = new Set(managedRoleIds);
    const toRemove = [...current].filter((r) => managed.has(r) && r !== desiredRoleId);
    const toAdd = desiredRoleId && !current.has(desiredRoleId) ? [desiredRoleId] : [];
    return { toAdd, toRemove };
  }

  return { computeDesired, diffRoles };
}

export default createRoleSyncService;
