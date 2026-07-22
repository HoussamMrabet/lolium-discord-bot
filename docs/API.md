# REST API

Base path: `/api/v1`. Responses are JSON. Errors have the shape
`{ "error": { "code", "message", ... } }`; unexpected errors return a 500 with a
correlation `id` (details are logged server-side, never returned).

Authentication is a **Redis-backed session cookie** (`sid`) established via
Discord OAuth2. Guild endpoints are **deny-by-default**: access requires that the
session user administers the guild (Manage Server, captured at login) **and** the
bot is present in it.

## Health

```
GET /health  ->  { "status": "ok", "uptime": <seconds> }
```

## Auth

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/auth/discord` | Redirects to Discord to authorize (`identify guilds`); sets a CSRF `state`. |
| GET | `/api/v1/auth/discord/callback` | OAuth callback; verifies `state`, creates the session, then redirects to `DASHBOARD_URL` (or returns JSON). |
| GET | `/api/v1/auth/me` | Current user + the guild ids they administer. |
| POST | `/api/v1/auth/logout` | Destroys the session. |

## Guilds

All require an authenticated session. The `:guildId`-scoped routes also require
guild admin access.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/guilds` | Guilds the user manages where the bot is present. |
| GET | `/api/v1/guilds/:guildId/settings` | Guild settings. |
| PATCH | `/api/v1/guilds/:guildId/settings` | Update settings (validated; unknown keys rejected). |
| GET | `/api/v1/guilds/:guildId/players` | Linked players + summoner info. |
| DELETE | `/api/v1/guilds/:guildId/players/:discordUserId/:summonerId` | Unlink an account. |
| GET | `/api/v1/guilds/:guildId/matches?limit=` | Recent tracked games (max 50). |
| GET | `/api/v1/guilds/:guildId/leaderboards?category=&period=` | Compute a leaderboard. |
| GET | `/api/v1/guilds/:guildId/players/:summonerId/stats` | Lifetime stats for a summoner. |

### PATCH settings body

All fields optional; unknown keys are rejected (strict validation).

```json
{
  "channels": { "alerts": "123...", "leaderboard": null },
  "features": { "betting": true, "roleSync": true },
  "recap": { "weekly": true, "hour": 9, "timezone": "Europe/London" },
  "roles": { "GOLD": "role-id", "SILVER": null },
  "streakThresholds": [3, 5, 10],
  "enabledLeaderboards": ["highestRank", "mostWins"],
  "locale": "en-US"
}
```

`roles`: a tier → role-id map; `null` removes a mapping. `channels`: a channel id
or `null` to clear.

### Leaderboard categories

`highestRank` `mostWins` `highestWinRate` `mostLpGained` `longestWinStreak`
`mostGames` `mostDamage` `highestKda` `mostVision` `mostPentakills`

### Periods

`all` (default) `daily` `weekly` `monthly`

## Rate limits

120 requests/min per IP on the API; 20/min on auth endpoints. `429` responses
include standard `RateLimit-*` headers.
