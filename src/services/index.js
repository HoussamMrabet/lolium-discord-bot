import { RankService } from './rank.service.js';
import { createLinkingService } from './linking.service.js';
import { createStatsService } from './stats.service.js';

/**
 * Services composition root. Wires domain services over the Riot facade and
 * repositories. Injectable for tests.
 */
export function createServices({ riot, repositories, logger }) {
  const rank = new RankService();
  const linking = createLinkingService({ riot, repositories, rank, logger });
  const stats = createStatsService({ repositories });
  return { rank, linking, stats };
}

export default createServices;
