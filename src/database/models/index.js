/**
 * Models barrel. Importing this file registers every Mongoose model, so call it
 * (directly or via the repositories layer) before `connectMongo()`/`syncIndexes()`.
 */
import Guild from './guild.model.js';
import GuildSettings from './guildSettings.model.js';
import User from './user.model.js';
import Summoner from './summoner.model.js';
import Player from './player.model.js';
import Match from './match.model.js';
import PlayerMatch from './playerMatch.model.js';
import LPHistory from './lpHistory.model.js';
import RankHistory from './rankHistory.model.js';
import Leaderboard from './leaderboard.model.js';
import Bet from './bet.model.js';
import BettingProfile from './bettingProfile.model.js';
import RoleSync from './roleSync.model.js';
import NotificationQueue from './notificationQueue.model.js';

export {
  Guild,
  GuildSettings,
  User,
  Summoner,
  Player,
  Match,
  PlayerMatch,
  LPHistory,
  RankHistory,
  Leaderboard,
  Bet,
  BettingProfile,
  RoleSync,
  NotificationQueue,
};

export const models = {
  Guild,
  GuildSettings,
  User,
  Summoner,
  Player,
  Match,
  PlayerMatch,
  LPHistory,
  RankHistory,
  Leaderboard,
  Bet,
  BettingProfile,
  RoleSync,
  NotificationQueue,
};

export default models;
