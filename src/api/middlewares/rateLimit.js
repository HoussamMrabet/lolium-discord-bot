import rateLimit from 'express-rate-limit';

/** General API limiter (per IP). */
export const apiLimiter = rateLimit({
  windowMs: 60_000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});

/** Tighter limiter for auth endpoints (brute-force resistance, OWASP A07). */
export const authLimiter = rateLimit({
  windowMs: 60_000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});
