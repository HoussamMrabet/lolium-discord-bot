# Architecture & System Design

> League of Legends tracking Discord bot (a "dorans.bot"-style system).
> Target scale: thousands of Discord guilds, tens of thousands of linked Riot
> accounts, a path to 100,000+ users.

This document is the source of truth for **why** the system is shaped the way it
is. Read it before changing any structural decision.

---

## 0. The one constraint that dictates everything

> **The Riot API is the bottleneck — not Discord, not Mongo, not CPU.**

A personal Riot key allows roughly **20 req/s and 100 req/2min, per routing
region**. A production key is higher but still finite and rate-limited per region
and per method. If we naïvely polled tens of thousands of accounts every minute,
we would need thousands of requests per second and be `429`-throttled into
uselessness.

**Every major design choice exists to minimize and smooth Riot API calls.** The
three levers are:

1. **Global deduplication** — the same Riot account tracked in 500 servers is
   polled from Riot **once**, then fanned out to 500 Discord channels. This is
   why `Summoner` (global identity) and `Player` (per-guild link) are separate
   collections.
2. **Permanent caching** — a finished match is immutable. We fetch it once, store
   it in Mongo forever, and never fetch it again.
3. **Adaptive, staggered scheduling** — we don't poll everyone equally or
   simultaneously. A dormant player is checked hourly; a player likely in a game
   every ~2 minutes; and checks are spread across time so we never spike.

Keep this lens in mind — everything below refers back to it.

---

## 1. High-level topology (the deployables)

The system is **one codebase, four process types**. They share the domain layer,
models, config, and clients, but run as independent entrypoints so each scales on
its own axis and a failure in one never takes down another.

```
                         +---------------------------------------------+
                         |                 DISCORD                     |
                         |   Gateway (WS)          REST API (HTTPS)     |
                         +-------^-----------------------^-------------+
                                 | interactions/events   | post embeds,
                                 |                       | assign roles
             +-------------------+------+        +-------+---------------+
   shards -> | (1) BOT (discord.js)     |        | (3) WORKERS (BullMQ)  |
             |  - slash commands        |        |  - riot-fetch         |
             |  - buttons/modals        |        |  - match-process      |
             |  - validates + enqueues  |        |  - notify-dispatch ---+ (uses @discordjs/rest,
             +------+-------------------+        |  - role-sync            cross-shard, no gateway)
                    | enqueue jobs               |  - leaderboard-compute
                    v                            |  - recap-generate
             +--------------+                    +---+-------------^------+
             |     REDIS    |<---------------------- |             | read/write
             | - BullMQ     |   consume/produce      | Riot calls  |
             | - cache      |                        v (via limiter)v
             | - limiter    |               +--------------+   +----------+
             | - poll ZSET  |               |  RIOT API    |   | MONGODB  |
             | - locks/sess |               | (per region) |   |(canonical|
             +------^-------+   schedule     +--------------+   |  store)  |
                    | repeatable jobs                          +----^-----+
             +------+--------+                                      |
             | (2) SCHEDULER |  +---------------------------+       |
             | - poll due    |  | (4) REST API (Express)     |------+
             | - recaps/roles|  | - Discord OAuth dashboard  |  read-heavy,
             | - season reset|  | - guild/player/match CRUD  |  Redis-cached
             +---------------+  +---------------------------+

  Data Dragon / Community Dragon CDN -> static assets (champ/item/rune icons)
  NEVER counts against Riot rate limit.
```

### The four processes

| # | Process | Responsibility | Scales on | Entry point |
|---|---------|----------------|-----------|-------------|
| 1 | **Bot** | Discord gateway: receive slash commands / buttons / modals, validate input, respond, enqueue heavy work | # of guilds (via **sharding**) | `entrypoints/bot.js` (ShardingManager) |
| 2 | **Scheduler** | Emits repeatable jobs: enqueue "due" polls, trigger recaps, role reconciliation, betting resolution sweeps, season resets | Singleton (leader-locked) | `entrypoints/scheduler.js` |
| 3 | **Workers** | Consume queues: fetch Riot, process matches, dispatch embeds, sync roles, compute leaderboards/recaps | **Queue depth** (horizontal) | `entrypoints/worker.js` (queue selected by `WORKER_TYPE`) |
| 4 | **API** | Express REST + Discord OAuth for the future dashboard | HTTP traffic | `entrypoints/api.js` |

**Why split the Bot from the Workers?** The discord.js gateway connection is
heartbeat-sensitive. If we do blocking Riot fetches or match crunching in the
same event loop, we risk missing heartbeats → shard disconnects → the bot appears
offline. The bot process stays *thin*: parse → validate → enqueue → acknowledge.
All slow, failure-prone work lives in workers that can crash, retry, and scale
without touching the gateway.

**The key decoupling — outbound uses REST, not the gateway.**
Notification/role workers post via `@discordjs/rest` with the bot token, **not**
through a gateway client. A worker can post to *any* channel in *any* guild
regardless of which shard owns that guild. Outbound dispatch is therefore
completely independent of shard topology and scales freely. The gateway client is
used **only** for *inbound* (interactions/events) and replying to those
interactions.

**Small-scale collapse.** For a hobby deployment you don't want four containers.
Each entrypoint is independent, so a single "mono" container can run all four in
one process behind a flag. Same code, cheaper footprint — this keeps it
maintainable *and* affordable across scales.

---

## 2. Discord layer

- **Sharding from day one.** Discord *requires* sharding past ~2,500 guilds.
  `ShardingManager` spawns N shards; `Guild` documents record `shardId` for
  observability. Because outbound is REST-based, sharding never complicates
  posting.
- **Minimal intents (least privilege, OWASP A02).** Slash commands + roles need
  only `Guilds` and `GuildMembers` (a privileged intent we enable, justified for
  role assignment). We deliberately **do not** request the `MessageContent`
  privileged intent — we never read message text. Smaller attack surface, easier
  Discord verification.
- **Interactions, not prefix commands.** All UX is slash commands + buttons /
  select menus / modals (betting slips, setup wizard). Discord-native validation,
  permission gating, and autocomplete (champion / region).
- **Command/event auto-loading.** Commands and events are file-modules discovered
  by a loader at boot; adding a command = adding a file. No central switch
  statement to edit.

---

## 3. Riot layer — the heart of the system

Five sub-components enforce the "one constraint."

### 3.1 Routing
Riot has **platform routes** (`na1`, `euw1`, `kr`, …) for summoner/league/
spectator and **regional routes** (`americas`, `europe`, `asia`, `sea`) for
account-v1 and match-v5. `riot/routing.js` converts a stored `region` (e.g.
`na1`) to its regional route (`americas`) and holds per-region metadata. Getting
this wrong is the #1 cause of 404s, so it is centralized and unit-tested.

### 3.2 Distributed rate limiter
Because we run **many** worker replicas but Riot limits are **global per region**,
the limiter is shared, not per-process.

- **Redis-backed token bucket** (atomic Lua script) keyed
  `ratelimit:{region}:app` and `:method`. Every Riot call acquires a token first.
- Buckets are **seeded from Riot's own response headers** — `X-App-Rate-Limit`,
  `X-Method-Rate-Limit`, `X-App-Rate-Limit-Count`. We honor Riot's live numbers
  rather than hardcoding, so upgrading from a personal to a production key needs
  zero code change.
- **`429` handling:** read `Retry-After`, **pause that region's queue** for that
  duration, then retry. One throttled region never blocks the others.
- Two safety layers: BullMQ per-region queue limiter (coarse) + Redis token
  bucket honoring headers (fine). Belt and suspenders — a Riot ban for repeated
  violations is catastrophic.

### 3.3 Caching (Redis hot cache + Mongo cold store)

| Data | Endpoint | Cache | TTL | Why |
|------|----------|-------|-----|-----|
| Riot ID ↔ PUUID | account-v1 | Redis + Mongo | 24 h | PUUID is permanent; Riot ID rarely changes |
| Summoner (level, icon, id) | summoner-v4 | Redis | 12 h | Changes slowly |
| League entries (tier/div/LP) | league-v4 | Redis | 60–120 s | Only to dedupe bursts; **DB is source of truth for deltas** |
| Match IDs by PUUID | match-v5 ids | Redis | 30–60 s | Highest-frequency call; short cache kills duplicate polls |
| **Match details** | match-v5 by id | **Mongo (permanent)** + Redis hot | ∞ | **Immutable — fetch once, keep forever, never re-fetch** |
| Champions/items/runes/spells | Data Dragon CDN | Memory + Redis | until version bump | Static; served from CDN, **never** a Riot-rate-limited call |

The permanent match store is the biggest saver: we only ever pay Riot for the
*first* sighting of each match.

### 3.4 Adaptive, staggered polling scheduler
A **Redis sorted set** used as a time-ordered due-queue answers "when do we check
50k accounts without hammering Riot or scanning Mongo?"

- `ZADD poll:due <nextCheckAt> <summonerId>` — every summoner sits in a ZSET
  scored by its next check time.
- The scheduler ticks every ~10 s: `ZRANGEBYSCORE poll:due -inf now` → those are
  due → enqueue a poll job for each → reschedule with a new score based on its
  **poll tier**. O(log n) extraction; trivially handles 100k members.
- **Poll tiers** (adaptive cadence):

  | Tier | Meaning | Cadence |
  |------|---------|---------|
  | `active` | played very recently / likely in a game | ~2–3 min |
  | `idle` | plays regularly but not right now | ~15–30 min |
  | `dormant` | no games in days | ~1–3 h |

  A player's tier is promoted when a new match is detected and decays over time
  with no activity.
- **Staggering:** the initial score is offset by `hash(puuid) % interval` so 50k
  accounts don't all come due on the same tick — a smooth stream, not a spike.

### 3.5 Riot client
A single `axios` instance with interceptors: inject the API key, acquire a
rate-limit token, attach a correlation id, record latency to pino, and translate
Riot error codes into typed domain errors (`RiotNotFoundError`,
`RiotRateLimitError`, `RiotServerError`) so callers branch on meaning, not HTTP
numbers. Endpoint wrappers (`account`, `summoner`, `league`, `match`, `spectator`)
are the *only* place raw Riot URLs exist.

---

## 4. The core pipeline — data flow of a match alert

From "player finished a game" to "embed appears in 500 servers":

```
Scheduler --(every ~10s: ZRANGEBYSCORE due)--> Redis ZSET
Scheduler --enqueue poll(summonerId) per-region--> riot-fetch worker
riot-fetch --acquire token--> Rate limiter (Redis)
riot-fetch --GET match ids by puuid (cache 30-60s)--> Riot API
riot-fetch --which ids are new? (not in Match)--> MongoDB
  if new match:
    riot-fetch --enqueue process(matchId)--> match-process worker
    match-process --Match stored? if not, acquire token + GET detail--> Riot API
    match-process --store Match (permanent)--> MongoDB
    match-process --GET league entries (if ranked, cache 60s)--> Riot API
    match-process --compute LP delta, RankHistory, streak, promotion--> MongoDB
    match-process --write PlayerMatch (per tracked participant)--> MongoDB
    match-process --find Players linking this Summoner (fan-out)--> MongoDB
      for each guild tracking this player:
        match-process --enqueue notify(guildId, matchId, dedupeKey)--> notify-dispatch
    match-process --enqueue leaderboard-compute(affected guilds)-->
    match-process --enqueue role-sync (if rank crossed a tier)-->
notify-dispatch --NotificationQueue upsert(dedupeKey) idempotency guard--> MongoDB
  if not already sent:
    notify-dispatch --POST embed to guild alert channel--> Discord REST
    notify-dispatch --mark sent(messageId)--> MongoDB
Scheduler --ZADD reschedule(summonerId, nextCheckAt by tier)--> Redis ZSET
```

**Two correctness guarantees baked into this flow:**

1. **Exactly-once alerts.** Even across retries, restarts, and duplicate jobs,
   each `(type, guildId, matchId, summonerId)` produces at most one Discord post,
   enforced by a unique `dedupeKey` on the `NotificationQueue` collection. This is
   the outbox pattern — BullMQ gives at-least-once delivery; the unique key
   upgrades it to effectively-once.
2. **Poll once, fan out many.** One Riot fetch of a match serves every guild
   tracking any of its participants. The `Player` join collection makes this
   fan-out cheap.

---

## 5. Data model (MongoDB / Mongoose)

Normalization principle: **immutable global facts** (a Summoner's identity, a
Match) are stored once; **relationships** (who-tracks-whom-where) and **derived
per-player facts** (LP deltas, stats) reference them. This enables the dedup that
saves Riot budget.

### 5.1 Identity & relationships

**`Guild`** — one per Discord server.
```
_id: guildId (snowflake string), name, iconHash, ownerId, joinedAt,
active: bool, shardId, locale, premiumTier
```

**`GuildSettings`** — 1:1 with Guild; separate so it is small and independently
cacheable in Redis.
```
guildId (unique ref),
channels: { alerts, leaderboard, recaps, betting },
roles: { IRON:roleId, ..., CHALLENGER:roleId },   // tier -> Discord role
regions: [na1, euw1...],                           // which platforms this guild tracks
recap: { daily:bool, weekly:bool, monthly:bool, timezone, hour },
features: { alerts, promotions, streaks, betting, roleSync },
streakThresholds: [3,5,10],
locale
```

**`Summoner`** — GLOBAL, one per real Riot account (deduped across all guilds).
*The anti-rate-limit collection.*
```
_id, puuid (UNIQUE), platform (na1), regionalRoute (americas),
riotId: { gameName, tagLine }, summonerLevel, profileIconId,
ranked: {                             // current snapshot per queue
  RANKED_SOLO_5x5: { tier, division, lp, absoluteLp, wins, losses },
  RANKED_FLEX_SR:  { ... }
},
lastMatchId, lastMatchStartAt,
pollTier: active|idle|dormant, nextCheckAt, lastPolledAt,
streak: { current: +N|-N, longestWin, longestLoss }
```

**`Player`** — the JOIN between a Discord user and a Summoner *within a guild*.
Enables "multiple accounts per user" **and** "same account in many guilds tracked
once."
```
guildId, discordUserId, summonerId (ref Summoner),
verified: bool, primary: bool, nickname, createdAt
UNIQUE (guildId, discordUserId, summonerId)
INDEX (summonerId)   // fan-out lookups
INDEX (guildId)      // guild management / leaderboards
```

**`User`** (optional, global) — Discord profile for dashboard auth across guilds:
`discordUserId, tag, avatar, lastLoginAt`.

### 5.2 Match & performance data

**`Match`** — immutable canonical record, fetched from Riot exactly once.
```
_id: matchId (NA1_123...),
queueId, gameVersion, platformId, gameCreation, gameStartAt, gameEndAt, gameDuration,
participants: [                       // trimmed to fields we render + need for MVP/betting
  { puuid, championId, championName, teamId, win,
    kills, deaths, assists, totalDamageToChampions, cs, csPerMin,
    visionScore, gold, items:[7], summonerSpells:[2], perks:{...},
    pentaKills, quadraKills, tripleKills, role, lane }
]
INDEX (participants.puuid, gameEndAt)
```
*Trade-off:* we store all 10 participants (not just the tracked one) but trimmed
to needed fields — required for MVP calc, team damage-share, and betting markets
like "most deaths on the team." Full raw payloads are optional/off by default to
control storage.

**`PlayerMatch`** — per tracked summoner, per match; the fast read model for
stats/leaderboards/recaps (so we never scan full `Match` docs).
```
summonerId (ref), matchId (ref), gameEndAt, queueId,
championId, win, kills, deaths, assists, kda, damage, cs, csPerMin,
visionScore, killParticipation, multikills, role,
lpDelta, absoluteLpAfter, performanceBucket, mvp: bool
UNIQUE (summonerId, matchId)
INDEX (summonerId, gameEndAt desc)
```

### 5.3 Progression ledgers

**`LPHistory`** — the **event/delta ledger**: "what changed, tied to which match."
Answers *"how much LP did I gain this week?"* (sum deltas).
```
summonerId, queueType, matchId, at,
lpBefore, lpAfter, delta, absoluteBefore, absoluteAfter, result: W|L
INDEX (summonerId, queueType, at)
```

**`RankHistory`** — the **state snapshot** log: "what was my standing on date X,"
including non-match events. Answers *"draw my rank graph"* and drives promotion/
demotion detection.
```
summonerId, queueType, at, tier, division, lp, absoluteLp, wins, losses,
source: match|decay|refresh, matchId?
INDEX (summonerId, queueType, at)
```
*Why both?* LPHistory is a financial-style ledger of match-attributed changes;
RankHistory is a time series of *positions* that also captures decay and
off-match drift. Separate collections make each query trivial and correct instead
of one overloaded collection with null-ridden rows.

**The LP math — `absoluteLp` encoding.** Division boundaries make raw LP deltas
meaningless (Gold IV 98 → Gold III 12 is a *gain*, not a −86 loss). We encode
every rank into a single monotonic integer:
```
absoluteLp = tierBase(tier) + divisionOffset(division) + lp
   e.g. IRON IV = 0..99, IRON III = 100..199, ... GOLD I = 2700..2799 ...
   Master+/apex tiers = continuous LP on top of a fixed base.
```
Deltas, leaderboards ("Most LP Gained"), and graphs all operate on `absoluteLp`,
so they're correct across every promotion and demotion. This lives in
`utils/ladder.js` and is heavily unit-tested.

### 5.4 Features

**`Leaderboard`** — precomputed per guild + category + period; reads are O(1) and
the posted message is edited in place.
```
guildId, category, period: all|daily|weekly|monthly|season,
entries: [{ summonerId, discordUserId, value, rank }],
message: { channelId, messageId }, computedAt
UNIQUE (guildId, category, period)
```
Categories: `highestRank, mostWins, highestWinRate, mostLpGained,
longestWinStreak, mostGames, mostDamage, highestKda, mostVision, mostPentakills`.
Hot queries use a Redis ZSET; the Mongo doc holds durable/posted state.

**`Bet`** + **`BettingProfile`** — fake-gold wagering.
```
Bet: guildId, gameId|matchId, market: winner|inter|topDamage|mostDeaths,
     createdBy, subjectSummonerId?, prediction, stake,
     status: open|won|lost|void, payout, placedAt, resolvedAt
BettingProfile: guildId, discordUserId, balance, seasonId,
     lifetimeWon, lifetimeStaked, currentStreak
```
Bets are money-like → **atomic `$inc` updates and idempotent resolution** (a bet
leaves `open` exactly once, guarded by status + matchId). Betting closes at game
start (window lock). Season reset zeroes balances but archives to history.

**`RoleSync`** — audit log of applied role changes (config lives in
`GuildSettings.roles`).
```
guildId, discordUserId, action: add|remove, roleId, tier, reason,
at, success, error?
```

**`NotificationQueue`** — durable outbox for every Discord message, enforcing
exactly-once posting.
```
guildId, channelId, type, payloadRef, dedupeKey (UNIQUE),
status: pending|sent|failed|skipped, attempts, lastError,
scheduledFor, sentAt, messageId
```

### 5.5 Index summary
Every high-frequency access path has a covering index: `Summoner.puuid` (unique),
`Player(guildId,discordUserId,summonerId)` unique + `Player.summonerId` for
fan-out, `PlayerMatch(summonerId, gameEndAt)`, `Match.participants.puuid`,
`*History(summonerId, queueType, at)`, `Leaderboard(guildId,category,period)`
unique, `NotificationQueue.dedupeKey` unique. The scheduler's due-set lives in
Redis (ZSET), not Mongo, so the hottest loop never touches the database.

---

## 6. Queue topology (BullMQ + Redis)

Distinct queues = isolated failure domains, independent scaling, per-queue retry
policy.

| Queue | Producer | Consumer work | Retry / backoff |
|-------|----------|---------------|-----------------|
| `riot-fetch:{region}` | Scheduler | Fetch match ids / details; rate-limited per region | Exponential, honor `Retry-After` |
| `match-process` | riot-fetch | Persist match, compute LP/rank/streak, fan out | Exponential ×5 → DLQ |
| `notify-dispatch` | match-process | Post embeds via Discord REST (idempotent) | Exponential; 429 → delay |
| `role-sync` | match-process / scheduler | Diff + apply Discord roles | Exponential; permission errors → skip+log |
| `leaderboard-compute` | match-process / scheduler | Recompute + edit leaderboard messages | Standard |
| `recap-generate` | scheduler | Aggregate + render graph PNGs + post | Standard |
| `dead-letter` | any worker on final failure | Park for inspection / manual replay | — |

**Error recovery:** every job gets bounded exponential-backoff retries; terminal
failures move to a **dead-letter queue** with full context for inspection and
manual replay. Riot `429`s pause the region rather than fail. Discord `429`s delay
the specific job. Nothing is silently dropped, and no failure cascades across
queues.

---

## 7. Redis responsibilities (one store, seven jobs)

1. **BullMQ backend** (queues, delayed jobs, repeatable jobs)
2. **Response cache** (Riot payloads, per §3.3 TTLs)
3. **Distributed rate limiter** (Lua token buckets per region)
4. **Poll scheduler ZSET** (`poll:due`)
5. **Hot leaderboard ZSETs**
6. **API session store** (OAuth sessions)
7. **Distributed locks** (`SET NX PX`) — single active scheduler ("leader") and
   guards against duplicate match processing

> BullMQ and the raw cache use **separate ioredis connections** (BullMQ needs
> `maxRetriesPerRequest: null` and blocking commands; cache wants normal
> behavior). The connection factory in `core/redis.js` hands out the right one
> per use.

---

## 8. REST API + Dashboard readiness

Express app, deliberately read-heavy and cache-backed, exposing what a future
React dashboard needs — **no frontend built now, just the contract.**

- **Auth:** Discord OAuth2 authorization-code flow with a `state` param (CSRF) →
  fetch the user's guilds → intersect with (guilds where the user has *Manage
  Server*) ∩ (guilds where the bot is present). Session stored server-side in
  Redis; cookie is signed, `HttpOnly`, `Secure`, `SameSite`.
- **Endpoints (versioned `/api/v1`):**
  - `GET /guilds` — manageable guilds
  - `GET/PATCH /guilds/:id/settings` — channels, roles, features
  - `GET /guilds/:id/players` · `POST/DELETE` — manage links
  - `GET /guilds/:id/matches` · `GET /guilds/:id/leaderboards`
  - `GET /guilds/:id/players/:summonerId/stats`
  - `GET /auth/discord` · `GET /auth/discord/callback` · `POST /auth/logout`
- **Access control is deny-by-default (OWASP A01).** Middleware verifies, on
  **every** request, that the session user actually administers the target guild
  — re-checked against our DB (and Discord when stale), never trusting a guild id
  from the client. Ownership is verified, not assumed.

---

## 9. Cross-cutting concerns

**Configuration** — `config/` loads `.env` via dotenv and **validates it with a
schema at boot** (zod). Missing/invalid Riot key, bot token, Mongo/Redis URL, or
OAuth secret → the process **fails fast and closed**, never boots half-configured.
Every guild's runtime config is `GuildSettings` with sane defaults created on
guild join.

**Dependency Injection** — a **composition root** wires clients → repositories →
services and injects them, rather than modules `import`-ing singletons directly.
This makes services unit-testable (swap a repo for a fake). Lightweight factory
functions, not a heavy framework — DI where it earns its keep.

**Repository pattern** — services never touch Mongoose models directly; they go
through repositories (`summonerRepo`, `playerRepo`, …). Persistence details stay
swappable and mockable; no query logic leaks into business logic.

**Service layer** — all domain logic (linking, matchProcessing, lp, ranks,
streaks, leaderboards, betting, roles, recaps, stats, notifications) lives in
framework-agnostic services. Commands, workers, and API controllers are thin
adapters calling the same services. **Zero duplicated business logic** across the
three entry surfaces.

**Embeds** — a dedicated `embeds/` module with a shared design system: consistent
brand colors, tier-colored accents, green/red LP coloring, champion/item/rune/
spell icons from Data Dragon, reusable builders (`matchEmbed`, `rankEmbed`,
`leaderboardEmbed`, `recapEmbed`). One place owns the look.

**Funny descriptions — templates, no AI.** A pure function classifies each
performance into a bucket (`hardCarry`, `int`, `chokedLead`, `visionGod`,
`afkFarm`, `comeback`, …) from thresholds on KDA, damage share, kill
participation, CS/min, and result, then picks a line from a **data file** of
templates with placeholders (`{name}`, `{champion}`, `{deaths}`). Seeded by
`matchId+puuid` so re-renders are stable. Non-devs can add lines without touching
code; trivially unit-testable.

**Logging (pino)** — structured JSON logs with child loggers per module and a
correlation id threaded through interaction → job → Riot call → Discord post, so
one player's alert can be traced end-to-end. We log Riot calls + latency,
rate-limit events, Discord events, errors with context, and performance timings.
No secrets or PII in logs (OWASP A09).

**Security (OWASP Top 10:2025)** — deny-by-default authz with per-request
ownership checks (A01); env/vault secrets, minimal intents (A02); pinned deps +
`npm audit` in CI (A03); TLS + signed HttpOnly cookies (A04); allowlist
validation of every Discord option and API param — regions, queues, snowflake
formats, Riot ID shape, numeric ranges (A05); rate-limited auth + betting
(A06/A07); idempotent, atomically-resolved bets and exactly-once notifications
(A08); security-event logging (A09); fail-closed error handler that returns an
error id, never a stack trace (A10). **Never trust Discord or dashboard input.**

**Testing (Jest)** — unit tests for pure logic (ladder math, performance buckets,
template picker, LP deltas, streak/promotion detection); integration tests for
repositories/services against `mongodb-memory-server`; Riot HTTP mocked with
`nock`; Redis via a test container. Workers tested by feeding jobs and asserting
DB + dispatch effects.

**CI/CD (GitHub Actions)** — on PR: install (locked deps) → ESLint → Jest (with
Mongo + Redis service containers) → `npm audit`; on main: build and push the
Docker image.

**Docker** — one multi-stage `Dockerfile` (small runtime image, non-root user),
and `docker-compose.yml` wiring mongo + redis + bot + scheduler + worker(s) + api
with healthchecks and named volumes. The same image runs any entrypoint via
command override.

---

## 10. Folder structure

```
discord-bot/
├─ entrypoints/
│  ├─ bot.js            # ShardingManager -> Discord gateway client
│  ├─ scheduler.js      # repeatable jobs (leader-locked)
│  ├─ worker.js         # BullMQ worker; WORKER_TYPE selects the queue
│  └─ api.js            # Express server
├─ src/
│  ├─ config/           # env load + zod validation, constants, regions, features
│  ├─ core/             # logger, errors, DI container, redis.js, mongo.js
│  ├─ database/
│  │  ├─ connection.js
│  │  ├─ models/        # Mongoose schemas (§5)
│  │  └─ repositories/  # repository pattern over models
│  ├─ riot/
│  │  ├─ client.js      # axios + interceptors
│  │  ├─ rateLimiter.js # Redis Lua token bucket
│  │  ├─ routing.js     # platform <-> regional route map
│  │  ├─ cache.js       # response caching
│  │  └─ endpoints/     # account, summoner, league, match, spectator
│  ├─ services/         # linking, matchProcessing, lp, ranks, streaks,
│  │                    #   leaderboards, betting, roles, recaps, stats, notifications
│  ├─ embeds/
│  │  ├─ builders/      # matchEmbed, rankEmbed, leaderboardEmbed, recapEmbed
│  │  ├─ assets.js      # Data Dragon icon URL resolvers
│  │  └─ templates/     # funny-description data files (buckets -> lines)
│  ├─ queues/           # queue names, connection, definitions
│  ├─ workers/          # processors: riotFetch, matchProcess, notify, roleSync, ...
│  ├─ jobs/             # scheduler job definitions (cron / repeatable)
│  ├─ bot/
│  │  ├─ client.js
│  │  ├─ commands/      # /link /unlink /profile /rank /history /leaderboard
│  │  │                 #   /setup /channel /betting /stats /help /settings /admin
│  │  ├─ events/        # ready, guildCreate, interactionCreate, ...
│  │  ├─ interactions/  # button/select/modal handlers (betting, setup wizard)
│  │  ├─ handlers/      # command + event auto-loaders
│  │  └─ deploy-commands.js
│  ├─ api/
│  │  ├─ app.js         # express factory
│  │  ├─ routes/  controllers/  middlewares/  validators/
│  │  └─ auth/          # discord OAuth
│  ├─ shared/           # enums, queue names, event names, queue-id maps
│  └─ utils/            # ladder.js (absolute-LP math), format, time, hash, sanitize
├─ test/                # mirrors src/
├─ scripts/             # deploy-commands, seed, migrations
├─ docker/              # Dockerfile, docker-compose.yml, .dockerignore
├─ .github/workflows/   # ci.yml
├─ .env.example
├─ eslint.config.js  ·  jest.config.js  ·  package.json  (type: module)
└─ README.md
```

---

## 11. Feature → architecture map

| # | Feature | Where it lives |
|---|---------|----------------|
| 1 | Player linking (multi-account) | `/link` → `linking` service → `Summoner` (dedup) + `Player` (join) |
| 2 | Match alerts + funny text | `match-process` → `embeds/matchEmbed` + `templates/` → `notify-dispatch` |
| 3 | LP tracking + recaps | `LPHistory` ledger + `absoluteLp` math; recap jobs |
| 4 | Promotion/demotion alerts | `ranks` service diff vs `RankHistory` → notification |
| 5 | Server leaderboards (10 categories) | `leaderboard-compute` + `Leaderboard` docs + Redis ZSETs |
| 6 | Win/loss streaks | `Summoner.streak` updated in `match-process`; threshold alerts |
| 7 | Automatic rank roles | `GuildSettings.roles` + `role-sync` worker + `RoleSync` audit |
| 8 | Match betting | Spectator-detected window → `Bet`/`BettingProfile` → resolve on match complete |
| 9 | Daily recaps | `recap-generate` (scheduler-triggered) |
| 10 | Weekly recaps + graphs | `recap-generate` renders PNG via server-side canvas, attached to embed |
| 11 | Lifetime statistics | `/stats` → aggregate `PlayerMatch` (champion pool, WR, averages) |
| 12 | Dashboard API | `api/` Express REST |
| 13 | Web-dashboard-ready | OAuth + deny-by-default authz + versioned endpoints (no UI yet) |
| 14 | Queue system | BullMQ queues §6 — nothing processed inline |
| 15 | Rate-limit handling | Redis limiter + per-region queues + header-honoring §3.2 |
| 16 | Logging | pino, correlation ids |
| 17 | Error recovery | retries/backoff + DLQ + region pause §6 |
| 18 | Per-guild config | `GuildSettings` |
| 19 | Embed design | `embeds/` design system |
| 20 | Clean architecture | folders §10 + repository/service/DI |

---

## 12. Chosen defaults

- **Graph rendering:** server-side canvas (`chartjs-node-canvas` + `chart.js`) →
  PNG attachments. Self-hosted, no external chart service.
- **Input validation:** `zod` for both slash-command options and API bodies.
- **DI:** lightweight factory-based composition root, not a heavy framework.
- **Live-game detection for betting:** Spectator-v5, polled only for
  `active`-tier players, to keep Riot usage bounded.
- **Riot key:** design honors live rate-limit headers, so it works unchanged on a
  personal *dev* key and a *production* key.
- **Scheduling:** BullMQ repeatable jobs (not `node-cron`) for all periodic work,
  so scheduling shares the same Redis-backed durability, retries, and
  observability as the rest of the queue system.

---

## 13. Build phases

1. **Architecture** (this document) — ✅ approved.
2. **Project init** — package.json, packages, folders, configuration (env
   validation, constants, regions, logger, errors, Redis factory).
3. **Database** — Mongoose connection, all models, repositories.
4. **Discord bot** — client, command/event loaders, base commands.
5. **Riot integration** — client, rate limiter, routing, cache, endpoints.
6. **Onward** — services, queues/workers, scheduler, embeds, betting, recaps,
   leaderboards, roles, REST API + OAuth, Docker, CI, tests, docs.

Each phase is completed and reviewed before the next begins.
