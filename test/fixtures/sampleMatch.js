export const TRACKED_PUUID = 'PU-Faker-KR1';

/** A minimal but realistic match-v5 DTO (4 participants, 2 per team). */
export const sampleMatchDto = {
  metadata: { matchId: 'NA1_100', participants: [TRACKED_PUUID, 'ally1', 'enemy1', 'enemy2'] },
  info: {
    queueId: 420,
    gameMode: 'CLASSIC',
    gameType: 'MATCHED_GAME',
    gameVersion: '15.13.1',
    platformId: 'NA1',
    mapId: 11,
    gameCreation: 1_700_000_000_000,
    gameStartTimestamp: 1_700_000_060_000,
    gameEndTimestamp: 1_700_000_060_000 + 1800 * 1000,
    gameDuration: 1800,
    participants: [
      {
        puuid: TRACKED_PUUID,
        riotIdGameName: 'Faker',
        riotIdTagline: 'KR1',
        championId: 157,
        championName: 'Yasuo',
        teamId: 100,
        teamPosition: 'MIDDLE',
        win: true,
        kills: 10,
        deaths: 2,
        assists: 5,
        totalDamageDealtToChampions: 30000,
        totalMinionsKilled: 200,
        neutralMinionsKilled: 20,
        visionScore: 20,
        goldEarned: 15000,
        champLevel: 16,
        item0: 3153, item1: 3006, item2: 6672, item3: 0, item4: 0, item5: 0, item6: 3340,
        summoner1Id: 4, summoner2Id: 12,
        doubleKills: 1, tripleKills: 0, quadraKills: 0, pentaKills: 0,
        perks: {
          styles: [
            { description: 'primaryStyle', style: 8000, selections: [{ perk: 8005 }] },
            { description: 'subStyle', style: 8100, selections: [{ perk: 8139 }] },
          ],
          statPerks: { offense: 5008, flex: 5008, defense: 5001 },
        },
      },
      {
        puuid: 'ally1', championId: 1, championName: 'Annie', teamId: 100,
        teamPosition: 'BOTTOM', win: true, kills: 5, deaths: 3, assists: 8,
        totalDamageDealtToChampions: 20000, totalMinionsKilled: 180, neutralMinionsKilled: 0,
        visionScore: 15, goldEarned: 12000, champLevel: 15,
      },
      {
        puuid: 'enemy1', championId: 2, championName: 'Olaf', teamId: 200,
        teamPosition: 'JUNGLE', win: false, kills: 4, deaths: 6, assists: 3,
        totalDamageDealtToChampions: 18000, totalMinionsKilled: 50, neutralMinionsKilled: 120,
        visionScore: 25, goldEarned: 11000, champLevel: 14,
      },
      {
        puuid: 'enemy2', championId: 3, championName: 'Galio', teamId: 200,
        teamPosition: 'MIDDLE', win: false, kills: 6, deaths: 7, assists: 5,
        totalDamageDealtToChampions: 22000, totalMinionsKilled: 160, neutralMinionsKilled: 10,
        visionScore: 18, goldEarned: 11500, champLevel: 15,
      },
    ],
  },
};
