# Setup Guide

This guide covers the Discord application, the Riot API key, and every
environment variable.

---

## 1. Discord application & bot

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
   and **New Application**.
2. **Bot** tab → **Reset Token** → copy it → this is `DISCORD_TOKEN`.
   - Leave the **Message Content Intent OFF** — the bot never reads message text.
   - The bot uses only the (non-privileged) `Guilds` gateway intent.
3. **OAuth2** tab:
   - Copy the **Client ID** → `DISCORD_CLIENT_ID`.
   - Copy the **Client Secret** → `DISCORD_CLIENT_SECRET` (needed only for the
     dashboard API). Treat this like a password.
   - Under **Redirects**, add your callback URL, e.g.
     `http://localhost:3000/api/v1/auth/discord/callback` → set the same value as
     `DISCORD_OAUTH_REDIRECT_URI`.
4. **Invite the bot** with an OAuth2 URL using scopes `bot applications.commands`
   and permissions: **Send Messages**, **Embed Links**, **Attach Files**, and
   **Manage Roles** (required only for automatic rank roles). For rank roles to
   work, the bot's highest role must be **above** the tier roles it manages.

> During development, set `DISCORD_DEV_GUILD_ID` to a test server's id so
> `npm run deploy:commands` registers commands there instantly (global commands
> can take up to an hour to propagate).

## 2. Riot Games API key

1. Sign in at the [Riot Developer Portal](https://developer.riotgames.com/).
2. Copy your **Development API Key** → `RIOT_API_KEY` (regenerates every 24h), or
   register a product for a **Production Key** (higher limits).
3. No code change is needed to move from a dev key to a production key — the rate
   limiter reads Riot's live `X-App-Rate-Limit` headers and adapts automatically.

## 3. MongoDB & Redis

- **Local:** install MongoDB and Redis, or use the Docker Compose stack (which
  provides both).
- Set `MONGO_URI` and `REDIS_URL`. With Docker Compose these are injected
  automatically (pointing at the `mongo`/`redis` services).

## 4. Environment variables

Copy `.env.example` to `.env` and fill it in.

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | no | `development` \| `test` \| `production` |
| `LOG_LEVEL` | no | pino level (`info` default) |
| `RUN_MODE` | no | `mono` \| `bot` \| `scheduler` \| `worker` \| `api` |
| `DISCORD_TOKEN` | **yes** | Bot token |
| `DISCORD_CLIENT_ID` | **yes** | Application (client) id |
| `DISCORD_CLIENT_SECRET` | API only | OAuth2 client secret |
| `DISCORD_OAUTH_REDIRECT_URI` | API only | OAuth2 callback URL |
| `DISCORD_DEV_GUILD_ID` | no | Register commands to one guild instantly (dev) |
| `SHARD_COUNT` | no | `auto` or an integer |
| `RIOT_API_KEY` | **yes** | Riot API key |
| `RIOT_MAX_RETRIES` | no | Transient-failure retries (default 3) |
| `MONGO_URI` | **yes** | MongoDB connection string |
| `MONGO_DB_NAME` | no | Overrides the DB name in the URI |
| `REDIS_URL` | **yes** | Redis connection string |
| `API_PORT` | no | REST API port (default 3000) |
| `API_BASE_URL` | no | Public base URL of the API |
| `DASHBOARD_URL` | no | SPA origin (enables credentialed CORS + post-login redirect) |
| `SESSION_SECRET` | **yes** | Signs session cookies (32+ random chars) |
| `COOKIE_SECURE` | no | `true` behind HTTPS |
| `WORKER_TYPE` | no | Which queue a worker consumes (`all` default) |
| `WORKER_CONCURRENCY` | no | Jobs processed in parallel per worker (default 5) |
| `POLL_TICK_INTERVAL_MS` | no | Scheduler tick interval (default 10000) |

Validate everything loads:

```bash
npm run config:check
```

## 5. In-server configuration

Once the bot is in a server, an admin (Manage Server) runs:

```
/setup alerts:#alerts leaderboard:#leaderboards recaps:#recaps
/settings feature betting on
/settings role set tier:GOLD role:@Gold
/link riot-id:Faker#KR1 region:kr
```
