import { Client, GatewayIntentBits } from 'discord.js';

/**
 * Creates the gateway client.
 *
 * Intents: **only `Guilds`** — no privileged intents. We never read message
 * content, and all member/role operations use known ids via the REST API
 * (which needs no gateway intent), so we request the minimum possible surface
 * (least privilege, OWASP A02; architecture §2).
 */
export function createBotClient() {
  return new Client({
    intents: [GatewayIntentBits.Guilds],
    allowedMentions: { parse: ['users', 'roles'], repliedUser: false },
    failIfNotExists: false,
  });
}
