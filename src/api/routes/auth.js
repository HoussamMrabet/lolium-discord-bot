import { Router } from 'express';
import { authLimiter } from '../middlewares/rateLimit.js';
import { requireAuth } from '../middlewares/auth.js';
import { asyncHandler } from '../middlewares/error.js';

export function authRouter({ controller }) {
  const router = Router();
  router.use(authLimiter);

  router.get('/discord', controller.login);
  router.get('/discord/callback', asyncHandler(controller.callback));
  router.get('/me', requireAuth, controller.me);
  router.post('/logout', requireAuth, controller.logout);

  return router;
}
