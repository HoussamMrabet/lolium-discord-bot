import { Router } from 'express';
import { validate } from '../middlewares/validate.js';
import { asyncHandler } from '../middlewares/error.js';
import { lookupLimiter, championLimiter } from '../middlewares/rateLimit.js';
import { lookupQuery, championParams } from '../validators/schemas.js';

/** Public routes — no auth. Summoner lookup is tightly rate-limited (hits Riot). */
export function publicRouter({ controller }) {
  const router = Router();

  router.get(
    '/lookup/summoner',
    lookupLimiter,
    validate(lookupQuery, 'query'),
    asyncHandler(controller.summonerLookup),
  );
  router.get('/champions', championLimiter, asyncHandler(controller.champions));
  router.get(
    '/champions/:id',
    championLimiter,
    validate(championParams, 'params'),
    asyncHandler(controller.champion),
  );

  return router;
}
