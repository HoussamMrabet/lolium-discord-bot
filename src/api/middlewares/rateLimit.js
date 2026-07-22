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

/** Public summoner lookup — hits Riot, so kept tight to protect the API budget. */
export const lookupLimiter = rateLimit({
  windowMs: 60_000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
});

/** Champion data — served from a CDN cache, so a looser limit is fine. */
export const championLimiter = rateLimit({
  windowMs: 60_000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});
