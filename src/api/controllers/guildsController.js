import { NotFoundError } from '../../core/errors.js';
import { buildGuildScope } from '../../services/guildScope.js';

function serializeSettings(s) {
  return {
    guildId: s.guildId,
    channels: s.channels,
    features: s.features,
    recap: s.recap,
    roles: s.roles instanceof Map ? Object.fromEntries(s.roles) : (s.roles ?? {}),
    streakThresholds: s.streakThresholds,
    enabledLeaderboards: s.enabledLeaderboards,
    bettingSeasonId: s.bettingSeasonId,
    locale: s.locale,
  };
}

/** Builds a Mongo update from a validated settings patch (dot-paths + $unset). */
function buildSettingsUpdate(patch) {
  const $set = {};
  const $unset = {};
  const nested = (prefix, obj) => {
    if (!obj) return;
    for (const [k, v] of Object.entries(obj)) $set[`${prefix}.${k}`] = v;
  };
  nested('channels', patch.channels);
  nested('features', patch.features);
  nested('recap', patch.recap);
  if (patch.roles) {
    for (const [tier, roleId] of Object.entries(patch.roles)) {
      if (roleId === null) $unset[`roles.${tier}`] = '';
      else $set[`roles.${tier}`] = roleId;
    }
  }
  if (patch.streakThresholds) $set.streakThresholds = patch.streakThresholds;
  if (patch.enabledLeaderboards) $set.enabledLeaderboards = patch.enabledLeaderboards;
  if (patch.locale) $set.locale = patch.locale;

  const update = {};
  if (Object.keys($set).length) update.$set = $set;
  if (Object.keys($unset).length) update.$unset = $unset;
  return update;
}

export function createGuildsController({ repositories, services }) {
  async function listGuilds(req, res) {
    const ids = req.session.adminGuildIds ?? [];
    const guilds = ids.length
      ? await repositories.guilds.find({ _id: { $in: ids }, active: true })
      : [];
    res.json({
      guilds: guilds.map((g) => ({ id: g._id, name: g.name, icon: g.iconHash })),
    });
  }

  async function getSettings(req, res) {
    const settings = await repositories.guildSettings.getOrCreate(req.guildId);
    res.json({ settings: serializeSettings(settings) });
  }

  async function patchSettings(req, res) {
    const update = buildSettingsUpdate(req.body);
    const settings = Object.keys(update).length
      ? await repositories.guildSettings.upsert({ guildId: req.guildId }, update)
      : await repositories.guildSettings.getOrCreate(req.guildId);
    res.json({ settings: serializeSettings(settings) });
  }

  async function listPlayers(req, res) {
    const players = await repositories.players.listByGuild(req.guildId);
    const puuids = [...new Set(players.map((p) => p.puuid))];
    const summoners = await repositories.summoners.findByPuuids(puuids);
    const byPuuid = new Map(summoners.map((s) => [s.puuid, s]));
    res.json({
      players: players.map((p) => {
        const s = byPuuid.get(p.puuid);
        return {
          discordUserId: p.discordUserId,
          summonerId: p.summonerId,
          nickname: p.nickname,
          primary: p.primary,
          riotId: s?.riotId ?? null,
          platform: s?.platform ?? null,
          ranked: s?.ranked ?? null,
        };
      }),
    });
  }

  async function deletePlayer(req, res) {
    const { discordUserId, summonerId } = req.params;
    const link = await repositories.players.findOne({
      guildId: req.guildId,
      discordUserId,
      summonerId,
    });
    if (!link) throw new NotFoundError('That link does not exist.');
    await repositories.players.unlink({ guildId: req.guildId, discordUserId, summonerId });
    await repositories.summoners.incTrackedGuildCount(link.puuid, -1);
    res.json({ ok: true });
  }

  async function listMatches(req, res) {
    const scope = await buildGuildScope(repositories, req.guildId);
    const limit = req.valid?.query?.limit ?? 20;
    const matches = scope.summonerIds.length
      ? await repositories.playerMatches.recentForSummoners(scope.summonerIds, limit)
      : [];
    res.json({ matches });
  }

  async function getLeaderboards(req, res) {
    const category = req.valid?.query?.category ?? 'highestRank';
    const period = req.valid?.query?.period ?? 'all';
    res.json(await services.leaderboard.compute(req.guildId, category, period));
  }

  async function getPlayerStats(req, res) {
    const { summonerId } = req.params;
    const [lifetime, summoner] = await Promise.all([
      services.stats.lifetime(summonerId),
      repositories.summoners.findById(summonerId),
    ]);
    res.json({
      summoner: summoner
        ? { riotId: summoner.riotId, platform: summoner.platform, ranked: summoner.ranked }
        : null,
      ...lifetime,
    });
  }

  return {
    listGuilds,
    getSettings,
    patchSettings,
    listPlayers,
    deletePlayer,
    listMatches,
    getLeaderboards,
    getPlayerStats,
  };
}
