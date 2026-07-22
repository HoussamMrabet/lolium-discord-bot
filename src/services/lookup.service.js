import { normalizePlatform } from '../config/regions.js';
import { ValidationError, NotFoundError } from '../core/errors.js';
import { toMatchDocument } from './matchTransform.js';
import { kda } from '../utils/format.js';
import { createLogger } from '../core/logger.js';

const PROFILE_TTL = 180; // seconds — the whole assembled profile is cached
const RECENT_COUNT = 6; // recent games to fetch (each is one Riot call, cached)

/**
 * Public summoner lookup for the website search box — for ANY account, not just
 * tracked ones. This is Riot-budget-sensitive (a cold lookup makes several
 * calls), so the fully-assembled profile is cached briefly, individual match
 * details reuse the client's permanent match cache, and the route is tightly
 * rate-limited. Nothing is persisted to Mongo.
 */
export function createLookupService({ riot, rank, redis, logger = createLogger('lookup') }) {
  async function getProfile({ gameName, tagLine, platform }) {
    const p = normalizePlatform(platform);
    if (!p) throw new ValidationError(`Unsupported region: ${platform}`);

    const name = String(gameName ?? '').trim();
    const tag = String(tagLine ?? '')
      .replace(/^#/, '')
      .trim();
    if (!name || !tag) throw new ValidationError('Provide a Riot ID as Name#Tag.');

    const cacheKey = `lookup:${p}:${name.toLowerCase()}#${tag.toLowerCase()}`;
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    let account;
    try {
      account = await riot.getAccountByRiotId({ gameName: name, tagLine: tag, platform: p });
    } catch (err) {
      if (err?.code === 'RIOT_NOT_FOUND') {
        throw new NotFoundError(`Riot account ${name}#${tag} was not found.`);
      }
      throw err;
    }

    let summonerDto;
    try {
      summonerDto = await riot.getSummonerByPuuid({ puuid: account.puuid, platform: p });
    } catch (err) {
      if (err?.code === 'RIOT_NOT_FOUND') {
        throw new NotFoundError(`${name}#${tag} has no League profile on ${p.toUpperCase()}.`);
      }
      throw err;
    }

    const ranked = rank.snapshotsFromEntries(
      await riot.getRankedEntries({ puuid: account.puuid, platform: p }),
    );

    let ids = await riot.getMatchIds({ puuid: account.puuid, platform: p, count: RECENT_COUNT });
    ids = Array.isArray(ids) ? ids : [];

    const recentMatches = [];
    for (const id of ids) {
      try {
        const doc = toMatchDocument(await riot.getMatch({ matchId: id, platform: p }));
        const part = doc.participants.find((x) => x.puuid === account.puuid);
        if (!part) continue;
        recentMatches.push({
          matchId: id,
          queueId: doc.queueId,
          gameEndAt: doc.gameEndAt,
          durationSec: doc.gameDuration,
          championName: part.championName,
          win: part.win,
          kills: part.kills,
          deaths: part.deaths,
          assists: part.assists,
          kda: kda(part.kills, part.deaths, part.assists),
          cs: part.cs,
          csPerMin: part.csPerMin,
          visionScore: part.visionScore,
        });
      } catch (err) {
        logger.warn({ err, id }, 'match fetch failed during lookup');
      }
    }

    const profile = {
      riotId: { gameName: account.gameName ?? name, tagLine: account.tagLine ?? tag },
      platform: p,
      summonerLevel: summonerDto.summonerLevel ?? 0,
      profileIconId: summonerDto.profileIconId ?? 0,
      ranked,
      recentMatches,
    };

    await redis.set(cacheKey, JSON.stringify(profile), 'EX', PROFILE_TTL);
    return profile;
  }

  return { getProfile };
}

export default createLookupService;
