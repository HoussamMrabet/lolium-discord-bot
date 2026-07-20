/**
 * Pure win/loss streak math. `current` is signed: +N = N-win streak, -N = N-loss
 * streak. A win extends a positive streak or resets to +1; a loss the mirror.
 */
export function applyResult(streak, win) {
  const current = streak?.current ?? 0;
  const next = win
    ? current >= 0
      ? current + 1
      : 1
    : current <= 0
      ? current - 1
      : -1;
  return {
    current: next,
    longestWin: Math.max(streak?.longestWin ?? 0, next > 0 ? next : 0),
    longestLoss: Math.max(streak?.longestLoss ?? 0, next < 0 ? -next : 0),
  };
}

/**
 * Returns a milestone when the streak magnitude exactly hits a configured
 * threshold (so we announce a "5-win streak" once, not every game after).
 */
export function streakMilestone(current, thresholds = [3, 5, 10]) {
  const magnitude = Math.abs(current);
  if (!thresholds.includes(magnitude)) return null;
  return { magnitude, type: current > 0 ? 'win' : 'loss' };
}
