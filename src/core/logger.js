import pino from 'pino';
import { env, isProduction } from '../config/env.js';

/**
 * Central pino logger.
 *
 * - Production: raw JSON to stdout (fast, ingestible by log platforms).
 * - Non-production: pretty-printed via `pino-pretty` transport for readability.
 * - Secrets are redacted defensively so tokens/keys never leak into logs
 *   (OWASP A09 — logging failures).
 */
const redactPaths = [
  'req.headers.authorization',
  'req.headers.cookie',
  'headers.authorization',
  '*.token',
  '*.apiKey',
  '*.password',
  '*.secret',
  'DISCORD_TOKEN',
  'RIOT_API_KEY',
  'SESSION_SECRET',
];

export const logger = pino({
  level: env.LOG_LEVEL,
  base: { service: env.SERVICE_NAME },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => ({ level: label }),
  },
  redact: { paths: redactPaths, censor: '[REDACTED]' },
  ...(isProduction
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname,service',
          },
        },
      }),
});

/**
 * Creates a child logger bound to a module name (and any extra context).
 * Prefer this over the root logger so every line is attributable.
 *
 * @param {string} moduleName
 * @param {Record<string, unknown>} [bindings]
 */
export function createLogger(moduleName, bindings = {}) {
  return logger.child({ module: moduleName, ...bindings });
}
