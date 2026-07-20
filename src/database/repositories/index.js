/**
 * Data-layer composition root.
 *
 * `createRepositories(models)` wires each repository over its model. Production
 * code imports the ready-made `repositories` singleton; tests can call
 * `createRepositories(mockModels)` to inject fakes — this is the dependency
 * injection seam for the persistence layer.
 */
import models from '../models/index.js';
import { GuildRepository } from './guild.repository.js';
import { GuildSettingsRepository } from './guildSettings.repository.js';
import { UserRepository } from './user.repository.js';
import { SummonerRepository } from './summoner.repository.js';
import { PlayerRepository } from './player.repository.js';
import { MatchRepository } from './match.repository.js';
import { PlayerMatchRepository } from './playerMatch.repository.js';
import { LPHistoryRepository } from './lpHistory.repository.js';
import { RankHistoryRepository } from './rankHistory.repository.js';
import { LeaderboardRepository } from './leaderboard.repository.js';
import { BetRepository } from './bet.repository.js';
import { BettingProfileRepository } from './bettingProfile.repository.js';
import { RoleSyncRepository } from './roleSync.repository.js';
import { NotificationRepository } from './notification.repository.js';

export function createRepositories(m = models) {
  return {
    guilds: new GuildRepository(m.Guild),
    guildSettings: new GuildSettingsRepository(m.GuildSettings),
    users: new UserRepository(m.User),
    summoners: new SummonerRepository(m.Summoner),
    players: new PlayerRepository(m.Player),
    matches: new MatchRepository(m.Match),
    playerMatches: new PlayerMatchRepository(m.PlayerMatch),
    lpHistory: new LPHistoryRepository(m.LPHistory),
    rankHistory: new RankHistoryRepository(m.RankHistory),
    leaderboards: new LeaderboardRepository(m.Leaderboard),
    bets: new BetRepository(m.Bet),
    bettingProfiles: new BettingProfileRepository(m.BettingProfile),
    roleSyncs: new RoleSyncRepository(m.RoleSync),
    notifications: new NotificationRepository(m.NotificationQueue),
  };
}

export const repositories = createRepositories();

export default repositories;
