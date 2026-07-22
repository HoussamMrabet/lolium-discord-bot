import {
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
} from '../../core/errors.js';

/** Requires an authenticated session. */
export function requireAuth(req, res, next) {
  if (!req.session?.user) return next(new UnauthorizedError('Login required.'));
  return next();
}

/**
 * Deny-by-default guild authorization (OWASP A01). Access is granted only when
 * BOTH hold: the session user administers the guild (captured at login), AND the
 * bot is actually present in it (re-checked against our DB). Ownership is
 * verified, never taken from a client-supplied id.
 */
export function createRequireGuildAccess({ repositories }) {
  return async function requireGuildAccess(req, res, next) {
    try {
      if (!req.session?.user) return next(new UnauthorizedError('Login required.'));

      const guildId = req.params.guildId;
      if (!req.session.adminGuildIds?.includes(guildId)) {
        return next(new ForbiddenError('You do not manage this server.'));
      }

      const guild = await repositories.guilds.findById(guildId);
      if (!guild || !guild.active) {
        return next(new NotFoundError('The bot is not in that server.'));
      }

      req.guildId = guildId;
      return next();
    } catch (err) {
      return next(err);
    }
  };
}
