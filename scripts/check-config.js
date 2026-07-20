/**
 * Boots just the configuration + core layer and reports status.
 * Handy smoke test: `npm run config:check`. Exits non-zero (via env.js) if any
 * required environment variable is missing or malformed.
 */
import { env } from '../src/config/env.js';
import { SUPPORTED_PLATFORMS } from '../src/config/regions.js';
import { QUEUE_NAMES } from '../src/config/constants.js';
import { logger } from '../src/core/logger.js';

logger.info(
  {
    nodeEnv: env.NODE_ENV,
    runMode: env.RUN_MODE,
    logLevel: env.LOG_LEVEL,
    supportedPlatforms: SUPPORTED_PLATFORMS.length,
    queues: Object.keys(QUEUE_NAMES).length,
  },
  'configuration and core layer loaded successfully',
);
