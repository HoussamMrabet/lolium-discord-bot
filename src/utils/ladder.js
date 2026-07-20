import { TIERS, DIVISIONS, APEX_TIERS } from '../config/constants.js';

/**
 * Ranked-ladder math.
 *
 * Raw LP is meaningless across division boundaries (Gold IV 98 -> Gold III 12 is
 * a GAIN, not a -86 loss). We collapse (tier, division, lp) into a single
 * monotonically increasing integer `absoluteLp` so deltas, leaderboards, and
 * graphs are correct everywhere.
 *
 * Encoding:
 *   non-apex: absoluteLp = tierIndex * 400 + divisionIndex * 100 + lp
 *             (4 divisions * 100 LP = 400 LP per tier)
 *   apex (Master/GM/Challenger): one continuous pool above Diamond I 99,
 *             absoluteLp = APEX_BASE + lp   (divisions are ignored)
 *
 * Master/GM/Challenger differ only by dynamic league cutoffs, not by a real LP
 * reset, so they share one continuous scale — the `tier` name is stored
 * separately for display.
 */

const LP_PER_DIVISION = 100;
const DIVISIONS_PER_TIER = 4;
const TIER_SPAN = LP_PER_DIVISION * DIVISIONS_PER_TIER; // 400
const APEX_BASE = TIERS.indexOf('MASTER') * TIER_SPAN; // 2800

/** @returns {number} tier position (0 = IRON ... 9 = CHALLENGER), or -1. */
export function tierIndex(tier) {
  return tier ? TIERS.indexOf(tier) : -1;
}

/** @returns {number} division position (0 = IV ... 3 = I), or -1. */
export function divisionIndex(division) {
  return division ? DIVISIONS.indexOf(division) : -1;
}

export function isApex(tier) {
  return APEX_TIERS.includes(tier);
}

/**
 * Collapses a ranked entry into a single comparable integer.
 * Unranked (no tier) encodes to 0.
 * @param {{tier?: string|null, division?: string|null, lp?: number}|null} entry
 * @returns {number}
 */
export function absoluteLp(entry) {
  if (!entry || !entry.tier) return 0;
  const { tier, division, lp = 0 } = entry;
  if (isApex(tier)) return APEX_BASE + lp;

  const ti = tierIndex(tier);
  const di = divisionIndex(division);
  if (ti < 0 || di < 0) return 0;
  return ti * TIER_SPAN + di * LP_PER_DIVISION + lp;
}

/**
 * Compares two ranked entries by ladder position.
 * @returns {-1|0|1}
 */
export function compareRank(a, b) {
  const av = absoluteLp(a);
  const bv = absoluteLp(b);
  if (av < bv) return -1;
  if (av > bv) return 1;
  return 0;
}

/**
 * Describes the transition between two ranked snapshots.
 * `promotion`/`demotion` reflect a TIER change specifically (Gold -> Platinum),
 * which is what drives promotion alerts; `divisionChanged` catches within-tier
 * movement (Gold IV -> Gold III).
 */
export function diffRanks(before, after) {
  const beforeLp = absoluteLp(before);
  const afterLp = absoluteLp(after);
  const beforeTier = before?.tier ?? null;
  const afterTier = after?.tier ?? null;
  const beforeDivision = before?.division ?? null;
  const afterDivision = after?.division ?? null;

  const tierChanged = beforeTier !== afterTier;
  const bt = tierIndex(beforeTier);
  const at = tierIndex(afterTier);

  return {
    lpDelta: afterLp - beforeLp,
    direction: afterLp > beforeLp ? 'up' : afterLp < beforeLp ? 'down' : 'same',
    tierChanged,
    divisionChanged: beforeDivision !== afterDivision,
    promotion: tierChanged && at > bt,
    demotion: tierChanged && at >= 0 && bt >= 0 && at < bt,
    placement: !beforeTier && !!afterTier, // unranked -> ranked
  };
}

const TITLE_CASE = (t) =>
  t ? t.charAt(0) + t.slice(1).toLowerCase() : t;

/**
 * Human-readable rank, e.g. "Gold II (45 LP)" or "Challenger (1,204 LP)".
 */
export function formatRank(entry) {
  if (!entry || !entry.tier) return 'Unranked';
  const { tier, division, lp = 0 } = entry;
  const lpText = `${lp.toLocaleString('en-US')} LP`;
  if (isApex(tier)) return `${TITLE_CASE(tier)} (${lpText})`;
  return `${TITLE_CASE(tier)} ${division} (${lpText})`;
}

export const ladderConstants = Object.freeze({
  LP_PER_DIVISION,
  DIVISIONS_PER_TIER,
  TIER_SPAN,
  APEX_BASE,
});
