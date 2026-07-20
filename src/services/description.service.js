import { DESCRIPTION_TEMPLATES } from '../embeds/templates/descriptions.js';
import { PERFORMANCE_BUCKETS } from '../config/constants.js';

/** Stable string hash -> index in [0, len). */
function seededIndex(seed, len) {
  if (!len) return 0;
  let hash = 0;
  const str = String(seed);
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash % len;
}

function interpolate(template, ctx) {
  return template.replace(/\{(\w+)\}/g, (_, key) =>
    ctx[key] === undefined || ctx[key] === null ? '' : String(ctx[key]),
  );
}

/**
 * Builds the funny match description for a performance bucket. Deterministic:
 * the same `seed` (matchId:summonerId) always yields the same line, so
 * re-rendering an alert is stable.
 */
export function buildDescription({
  bucket,
  name,
  champion,
  kills = 0,
  deaths = 0,
  assists = 0,
  kda = 0,
  seed,
}) {
  const list =
    DESCRIPTION_TEMPLATES[bucket] ??
    DESCRIPTION_TEMPLATES[PERFORMANCE_BUCKETS.AVERAGE];
  const template = list[seededIndex(seed ?? `${name}:${champion}`, list.length)];
  return interpolate(template, { name, champion, kills, deaths, assists, kda });
}

export default buildDescription;
