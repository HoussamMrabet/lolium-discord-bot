import { Router } from 'express';
import { requireAuth, createRequireGuildAccess } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { asyncHandler } from '../middlewares/error.js';
import {
  guildParams,
  playerParams,
  summonerStatsParams,
  settingsPatch,
  leaderboardQuery,
  matchesQuery,
} from '../validators/schemas.js';

export function guildsRouter({ controller, repositories }) {
  const router = Router();
  const requireGuildAccess = createRequireGuildAccess({ repositories });
  const gid = validate(guildParams, 'params');

  router.use(requireAuth);

  router.get('/', asyncHandler(controller.listGuilds));

  router.get('/:guildId/settings', gid, requireGuildAccess, asyncHandler(controller.getSettings));
  router.patch(
    '/:guildId/settings',
    gid,
    requireGuildAccess,
    validate(settingsPatch, 'body'),
    asyncHandler(controller.patchSettings),
  );

  router.get('/:guildId/players', gid, requireGuildAccess, asyncHandler(controller.listPlayers));
  router.delete(
    '/:guildId/players/:discordUserId/:summonerId',
    validate(playerParams, 'params'),
    requireGuildAccess,
    asyncHandler(controller.deletePlayer),
  );

  router.get(
    '/:guildId/matches',
    gid,
    requireGuildAccess,
    validate(matchesQuery, 'query'),
    asyncHandler(controller.listMatches),
  );
  router.get(
    '/:guildId/leaderboards',
    gid,
    requireGuildAccess,
    validate(leaderboardQuery, 'query'),
    asyncHandler(controller.getLeaderboards),
  );
  router.get(
    '/:guildId/players/:summonerId/stats',
    validate(summonerStatsParams, 'params'),
    requireGuildAccess,
    asyncHandler(controller.getPlayerStats),
  );

  return router;
}
