/**
 * Loads a guild's tracked summoners plus lookup maps, shared by the leaderboard
 * and recap services. Keeps the "which players does this guild track, and how do
 * we display them" logic in one place.
 */
export async function buildGuildScope(repositories, guildId) {
  const players = await repositories.players.listByGuild(guildId);
  if (!players.length) {
    return {
      summoners: [],
      summonerIds: [],
      idToSummoner: new Map(),
      playerByPuuid: new Map(),
    };
  }

  const puuids = [...new Set(players.map((p) => p.puuid))];
  const summoners = await repositories.summoners.findByPuuids(puuids);

  const idToSummoner = new Map(summoners.map((s) => [String(s._id), s]));
  const playerByPuuid = new Map();
  for (const p of players) {
    if (!playerByPuuid.has(p.puuid)) playerByPuuid.set(p.puuid, p);
  }

  return {
    summoners,
    summonerIds: summoners.map((s) => s._id),
    idToSummoner,
    playerByPuuid,
  };
}

/** Display fields for a summoner within a guild scope. */
export function displayFor(scope, summoner) {
  const player = scope.playerByPuuid.get(summoner.puuid);
  return {
    discordUserId: player?.discordUserId ?? null,
    displayName:
      player?.nickname ||
      `${summoner.riotId.gameName}#${summoner.riotId.tagLine}`,
  };
}
