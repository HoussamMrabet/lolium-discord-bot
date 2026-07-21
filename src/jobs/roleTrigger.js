/**
 * Event-driven role sync: when a tracked account's tier changes, enqueue a
 * role-sync job for that member in every guild that has role syncing enabled.
 * The jobId is bucketed per minute so rapid re-triggers coalesce.
 */
export function createRoleTrigger({ repositories, roleSyncQueue }) {
  async function onRankChange({ puuid }) {
    const links = await repositories.players.findGuildsTrackingPuuid(puuid);
    const bucket = Math.floor(Date.now() / 60_000);
    let enqueued = 0;
    for (const link of links) {
      const settings = await repositories.guildSettings.getByGuild(link.guildId);
      if (!settings?.features?.roleSync) continue;
      await roleSyncQueue().add(
        'sync',
        { guildId: link.guildId, discordUserId: link.discordUserId },
        { jobId: `role:${link.guildId}:${link.discordUserId}:${bucket}` },
      );
      enqueued += 1;
    }
    return { enqueued };
  }

  return { onRankChange };
}

export default createRoleTrigger;
