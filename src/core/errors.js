/**
 * Typed error hierarchy.
 *
 * Callers branch on error *meaning* (instanceof / `.code`), never on raw HTTP
 * numbers. `retryable` tells the queue layer whether a failure is worth
 * retrying; `statusCode` maps cleanly onto REST responses. The API error
 * handler serializes only safe fields (never a stack trace) — OWASP A10.
 */

export class AppError extends Error {
  /**
   * @param {string} message
   * @param {object} [options]
   * @param {string} [options.code]
   * @param {number} [options.statusCode]
   * @param {boolean} [options.retryable]
   * @param {unknown} [options.cause]
   * @param {Record<string, unknown>} [options.meta]
   */
  constructor(
    message,
    { code = 'INTERNAL_ERROR', statusCode = 500, retryable = false, cause, meta } = {},
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.retryable = retryable;
    this.meta = meta;
    if (cause !== undefined) this.cause = cause;
    if (Error.captureStackTrace) Error.captureStackTrace(this, this.constructor);
  }

  /** Safe representation for API responses / logs (no stack, no internals). */
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      ...(this.meta ? { meta: this.meta } : {}),
    };
  }
}

// --- Generic domain errors ---------------------------------------------------

export class ValidationError extends AppError {
  constructor(message, meta) {
    super(message, { code: 'VALIDATION_ERROR', statusCode: 400, meta });
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized', meta) {
    super(message, { code: 'UNAUTHORIZED', statusCode: 401, meta });
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', meta) {
    super(message, { code: 'FORBIDDEN', statusCode: 403, meta });
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found', meta) {
    super(message, { code: 'NOT_FOUND', statusCode: 404, meta });
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict', meta) {
    super(message, { code: 'CONFLICT', statusCode: 409, meta });
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Rate limited', { retryAfter, ...meta } = {}) {
    super(message, {
      code: 'RATE_LIMITED',
      statusCode: 429,
      retryable: true,
      meta: { retryAfter, ...meta },
    });
    this.retryAfter = retryAfter;
  }
}

// --- Riot API errors ---------------------------------------------------------

export class RiotApiError extends AppError {
  constructor(message, { code = 'RIOT_API_ERROR', statusCode = 502, retryable = false, meta } = {}) {
    super(message, { code, statusCode, retryable, meta });
  }
}

export class RiotNotFoundError extends RiotApiError {
  constructor(message = 'Riot resource not found', meta) {
    super(message, { code: 'RIOT_NOT_FOUND', statusCode: 404, retryable: false, meta });
  }
}

export class RiotRateLimitError extends RiotApiError {
  constructor(message = 'Riot rate limit exceeded', { retryAfter, ...meta } = {}) {
    super(message, {
      code: 'RIOT_RATE_LIMITED',
      statusCode: 429,
      retryable: true,
      meta: { retryAfter, ...meta },
    });
    this.retryAfter = retryAfter;
  }
}

export class RiotServerError extends RiotApiError {
  constructor(message = 'Riot server error', meta) {
    super(message, { code: 'RIOT_SERVER_ERROR', statusCode: 502, retryable: true, meta });
  }
}

/** Type guard usable by the API/worker layers. */
export function isAppError(value) {
  return value instanceof AppError;
}
