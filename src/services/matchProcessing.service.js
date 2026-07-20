import { RANKED_QUEUES } from '../config/constants.js';
import { diffRanks } from '../utils/ladder.js';
import { kda as kdaRatio } from '../utils/format.js';
import { createLogger } from '../core/logger.js';
import { toMatchDocument } from './matchTransform.js';

function queueTypeFor(queueId) {
  for (const q of Object.values(RANKED_QUEUES)) {
    if (q.id === queueId) return q.key;
  }
  return null;
}

function multikillMax(part) {
  if (part.pentaKills) return 5;
  if (part.quadraKills) return 4;
  if (part.tripleKills) return 3;
  if (part.doubleKills) return 2;
  return 0;
}

/** MVP: a winner with the top damage on their team. */
function isMvp(match, part) {
  if (!part.win) return false;
  const team = match.participants.filter((p) => p.teamId === part.teamId);
  const maxDamage = Math.max(...team.map((p) => p.totalDamageToChampions ?? 0));
  return maxDamage > 0 && (part.totalDamageToChampions ?? 0) >= maxDamage;
}

/**
 * Processes one tracked summoner's participation in one match: ensures the Match
 * is stored (fetch-once), writes the PlayerMatch read-model, and — for ranked
 * games — computes the LP/rank delta, records history, updates the streak, and
 * detects promotions/demotions. Idempotent: re-processing never double-counts LP
 * or streaks.
 *
 * Returns a result describing what happened (consumed by the notification layer
 * in Phase 7b).
 */
export function createMatchProcessingService({
  riot,
  repositories,
  rank,
  performance,
  streak,
  logger = createLogger('match-processing'),
}) {
  async function ensureMatch(matchId, platform) {
    const existing = await repositories.matches.findByMatchId(matchId);
    if (existing) return existing;
    const dto = await riot.getMatch({ matchId, platform });
    const doc = toMatchDocument(dto);
    await repositories.matches.insertIfAbsent(doc);
    return (await repositories.matches.findByMatchId(matchId)) ?? doc;
  }

  async function applyRankUpdate({ summonerId, puuid, platform, queueType, matchId, win }) {
    const summoner = await repositories.summoners.findByPuuid(puuid);
    const before = summoner?.ranked?.[queueType] ?? {
      tier: null,
      division: null,
      lp: 0,
      absoluteLp: 0,
      wins: 0,
      losses: 0,
    };

    const byQueue = await riot.getRankedEntries({ puuid, platform });
    const after = rank.toRankedEntry(byQueue[queueType]);
    const diff = diffRanks(before, after);

    // Attribute LP only when there was a prior ranked standing (skip placement
    // completion, which would otherwise look like a huge one-game swing).
    const lpDelta = before.tier ? after.absoluteLp - before.absoluteLp : null;

    await repositories.rankHistory.record({
      summonerId,
      queueType,
      tier: after.tier,
      division: after.division,
      lp: after.lp,
      absoluteLp: after.absoluteLp,
      wins: after.wins,
      losses: after.losses,
      source: 'match',
      matchId,
    });

    if (lpDelta !== null) {
      await repositories.lpHistory.record({
        summonerId,
        queueType,
        matchId,
        at: new Date(),
        result: win ? 'W' : 'L',
        lpBefore: before.lp,
        lpAfter: after.lp,
        delta: lpDelta,
        absoluteBefore: before.absoluteLp,
        absoluteAfter: after.absoluteLp,
        tierBefore: before.tier,
        divisionBefore: before.division,
        tierAfter: after.tier,
        divisionAfter: after.division,
      });
    }

    await repositories.summoners.updateRankedSnapshot(puuid, queueType, after);

    return {
      before,
      after,
      lpDelta,
      absoluteAfter: after.absoluteLp,
      promotion: diff.promotion,
      demotion: diff.demotion,
      placement: diff.placement,
    };
  }

  async function applyStreak(puuid, win, thresholds) {
    const summoner = await repositories.summoners.findByPuuid(puuid);
    const next = streak.applyResult(summoner?.streak, win);
    await repositories.summoners.updateStreak(puuid, next);
    return {
      streak: next,
      milestone: streak.streakMilestone(next.current, thresholds),
    };
  }

  async function processMatchForSummoner({ matchId, platform, summonerId, puuid }) {
    const match = await ensureMatch(matchId, platform);
    const part = match.participants.find((p) => p.puuid === puuid);
    if (!part) {
      logger.warn({ matchId, puuid }, 'tracked puuid not found in match');
      return null;
    }

    // Idempotency: if we already recorded this game for this summoner, don't
    // re-apply LP/streak (which are stateful), only ensure the read-model exists.
    const alreadyProcessed = Boolean(
      await repositories.playerMatches.findOne({ summonerId, matchId }),
    );

    const queueType = queueTypeFor(match.queueId);
    const gameDurationMin = (match.gameDuration ?? 0) / 60;
    const kda = kdaRatio(part.kills, part.deaths, part.assists);
    const bucket = performance.classifyPerformance({
      win: part.win,
      kills: part.kills,
      deaths: part.deaths,
      assists: part.assists,
      kda,
      damageShare: part.damageShare,
      killParticipation: part.killParticipation,
      csPerMin: part.csPerMin,
      visionScore: part.visionScore,
      pentaKills: part.pentaKills,
      gameDurationMin,
      role: part.teamPosition,
    });
    const mvp = isMvp(match, part);

    let rankEvent = null;
    let streakEvent = null;
    if (queueType && !alreadyProcessed) {
      rankEvent = await applyRankUpdate({
        summonerId,
        puuid,
        platform,
        queueType,
        matchId,
        win: part.win,
      });
      streakEvent = await applyStreak(puuid, part.win);
    }

    await repositories.playerMatches.upsertForMatch(summonerId, matchId, {
      puuid,
      queueId: match.queueId,
      gameEndAt: match.gameEndAt,
      gameDuration: match.gameDuration,
      championId: part.championId,
      championName: part.championName,
      role: part.teamPosition,
      win: part.win,
      kills: part.kills,
      deaths: part.deaths,
      assists: part.assists,
      kda,
      damage: part.totalDamageToChampions,
      damageShare: part.damageShare,
      cs: part.cs,
      csPerMin: part.csPerMin,
      visionScore: part.visionScore,
      killParticipation: part.killParticipation,
      goldEarned: part.goldEarned,
      pentaKills: part.pentaKills,
      multikillMax: multikillMax(part),
      mvp,
      performanceBucket: bucket,
      queueType,
      lpDelta: rankEvent?.lpDelta ?? null,
      absoluteLpAfter: rankEvent?.absoluteAfter ?? null,
    });

    if (!alreadyProcessed) {
      await repositories.summoners.setPolling(puuid, {
        lastMatchId: matchId,
        lastMatchStartAt: match.gameStartAt ?? match.gameEndAt,
      });
    }

    return {
      match,
      participant: part,
      queueType,
      performanceBucket: bucket,
      mvp,
      kda,
      rankEvent,
      streakEvent,
      alreadyProcessed,
    };
  }

  return { processMatchForSummoner, ensureMatch, queueTypeFor };
}

export default createMatchProcessingService;
