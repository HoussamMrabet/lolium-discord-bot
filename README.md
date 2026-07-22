# discord-lol-bot

A production-grade Discord bot that tracks League of Legends players via the Riot
Games API and automatically posts match alerts, LP/rank tracking, promotions,
server leaderboards, streaks, automatic rank roles, fake-gold match betting, and
daily/weekly/monthly recaps with charts — plus a REST API (Discord OAuth) ready
for a web dashboard.

Built to scale to **thousands of Discord servers and tens of thousands of linked
Riot accounts**. Every design decision is documented in
**[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.

> The whole system is organized around one constraint — the Riot API rate limit —
> via global account deduplication (poll once, fan out to many guilds), permanent
> match caching, an adaptive Redis-ZSET poll scheduler, and a distributed rate
> limiter.

## Features

- **Account linking** — `/link` a Riot account; multiple accounts per user; the
  same account tracked across many guilds is polled from Riot only once.
- **Match alerts** — rich embeds (KDA, LP, damage, CS, vision, spells, keystone,
  MVP) with template-based funny descriptions (no AI).
- **LP & rank tracking** — exact LP deltas via a monotonic `absoluteLp` encoding;
  promotion/demotion alerts across every tier.
- **Leaderboards** — 10 categories, auto-updated in place, plus on-demand
  `/leaderboard`.
- **Win/loss streaks** — configurable milestone alerts.
- **Automatic rank roles** — map tiers to Discord roles; synced on rank change.
- **Match betting** — fake gold on live games (winner / int / top damage / most
  deaths), atomic payouts, seasons.
- **Recaps + graphs** — daily/weekly/monthly, timezone-aware, with server-side
  PNG charts.
- **Statistics** — `/stats` and `/history` (champion pool, win rates, averages).
- **REST API + Discord OAuth** — deny-by-default guild management for a future
  dashboard.

## Tech stack

Node.js 22+ (ES Modules) · discord.js v14 · MongoDB + Mongoose · Redis (ioredis) ·
BullMQ · Express · pino · zod · axios · @napi-rs/canvas · Docker.

## Architecture at a glance

One codebase, four process types sharing a service/repository/config core:

| Process | Entrypoint | Role |
|---------|-----------|------|
| **Bot** | `entrypoints/bot.js` | Discord gateway (sharded); slash commands → validate → enqueue |
| **Scheduler** | `entrypoints/scheduler.js` | Adaptive poll loop + leaderboard/recap scheduling |
| **Workers** | `entrypoints/worker.js` | BullMQ consumers (fetch Riot, process matches, dispatch, roles, leaderboards, recaps) |
| **API** | `entrypoints/api.js` | Express REST + Discord OAuth |
| _mono_ | `entrypoints/mono.js` | All of the above in one process (small deployments) |

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full design, data model,
and sequence diagrams.

## Requirements

- Node.js **>= 22**
- MongoDB and Redis (locally or via the provided Docker Compose stack)
- A Discord application + bot token — see [docs/SETUP.md](docs/SETUP.md)
- A Riot Games API key — see [docs/SETUP.md](docs/SETUP.md)

## Quick start (local)

```bash
npm install
cp .env.example .env          # then fill in the values (see docs/SETUP.md)
npm run config:check          # verify configuration loads

# register slash commands (guild-scoped instantly if DISCORD_DEV_GUILD_ID is set)
npm run deploy:commands

# run everything in one process (needs Mongo + Redis running)
npm start
```

Or run each process separately:

```bash
npm run start:bot
npm run start:scheduler
npm run start:worker        # WORKER_TYPE=all by default
npm run start:api
```

## Quick start (Docker)

```bash
cp .env.example .env          # fill in secrets; leave Mongo/Redis URLs as-is
docker compose -f docker/docker-compose.yml up -d --build
```

This starts Mongo, Redis, and the bot/scheduler/worker/api services. See
[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Commands

`/link` `/unlink` `/profile` `/rank` `/history` `/stats` `/leaderboard`
`/betting` `/setup` `/channel` `/settings` `/admin` `/help` `/ping`

## REST API

Base path `/api/v1`. Discord OAuth login, then deny-by-default guild management.
See [docs/API.md](docs/API.md).

## Development

```bash
npm run lint         # ESLint
npm test             # Jest (unit + integration via mongodb-memory-server)
npm run format       # Prettier
```

## Environment variables

Every variable is documented in [.env.example](.env.example) and validated at
boot by [src/config/env.js](src/config/env.js) — a missing/invalid required value
stops the process immediately (fail-fast, fail-closed). See
[docs/SETUP.md](docs/SETUP.md) for what each one is and where to get it.

> **Never commit `.env`.** Keep `.env.example` with placeholder values only.

## Project layout

See [docs/ARCHITECTURE.md §10](docs/ARCHITECTURE.md).

## License

Private / unreleased.
