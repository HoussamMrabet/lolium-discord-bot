import { RankService } from './rank.service.js';
import { createLinkingService } from './linking.service.js';
import { createStatsService } from './stats.service.js';
import { createMatchProcessingService } from './matchProcessing.service.js';
import { createLeaderboardService } from './leaderboard.service.js';
import { createRoleSyncService } from './roleSync.service.js';
import { createBettingService } from './betting.service.js';
import * as performance from './performance.service.js';
import * as streak from './streak.service.js';

/**
 * Services composition root. Wires domain services over the Riot facade and
 * repositories. Injectable for tests.
 */
export function createServices({ riot, repositories, logger }) {
  const rank = new RankService();
  const linking = createLinkingService({ riot, repositories, rank, logger });
  const stats = createStatsService({ repositories });
  const leaderboard = createLeaderboardService({ repositories });
  const roleSync = createRoleSyncService({ repositories });
  const betting = createBettingService({ repositories, logger });
  const matchProcessing = createMatchProcessingService({
    riot,
    repositories,
    rank,
    performance,
    streak,
    logger,
  });
  return { rank, linking, stats, leaderboard, roleSync, betting, matchProcessing };
}

export default createServices;
