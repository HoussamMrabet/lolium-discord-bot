import { ValidationError, NotFoundError } from '../core/errors.js';
import {
  normalizePlatform,
  getMatchRoute,
  getAccountRoute,
} from '../config/regions.js';
import { RANKED_QUEUE_KEYS, POLL_TIERS } from '../config/constants.js';
import { createLogger } from '../core/logger.js';

const MAX_ACCOUNTS_PER_USER = 10;
const RIOT_ID_NAME_MAX = 16;
const TAGLINE_MAX = 5;

/**
 * Account-linking domain service. Resolves a Riot ID through the Riot API, then
 * persists the globally-deduplicated Summoner and the per-guild Player link.
 *
 * Run inline from the /link command (low-volume, latency-sensitive, and still
 * protected by the shared rate limiter) — distinct from the high-volume match
 * pipeline, which is queued.
 */
export function createLinkingService({
  riot,
  repositories,
  rank,
  logger = createLogger('linking'),
}) {
  async function linkAccount({
    guildId,
    discordUserId,
    gameName,
    tagLine,
    platform,
    nickname = null,
  }) {
    // --- validate & normalize (never trust input — OWASP A05) ---
    const p = normalizePlatform(platform);
    if (!p) throw new ValidationError(`Unsupported region: ${platform}`);

    const name = String(gameName ?? '').trim();
    const tag = String(tagLine ?? '')
      .replace(/^#/, '')
      .trim();
    if (!name || name.length > RIOT_ID_NAME_MAX) {
      throw new ValidationError('Invalid Riot ID name.');
    }
    if (!tag || tag.length > TAGLINE_MAX) {
      throw new ValidationError('Invalid Riot ID tagline.');
    }

    // --- resolve via Riot ---
    let account;
    try {
      account = await riot.getAccountByRiotId({ gameName: name, tagLine: tag, platform: p });
    } catch (err) {
      if (err?.code === 'RIOT_NOT_FOUND') {
        throw new NotFoundError(`Riot account **${name}#${tag}** was not found.`);
      }
      throw err;
    }

    let summonerDto;
    try {
      summonerDto = await riot.getSummonerByPuuid({ puuid: account.puuid, platform: p });
    } catch (err) {
      if (err?.code === 'RIOT_NOT_FOUND') {
        throw new NotFoundError(
          `**${name}#${tag}** has no League profile on ${p.toUpperCase()}.`,
        );
      }
      throw err;
    }

    const byQueue = await riot.getRankedEntries({ puuid: account.puuid, platform: p });
    const snapshots = rank.snapshotsFromEntries(byQueue);

    // --- persist the globally-deduped Summoner ---
    const summoner = await repositories.summoners.upsertIdentity({
      puuid: account.puuid,
      platform: p,
      regionalRoute: getMatchRoute(p),
      accountRoute: getAccountRoute(p),
      riotId: {
        gameName: account.gameName ?? name,
        tagLine: account.tagLine ?? tag,
      },
      summonerLevel: summonerDto.summonerLevel ?? 0,
      profileIconId: summonerDto.profileIconId ?? 0,
    });
    for (const queue of RANKED_QUEUE_KEYS) {
      await repositories.summoners.updateRankedSnapshot(account.puuid, queue, snapshots[queue]);
    }
    // A freshly-linked account is likely active — poll it soon.
    await repositories.summoners.setPolling(account.puuid, {
      pollTier: POLL_TIERS.ACTIVE,
      nextCheckAt: new Date(),
    });

    // --- create the per-guild link (idempotent) ---
    const existing = await repositories.players.findOne({
      guildId,
      discordUserId,
      summonerId: summoner._id,
    });
    if (existing) {
      const refreshed = await repositories.summoners.findByPuuid(account.puuid);
      return { alreadyLinked: true, summoner: refreshed, account };
    }

    const count = await repositories.players.countByUser(guildId, discordUserId);
    if (count >= MAX_ACCOUNTS_PER_USER) {
      throw new ValidationError(
        `You can link at most ${MAX_ACCOUNTS_PER_USER} accounts in a server.`,
      );
    }

    const link = await repositories.players.link({
      guildId,
      discordUserId,
      summonerId: summoner._id,
      puuid: account.puuid,
      primary: count === 0,
      nickname,
    });
    await repositories.summoners.incTrackedGuildCount(account.puuid, 1);

    // Baseline rank snapshots so future graphs/deltas have a starting point.
    for (const queue of RANKED_QUEUE_KEYS) {
      const snap = snapshots[queue];
      if (snap.tier) {
        await repositories.rankHistory.record({
          summonerId: summoner._id,
          queueType: queue,
          tier: snap.tier,
          division: snap.division,
          lp: snap.lp,
          absoluteLp: snap.absoluteLp,
          wins: snap.wins,
          losses: snap.losses,
          source: 'baseline',
        });
      }
    }

    const finalSummoner = await repositories.summoners.findByPuuid(account.puuid);
    logger.info(
      { guildId, discordUserId, puuid: account.puuid },
      'account linked',
    );
    return { alreadyLinked: false, summoner: finalSummoner, link, account };
  }

  return { linkAccount, MAX_ACCOUNTS_PER_USER };
}

export default createLinkingService;
