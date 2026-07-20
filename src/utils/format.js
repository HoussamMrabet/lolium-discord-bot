/** Win rate as a whole-number percent (0 when no games). */
export function winRate(wins = 0, losses = 0) {
  const games = wins + losses;
  return games > 0 ? Math.round((wins / games) * 100) : 0;
}

/** KDA ratio; a deathless game counts kills+assists as a "perfect" ratio. */
export function kda(kills = 0, deaths = 0, assists = 0) {
  if (deaths === 0) return kills + assists;
  return Number(((kills + assists) / deaths).toFixed(2));
}

/** Compact large numbers, e.g. 24,300 -> "24.3K". */
export function compact(n) {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(n || 0);
}

/** Rounds to one decimal (for averages like CS/min). */
export function round1(n) {
  return Math.round((n || 0) * 10) / 10;
}
