import {
  getPlatform,
  getMatchRoute,
  getAccountRoute,
  normalizePlatform,
  isSupportedPlatform,
  SUPPORTED_PLATFORMS,
  REGIONAL_ROUTES,
} from '../config/regions.js';
import { ValidationError } from '../core/errors.js';

// Re-export the region data helpers so the Riot layer has one import surface.
export {
  getPlatform,
  getMatchRoute,
  getAccountRoute,
  normalizePlatform,
  isSupportedPlatform,
  SUPPORTED_PLATFORMS,
  REGIONAL_ROUTES,
};

/**
 * Base URL for platform-scoped endpoints (summoner-v4, league-v4, spectator-v5).
 * @throws {ValidationError} on an unsupported platform.
 */
export function platformHost(platform) {
  const p = normalizePlatform(platform);
  if (!p) throw new ValidationError(`Unsupported platform: ${platform}`);
  return `https://${p}.api.riotgames.com`;
}

/** Base URL for a regional cluster (americas/asia/europe/sea). */
export function regionalHost(route) {
  return `https://${route}.api.riotgames.com`;
}

/** Regional host for match-v5 given a platform. */
export function matchHost(platform) {
  const route = getMatchRoute(platform);
  if (!route) throw new ValidationError(`Unsupported platform: ${platform}`);
  return regionalHost(route);
}

/** Regional host for account-v1 given a platform. */
export function accountHost(platform) {
  const route = getAccountRoute(platform);
  if (!route) throw new ValidationError(`Unsupported platform: ${platform}`);
  return regionalHost(route);
}
