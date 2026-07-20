# discord-lol-bot

A production-grade Discord bot that tracks League of Legends players via the Riot
Games API and posts match alerts, LP/rank tracking, promotion alerts, server
leaderboards, streaks, automatic rank roles, match betting, and daily/weekly
recaps — with a REST API ready for a future web dashboard.

Built to scale to thousands of Discord guilds and tens of thousands of linked
Riot accounts. See **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** for the full
design and the reasoning behind every decision.

> Status: **under construction** — being built in reviewed phases.
> Done: Phase 1 (architecture) · Phase 2 (project init, config, core).

## Tech stack

Node.js 22+ (ES Modules) · discord.js v14 · MongoDB + Mongoose · Redis (ioredis) ·
BullMQ · Express · pino · zod · axios · Docker.

## Requirements

- Node.js **>= 22**
- MongoDB and Redis (locally, or via the provided Docker Compose stack — added in
  a later phase)
- A Discord application + bot token
- A Riot Games API key

## Quick start (development)

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
#    then fill in DISCORD_TOKEN, DISCORD_CLIENT_ID, RIOT_API_KEY, etc.

# 3. Verify configuration loads
npm run config:check

# 4. Lint & test
npm run lint
npm test
```

Runtime entrypoints (`npm run start:bot`, `start:worker`, `start:scheduler`,
`start:api`, or `npm start` for the all-in-one `mono` mode) come online in the
implementation phases that build them.

## Environment variables

Every variable is documented in [`.env.example`](.env.example) and validated at
boot by [`src/config/env.js`](src/config/env.js). A missing or malformed required
value stops the process immediately (fail-fast, fail-closed).

## Project layout

See [docs/ARCHITECTURE.md §10](docs/ARCHITECTURE.md). In short: one codebase, four
process types (bot · scheduler · workers · api) sharing a service/repository/
config core.

## License

Private / unreleased.
