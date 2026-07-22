import { randomUUID } from 'node:crypto';
import { isAppError } from '../../core/errors.js';
import { createLogger } from '../../core/logger.js';

const log = createLogger('api');

/** Wraps an async handler so rejected promises reach the error handler. */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export function notFoundHandler(req, res) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found' } });
}

/**
 * Central error handler. Typed AppErrors map to their status + safe JSON;
 * anything else becomes a 500 with a correlation id and is logged server-side —
 * never a stack trace to the client (fail-closed, OWASP A10).
 */
// Express identifies error handlers by their 4-arg signature; `_next` is unused.
export function errorHandler(err, req, res, _next) {
  if (isAppError(err)) {
    return res.status(err.statusCode).json({ error: err.toJSON() });
  }
  const id = randomUUID();
  log.error({ err, id, method: req.method, path: req.path }, 'unhandled api error');
  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.', id },
  });
}
