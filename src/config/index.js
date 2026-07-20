/**
 * Config barrel. Import specific members from here or from the individual
 * modules — both work. `env` triggers validation on first import.
 */
export { env, isProduction, isTest, isDevelopment } from './env.js';
export * from './constants.js';
export * from './regions.js';
export { DEFAULT_GUILD_SETTINGS } from './features.js';
