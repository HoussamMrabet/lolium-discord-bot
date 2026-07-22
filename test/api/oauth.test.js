import { createDiscordOauth, hasManageGuild } from '../../src/api/auth/discordOauth.js';

describe('hasManageGuild', () => {
  it('is true for the guild owner', () => {
    expect(hasManageGuild({ owner: true, permissions: '0' })).toBe(true);
  });
  it('is true when the Manage Server bit is set', () => {
    expect(hasManageGuild({ permissions: String(0x20) })).toBe(true);
  });
  it('is false without the permission', () => {
    expect(hasManageGuild({ permissions: String(0x400) })).toBe(false);
  });
  it('is false for malformed permissions', () => {
    expect(hasManageGuild({ permissions: 'nope' })).toBe(false);
  });
});

describe('buildAuthorizeUrl', () => {
  it('includes client id, scope, state, and redirect', () => {
    const oauth = createDiscordOauth({
      clientId: 'cid',
      clientSecret: 'sec',
      redirectUri: 'http://localhost/cb',
    });
    const url = oauth.buildAuthorizeUrl('st8');
    expect(url).toContain('client_id=cid');
    expect(url).toContain('scope=identify+guilds');
    expect(url).toContain('state=st8');
    expect(url).toContain('redirect_uri=http%3A%2F%2Flocalhost%2Fcb');
  });
});
