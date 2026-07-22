import { ValidationError } from '../../core/errors.js';

/**
 * Validates and normalizes a request part against a zod schema. On success the
 * parsed value replaces the raw input (so downstream code sees coerced, trusted
 * data). On failure a 400 with field-level issues is returned — never trust
 * client input (OWASP A05).
 *
 * @param {import('zod').ZodTypeAny} schema
 * @param {'body'|'query'|'params'} source
 */
export function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return next(
        new ValidationError('Invalid request.', {
          issues: result.error.issues.map((i) => ({
            path: i.path.join('.'),
            message: i.message,
          })),
        }),
      );
    }
    // `query`/`params` getters can be read-only on some Express versions; assign
    // onto a companion field that controllers read.
    if (source === 'body') req.body = result.data;
    else req.valid = { ...(req.valid ?? {}), [source]: result.data };
    return next();
  };
}
