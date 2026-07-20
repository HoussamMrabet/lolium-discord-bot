import axios from 'axios';
import { createLogger } from '../core/logger.js';
import {
  RiotApiError,
  RiotNotFoundError,
  RiotRateLimitError,
  RiotServerError,
} from '../core/errors.js';
import { parseRetryAfter } from './rateLimiter.js';
import { sleep, jitter } from '../utils/async.js';

/**
 * Low-level Riot HTTP client. Every request:
 *   1. checks the response cache (incl. negative cache),
 *   2. acquires a rate-limit slot for the region (blocking under our own limits),
 *   3. calls Riot with the API key,
 *   4. learns the region's live limits from the response headers,
 *   5. caches the result,
 * and maps Riot's status codes to typed domain errors so callers branch on
 * meaning, not numbers. Transient failures (5xx / network) are retried with
 * exponential backoff; 429s pause the region and surface as a retryable error.
 */
export class RiotClient {
  constructor({ apiKey, limiter, cache, maxRetries = 3, timeout = 8000, logger }) {
    if (!apiKey) throw new Error('RiotClient requires an apiKey');
    this.apiKey = apiKey;
    this.limiter = limiter;
    this.cache = cache;
    this.maxRetries = maxRetries;
    this.logger = logger ?? createLogger('riot-client');
    this.http = axios.create({
      timeout,
      headers: { 'X-Riot-Token': apiKey },
      // Riot never uses cookies; keep responses lean.
      maxRedirects: 0,
    });
  }

  /**
   * @param {string} region  rate-limit bucket (platform id or regional cluster)
   * @param {string} url     absolute Riot URL
   * @param {object} [opts]
   * @param {object} [opts.params]
   * @param {string} [opts.methodId]  method label for logs
   * @param {{key?: string, ttl?: number, negativeTtl?: number}} [opts.cache]
   * @param {boolean} [opts.allowNull]  return null instead of throwing on 404
   */
  async request(region, url, opts = {}) {
    const { params, methodId, cache, allowNull = false } = opts;

    if (cache?.key && this.cache) {
      const cached = await this.cache.get(cache.key);
      if (cached !== undefined) {
        if (cached === null) {
          if (allowNull) return null;
          throw new RiotNotFoundError('resource not found (cached)', { url });
        }
        return cached;
      }
    }

    let attempt = 0;
    for (;;) {
      if (this.limiter) await this.limiter.take(region);

      const startedAt = Date.now();
      try {
        const res = await this.http.get(url, { params });
        const ms = Date.now() - startedAt;
        if (this.limiter) this.limiter.syncFromHeaders(region, res.headers);
        if (cache?.key && cache.ttl && this.cache) {
          await this.cache.set(cache.key, res.data, cache.ttl);
        }
        this.logger.debug({ methodId, region, ms, status: res.status }, 'riot request ok');
        return res.data;
      } catch (err) {
        const mapped = this._mapError(err, { region, url, methodId });

        if (mapped instanceof RiotNotFoundError) {
          if (cache?.key && cache.negativeTtl && this.cache) {
            await this.cache.set(cache.key, null, cache.negativeTtl);
          }
          if (allowNull) return null;
          throw mapped;
        }

        if (mapped instanceof RiotRateLimitError) {
          if (this.limiter) {
            await this.limiter.pauseRegion(
              region,
              (mapped.retryAfter ?? 1) * 1000,
            );
          }
          throw mapped;
        }

        if (mapped.retryable && attempt < this.maxRetries) {
          const backoff = this._backoff(attempt);
          attempt += 1;
          this.logger.warn(
            { methodId, region, attempt, backoff, code: mapped.code },
            'riot request retry',
          );
          await sleep(backoff);
          continue;
        }

        throw mapped;
      }
    }
  }

  _backoff(attempt) {
    const base = Math.min(8000, 500 * 2 ** attempt);
    return base + jitter(250);
  }

  _mapError(err, ctx) {
    if (axios.isAxiosError(err) && err.response) {
      const { status, headers, data } = err.response;
      const meta = { ...ctx, status, riot: data?.status };
      if (status === 404) return new RiotNotFoundError('resource not found', meta);
      if (status === 429) {
        const retryAfter = parseRetryAfter(headers?.['retry-after'], 1000) / 1000;
        return new RiotRateLimitError('riot rate limit', { retryAfter, ...meta });
      }
      if (status === 401 || status === 403) {
        this.logger.error({ ...ctx, status }, 'riot auth error — check RIOT_API_KEY');
        return new RiotApiError('riot authorization failed', {
          code: 'RIOT_UNAUTHORIZED',
          statusCode: status,
          retryable: false,
          meta,
        });
      }
      if (status >= 500) return new RiotServerError('riot server error', meta);
      return new RiotApiError(`riot request failed (${status})`, {
        statusCode: status,
        retryable: false,
        meta,
      });
    }

    // No response: timeout / network error — retryable.
    return new RiotServerError('riot network error', {
      ...ctx,
      cause: err?.code ?? err?.message,
    });
  }
}

export default RiotClient;
