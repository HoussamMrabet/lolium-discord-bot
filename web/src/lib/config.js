const CLIENT_ID = import.meta.env.VITE_DISCORD_CLIENT_ID ?? '';

// Send Messages + Embed Links + Attach Files + Manage Roles.
const PERMISSIONS = '268486656';

export const inviteUrl = CLIENT_ID
  ? `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&scope=bot%20applications.commands&permissions=${PERMISSIONS}`
  : 'https://discord.com/developers/applications';

// Server-side OAuth login (same origin) — kicks off the dashboard flow.
export const loginUrl = '/api/v1/auth/discord';
