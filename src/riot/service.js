import * as endpoints from './endpoints/index.js';

/**
 * High-level facade over the Riot endpoints, bound to a single client. This is
 * what domain services (linking, match processing, betting) consume — they never
 * touch the HTTP client, cache, or limiter directly.
 */
export class RiotService {
  constructor(client) {
    this.client = client;
  }

  getAccountByRiotId(args) {
    return endpoints.getAccountByRiotId(this.client, args);
  }

  getAccountByPuuid(args) {
    return endpoints.getAccountByPuuid(this.client, args);
  }

  getSummonerByPuuid(args) {
    return endpoints.getSummonerByPuuid(this.client, args);
  }

  getLeagueEntriesByPuuid(args) {
    return endpoints.getLeagueEntriesByPuuid(this.client, args);
  }

  /** Solo/Flex entries keyed by queueType, for convenient lookup. */
  async getRankedEntries(args) {
    const entries = (await endpoints.getLeagueEntriesByPuuid(this.client, args)) ?? [];
    const byQueue = {};
    for (const entry of entries) byQueue[entry.queueType] = entry;
    return byQueue;
  }

  getMatchIds(args) {
    return endpoints.getMatchIdsByPuuid(this.client, args);
  }

  getMatch(args) {
    return endpoints.getMatchById(this.client, args);
  }

  getActiveGame(args) {
    return endpoints.getActiveGameByPuuid(this.client, args);
  }
}

export default RiotService;
