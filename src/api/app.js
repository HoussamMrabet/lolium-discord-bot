import express from 'express';
import helmet from 'helmet';
import session from 'express-session';
import RedisStore from 'connect-redis';
import { env } from '../config/env.js';
import { apiLimiter } from './middlewares/rateLimit.js';
import { notFoundHandler, errorHandler } from './middlewares/error.js';
import { createDiscordOauth } from './auth/discordOauth.js';
import { createAuthController } from './controllers/authController.js';
import { createGuildsController } from './controllers/guildsController.js';
import { authRouter } from './routes/auth.js';
import { guildsRouter } from './routes/guilds.js';

/**
 * Builds the Express app for the dashboard REST API. Security posture:
 * helmet headers, JSON body cap, Redis-backed signed HttpOnly session cookies,
 * per-IP rate limiting, deny-by-default guild authz, and a fail-closed error
 * handler. Dependencies are injected so it can be built in tests without a live
 * Discord/Mongo/Redis.
 */
export function createApp({ repositories, services, redis }) {
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(helmet());

  // Credentialed CORS for the dashboard SPA, only when an origin is configured.
  if (env.DASHBOARD_URL) {
    app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', env.DASHBOARD_URL);
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type');
      res.header('Vary', 'Origin');
      if (req.method === 'OPTIONS') return res.sendStatus(204);
      return next();
    });
  }

  app.use(express.json({ limit: '100kb' }));
  app.use(
    session({
      store: new RedisStore({ client: redis, prefix: 'sess:' }),
      secret: env.SESSION_SECRET,
      name: 'sid',
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: env.COOKIE_SECURE,
        sameSite: env.COOKIE_SECURE ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      },
    }),
  );
  app.use(apiLimiter);

  app.get('/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

  const oauth = createDiscordOauth({
    clientId: env.DISCORD_CLIENT_ID,
    clientSecret: env.DISCORD_CLIENT_SECRET,
    redirectUri: env.DISCORD_OAUTH_REDIRECT_URI,
  });
  const authController = createAuthController({ repositories, oauth, config: env });
  const guildsController = createGuildsController({ repositories, services });

  app.use('/api/v1/auth', authRouter({ controller: authController }));
  app.use('/api/v1/guilds', guildsRouter({ controller: guildsController, repositories }));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
