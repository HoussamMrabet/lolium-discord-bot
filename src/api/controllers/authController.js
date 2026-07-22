import { randomUUID } from 'node:crypto';
import {
  ForbiddenError,
  UnauthorizedError,
} from '../../core/errors.js';

/**
 * Discord OAuth2 controllers. The `state` parameter defends against CSRF on the
 * callback (OWASP A01/A07): it's minted at login, stored in the session, and
 * must match on return.
 */
export function createAuthController({ repositories, oauth, config }) {
  function login(req, res) {
    const state = randomUUID();
    req.session.oauthState = state;
    res.redirect(oauth.buildAuthorizeUrl(state));
  }

  async function callback(req, res) {
    const { code, state } = req.query;
    if (!code || !state || state !== req.session.oauthState) {
      throw new ForbiddenError('Invalid OAuth state.');
    }
    delete req.session.oauthState;

    let user;
    let guilds;
    try {
      const token = await oauth.exchangeCode(String(code));
      user = await oauth.fetchUser(token.access_token);
      guilds = await oauth.fetchUserGuilds(token.access_token);
    } catch {
      // Never surface the raw Discord/axios error (may contain tokens).
      throw new UnauthorizedError('Discord login failed. Please try again.');
    }

    req.session.user = { id: user.id, username: user.username, avatar: user.avatar };
    req.session.adminGuildIds = (guilds ?? [])
      .filter((g) => oauth.hasManageGuild(g))
      .map((g) => g.id);

    await repositories.users.upsertProfile({
      id: user.id,
      username: user.username,
      globalName: user.global_name,
      avatar: user.avatar,
    });

    if (config.DASHBOARD_URL) return res.redirect(config.DASHBOARD_URL);
    return res.json({ ok: true, user: req.session.user });
  }

  function me(req, res) {
    res.json({
      user: req.session.user,
      adminGuildIds: req.session.adminGuildIds ?? [],
    });
  }

  function logout(req, res, next) {
    req.session.destroy((err) => {
      if (err) return next(err);
      res.clearCookie('sid');
      return res.json({ ok: true });
    });
  }

  return { login, callback, me, logout };
}
