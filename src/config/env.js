import { z } from 'zod';
import dotenv from 'dotenv';

// Load `.env` into process.env (no-op if the file is absent, e.g. in Docker
// where env is injected by the orchestrator).
dotenv.config();

/**
 * Coerces common truthy string representations to a real boolean.
 * Accepts: true/false booleans, or "true"/"1"/"yes"/"on" (case-insensitive).
 */
const booleanish = z
  .union([z.boolean(), z.string()])
  .transform((value) => {
    if (typeof value === 'boolean') return value;
    return ['true', '1', 'yes', 'on'].includes(value.trim().toLowerCase());
  });

/**
 * The single source of truth for every environment variable the system reads.
 * Anything not declared here is invisible to the app by design — no stray
 * `process.env.SOMETHING` reads scattered across the codebase.
 */
const envSchema = z.object({
  // Runtime
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
  SERVICE_NAME: z.string().min(1).default('discord-lol-bot'),
  RUN_MODE: z
    .enum(['mono', 'bot', 'scheduler', 'worker', 'api'])
    .default('mono'),

  // Discord
  DISCORD_TOKEN: z.string().min(1, 'DISCORD_TOKEN is required'),
  DISCORD_CLIENT_ID: z.string().min(1, 'DISCORD_CLIENT_ID is required'),
  DISCORD_CLIENT_SECRET: z.string().optional(),
  DISCORD_OAUTH_REDIRECT_URI: z.string().url().optional(),
  DISCORD_DEV_GUILD_ID: z.string().optional(),
  SHARD_COUNT: z
    .union([z.literal('auto'), z.coerce.number().int().positive()])
    .default('auto'),

  // Riot
  RIOT_API_KEY: z.string().min(1, 'RIOT_API_KEY is required'),
  RIOT_MAX_RETRIES: z.coerce.number().int().min(0).max(10).default(3),

  // MongoDB
  MONGO_URI: z.string().min(1, 'MONGO_URI is required'),
  MONGO_DB_NAME: z.string().optional(),

  // Redis
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),

  // REST API / dashboard
  API_PORT: z.coerce.number().int().positive().default(3000),
  API_BASE_URL: z.string().url().default('http://localhost:3000'),
  SESSION_SECRET: z
    .string()
    .min(16, 'SESSION_SECRET must be at least 16 characters'),
  COOKIE_SECURE: booleanish.default(false),

  // Workers
  WORKER_TYPE: z.string().optional(),
  WORKER_CONCURRENCY: z.coerce.number().int().positive().default(5),

  // Scheduler
  POLL_TICK_INTERVAL_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(10_000),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // We cannot use the pino logger here — it depends on this module. Use the
  // console directly and fail closed so nothing boots half-configured.
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('\n');
  console.error(`\n❌ Invalid environment configuration:\n${issues}\n`);
  process.exit(1);
}

/** Frozen, validated, fully-typed environment. Import this everywhere. */
export const env = Object.freeze(parsed.data);

export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
export const isDevelopment = env.NODE_ENV === 'development';
