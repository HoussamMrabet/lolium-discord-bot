# Deployment Guide

## Docker Compose (recommended)

The compose stack runs Mongo, Redis, and the four app processes.

```bash
cp .env.example .env
# Fill in DISCORD_TOKEN, DISCORD_CLIENT_ID, RIOT_API_KEY, SESSION_SECRET,
# and (for the dashboard API) DISCORD_CLIENT_SECRET + DISCORD_OAUTH_REDIRECT_URI.
# Leave MONGO_URI / REDIS_URL as-is — compose injects the service URLs.

docker compose -f docker/docker-compose.yml up -d --build
```

Services started: `mongo`, `redis`, `bot`, `scheduler`, `worker`, `api`.

Register slash commands once (from your host, or `docker compose run --rm bot
node src/bot/deploy-commands.js`):

```bash
npm run deploy:commands
```

### Scaling workers

Workers are stateless and scale horizontally on queue depth:

```bash
docker compose -f docker/docker-compose.yml up -d --scale worker=3
```

The distributed Redis rate limiter keeps total Riot throughput safe no matter how
many workers run. The **scheduler must remain a single instance** (it is the poll
leader).

### Single-process mode

For a tiny deployment, run everything in one container:

```bash
docker compose -f docker/docker-compose.yml --profile mono up -d mono
```

## Manual / VM deployment

Run each process with a process manager (systemd, pm2). Point `MONGO_URI` and
`REDIS_URL` at your managed instances.

```bash
NODE_ENV=production node entrypoints/bot.js
NODE_ENV=production node entrypoints/scheduler.js
NODE_ENV=production WORKER_TYPE=all node entrypoints/worker.js   # scale this out
NODE_ENV=production node entrypoints/api.js
```

At deploy time, build indexes explicitly (production disables auto-indexing):

```js
import { connectMongo, syncIndexes } from './src/database/connection.js';
import './src/database/models/index.js';
await connectMongo();
await syncIndexes();
```

## Production checklist

- [ ] `NODE_ENV=production`
- [ ] `COOKIE_SECURE=true` and the API served over HTTPS (behind a TLS proxy)
- [ ] Strong random `SESSION_SECRET` (32+ chars)
- [ ] Secrets provided via the environment/secret manager — **never** in `.env` in
      the image or in `.env.example`
- [ ] MongoDB and Redis secured (auth + network isolation), with backups
- [ ] Indexes synced (`syncIndexes()`)
- [ ] A single scheduler instance; workers scaled as needed
- [ ] Log aggregation consuming pino JSON on stdout
- [ ] Riot production key (dev keys expire every 24h)

## CI/CD

`.github/workflows/ci.yml` runs on push/PR to `main`: `npm ci` → ESLint → Jest
(with Mongo + Redis service containers) → `npm audit`. On `main`, it also builds
the Docker image to validate the Dockerfile.
