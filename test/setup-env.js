/**
 * Runs before the test framework is installed in each test file.
 * Provides the minimum env required so importing `src/config` during tests
 * does not trip the fail-fast validation and exit the process.
 * Real integration tests inject live URIs (e.g. mongodb-memory-server) at runtime.
 */
process.env.NODE_ENV = 'test';
process.env.DISCORD_TOKEN ||= 'test-discord-token';
process.env.DISCORD_CLIENT_ID ||= '000000000000000000';
process.env.RIOT_API_KEY ||= 'RGAPI-00000000-0000-0000-0000-000000000000';
process.env.MONGO_URI ||= 'mongodb://127.0.0.1:27017/discord_lol_bot_test';
process.env.REDIS_URL ||= 'redis://127.0.0.1:6379';
process.env.SESSION_SECRET ||= 'test-session-secret-please-change-0123456789';
process.env.LOG_LEVEL ||= 'silent';
