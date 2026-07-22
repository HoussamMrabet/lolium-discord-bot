import path from 'node:path';
import fs from 'node:fs';
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
import { createPublicController } from './controllers/publicController.js';
import { authRouter } from './routes/auth.js';
import { guildsRouter } from './routes/guilds.js';
import { publicRouter } from './routes/public.js';
import { createStaticDataService } from '../services/staticData.service.js';
import { createLookupService } from '../services/lookup.service.js';

/**
 * Builds the Express app for the dashboard REST API. Security posture:
 * helmet headers, JSON body cap, Redis-backed signed HttpOnly session cookies,
 * per-IP rate limiting, deny-by-default guild authz, and a fail-closed error
 * handler. Dependencies are injected so it can be built in tests without a live
 * Discord/Mongo/Redis.
 */
export function createApp({ repositories, services, redis, riot }) {
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  // CSP tuned for the SPA: scripts/styles from self (fonts are bundled via
  // @fontsource), champion art from the Data Dragon CDN. 'unsafe-inline' styles
  // are needed for React/GSAP inline style attributes.
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https://ddragon.leagueoflegends.com'],
          fontSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );

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
  // Serve the built SPA (web/dist) if present. Assets are NOT rate-limited.
  const webDist = path.resolve(process.cwd(), 'web', 'dist');
  const hasWeb = fs.existsSync(path.join(webDist, 'index.html'));
  if (hasWeb) {
    app.use(express.static(webDist, { index: false, maxAge: '1h' }));
  }

  app.get('/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

  // Rate-limit the API surface only (not static assets or the SPA shell).
  app.use('/api', apiLimiter);

  const oauth = createDiscordOauth({
    clientId: env.DISCORD_CLIENT_ID,
    clientSecret: env.DISCORD_CLIENT_SECRET,
    redirectUri: env.DISCORD_OAUTH_REDIRECT_URI,
  });
  const authController = createAuthController({ repositories, oauth, config: env });
  const guildsController = createGuildsController({ repositories, services });

  // Public website endpoints (no auth): summoner lookup + champion browser.
  const staticData = createStaticDataService({ redis });
  const lookup = createLookupService({ riot, rank: services.rank, redis });
  const publicController = createPublicController({ lookup, staticData });

  app.use('/api/v1', publicRouter({ controller: publicController }));
  app.use('/api/v1/auth', authRouter({ controller: authController }));
  app.use('/api/v1/guilds', guildsRouter({ controller: guildsController, repositories }));

  // SPA fallback: non-API GETs return index.html so client-side routing works on
  // deep links and refresh.
  if (hasWeb) {
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      return res.sendFile(path.join(webDist, 'index.html'));
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
