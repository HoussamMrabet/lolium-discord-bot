import axios from 'axios';

const DISCORD_API = 'https://discord.com/api';
const MANAGE_GUILD = 1n << 5n; // 0x20

/** True if the user can manage this guild (owner or Manage Server permission). */
export function hasManageGuild(guild) {
  if (guild?.owner) return true;
  try {
    return (BigInt(guild?.permissions ?? '0') & MANAGE_GUILD) === MANAGE_GUILD;
  } catch {
    return false;
  }
}

/**
 * Discord OAuth2 authorization-code helper. Never logs tokens; the caller keeps
 * the access token only long enough to fetch identity + guilds at login.
 */
export function createDiscordOauth({ clientId, clientSecret, redirectUri }) {
  function buildAuthorizeUrl(state) {
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'identify guilds',
      state,
      prompt: 'none',
    });
    return `${DISCORD_API}/oauth2/authorize?${params.toString()}`;
  }

  async function exchangeCode(code) {
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    });
    const { data } = await axios.post(`${DISCORD_API}/oauth2/token`, body.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 8000,
    });
    return data;
  }

  async function fetchUser(accessToken) {
    const { data } = await axios.get(`${DISCORD_API}/users/@me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      timeout: 8000,
    });
    return data;
  }

  async function fetchUserGuilds(accessToken) {
    const { data } = await axios.get(`${DISCORD_API}/users/@me/guilds`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      timeout: 8000,
    });
    return data;
  }

  return { buildAuthorizeUrl, exchangeCode, fetchUser, fetchUserGuilds, hasManageGuild };
}
