import { PERFORMANCE_BUCKETS } from '../config/constants.js';

/**
 * Classifies a game performance into a bucket that drives the (no-AI) funny
 * description templates. Pure and threshold-based, so it's easy to tune and
 * unit-test. Order matters: the most "characteristic" checks come first.
 *
 * @param {object} p derived participant metrics
 */
export function classifyPerformance(p) {
  const {
    win = false,
    deaths = 0,
    kda = 0,
    damageShare = 0,
    killParticipation = 0,
    csPerMin = 0,
    visionScore = 0,
    pentaKills = 0,
    gameDurationMin = 25,
    role = '',
  } = p;

  if (pentaKills > 0) return PERFORMANCE_BUCKETS.HARD_CARRY;
  if (deaths >= 10 && kda < 1) return PERFORMANCE_BUCKETS.INT;

  if (win && damageShare >= 0.3 && kda >= 4) return PERFORMANCE_BUCKETS.HARD_CARRY;
  if (win && kda >= 4) return PERFORMANCE_BUCKETS.CARRY;

  const visionPerMin = visionScore / Math.max(1, gameDurationMin);
  if (visionPerMin >= 2 && (role === 'UTILITY' || killParticipation >= 0.6)) {
    return PERFORMANCE_BUCKETS.VISION_GOD;
  }

  if (csPerMin >= 8 && killParticipation < 0.4) {
    return PERFORMANCE_BUCKETS.AFK_FARM;
  }

  if (!win && kda < 1.5) return PERFORMANCE_BUCKETS.ROUGH;
  if (win) return PERFORMANCE_BUCKETS.SOLID;
  return PERFORMANCE_BUCKETS.AVERAGE;
}
