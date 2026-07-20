/**
 * Pure transform: a Riot match-v5 DTO -> our trimmed, canonical Match document.
 * Computes team-relative metrics (kill participation, damage share) that later
 * power MVP detection, betting markets, and the performance classifier.
 */

function extractPerks(perks) {
  if (!perks) {
    return { primaryStyle: 0, subStyle: 0, keystone: 0, selections: [], statPerks: [] };
  }
  const styles = perks.styles ?? [];
  const primary =
    styles.find((s) => s.description === 'primaryStyle') ?? styles[0];
  const sub = styles.find((s) => s.description === 'subStyle') ?? styles[1];

  const selections = [];
  for (const style of styles) {
    for (const sel of style.selections ?? []) selections.push(sel.perk);
  }
  const statPerks = perks.statPerks
    ? [perks.statPerks.offense, perks.statPerks.flex, perks.statPerks.defense]
    : [];

  return {
    primaryStyle: primary?.style ?? 0,
    subStyle: sub?.style ?? 0,
    keystone: primary?.selections?.[0]?.perk ?? 0,
    selections,
    statPerks,
  };
}

export function toMatchDocument(dto) {
  const info = dto.info ?? {};
  const meta = dto.metadata ?? {};

  const rawDuration = info.gameDuration ?? 0;
  // Older matches expressed gameDuration in ms; normalize everything to seconds.
  const durationSec = rawDuration > 100000 ? Math.round(rawDuration / 1000) : rawDuration;

  const participants = info.participants ?? [];
  const teamKills = {};
  const teamDamage = {};
  for (const p of participants) {
    teamKills[p.teamId] = (teamKills[p.teamId] ?? 0) + (p.kills ?? 0);
    teamDamage[p.teamId] =
      (teamDamage[p.teamId] ?? 0) + (p.totalDamageDealtToChampions ?? 0);
  }

  const mapped = participants.map((p) => {
    const cs = (p.totalMinionsKilled ?? 0) + (p.neutralMinionsKilled ?? 0);
    const csPerMin =
      durationSec > 0 ? Number((cs / (durationSec / 60)).toFixed(2)) : 0;
    const tKills = teamKills[p.teamId] ?? 0;
    const tDamage = teamDamage[p.teamId] ?? 0;

    return {
      puuid: p.puuid,
      gameName: p.riotIdGameName ?? p.summonerName ?? null,
      tagLine: p.riotIdTagline ?? null,
      championId: p.championId,
      championName: p.championName,
      teamId: p.teamId,
      teamPosition: p.teamPosition ?? '',
      win: Boolean(p.win),
      kills: p.kills ?? 0,
      deaths: p.deaths ?? 0,
      assists: p.assists ?? 0,
      totalDamageToChampions: p.totalDamageDealtToChampions ?? 0,
      totalMinionsKilled: p.totalMinionsKilled ?? 0,
      neutralMinionsKilled: p.neutralMinionsKilled ?? 0,
      cs,
      csPerMin,
      visionScore: p.visionScore ?? 0,
      goldEarned: p.goldEarned ?? 0,
      champLevel: p.champLevel ?? 0,
      items: [p.item0, p.item1, p.item2, p.item3, p.item4, p.item5, p.item6].map(
        (x) => x ?? 0,
      ),
      summonerSpells: [p.summoner1Id ?? 0, p.summoner2Id ?? 0],
      perks: extractPerks(p.perks),
      doubleKills: p.doubleKills ?? 0,
      tripleKills: p.tripleKills ?? 0,
      quadraKills: p.quadraKills ?? 0,
      pentaKills: p.pentaKills ?? 0,
      killParticipation:
        tKills > 0
          ? Number((((p.kills ?? 0) + (p.assists ?? 0)) / tKills).toFixed(3))
          : 0,
      damageShare:
        tDamage > 0
          ? Number(((p.totalDamageDealtToChampions ?? 0) / tDamage).toFixed(3))
          : 0,
    };
  });

  const gameEndAt = info.gameEndTimestamp
    ? new Date(info.gameEndTimestamp)
    : info.gameStartTimestamp && durationSec
      ? new Date(info.gameStartTimestamp + durationSec * 1000)
      : null;

  return {
    _id: meta.matchId,
    queueId: info.queueId,
    gameMode: info.gameMode ?? null,
    gameType: info.gameType ?? null,
    gameVersion: info.gameVersion ?? null,
    platformId: info.platformId ?? null,
    mapId: info.mapId ?? null,
    gameCreation: info.gameCreation ? new Date(info.gameCreation) : null,
    gameStartAt: info.gameStartTimestamp ? new Date(info.gameStartTimestamp) : null,
    gameEndAt,
    gameDuration: durationSec,
    participants: mapped,
  };
}
