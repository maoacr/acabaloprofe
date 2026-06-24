import type { PointBreakdown, PredictionInput, ResultInput } from './types';

/**
 * Pure function. SINGLE source of truth for scoring.
 *
 * Rules (locked in spec REQ-SCORE-001):
 *  - Knockout multiplier = 2, group stage multiplier = 1
 *  - winnerPoints: 5 (group) / 10 (knockout) if predicted sign matches actual sign
 *  - homeGoalsPoints: 2 (group) / 4 (knockout) if predicted home goals == actual home goals
 *  - awayGoalsPoints: 2 (group) / 4 (knockout) if predicted away goals == actual away goals
 *  - diffPoints: 1 (group) / 2 (knockout) if |pred home - pred away| == |actual home - actual away|
 *  - Result counts only 90 min + stoppage (NOT extra time, NOT penalties).
 *    The match result is passed in already filtered by the caller.
 */
export function calculatePoints(
  prediction: PredictionInput,
  result: ResultInput,
  isKnockout: boolean,
): PointBreakdown {
  const multiplier = isKnockout ? 2 : 1;
  const sign = (n: number): -1 | 0 | 1 => (n > 0 ? 1 : n < 0 ? -1 : 0);

  const predictedWinner = sign(prediction.home - prediction.away);
  const actualWinner = sign(result.home - result.away);
  const predictedDiff = Math.abs(prediction.home - prediction.away);
  const actualDiff = Math.abs(result.home - result.away);

  const winnerPoints = predictedWinner === actualWinner ? 5 * multiplier : 0;
  const homeGoalsPoints = prediction.home === result.home ? 2 * multiplier : 0;
  const awayGoalsPoints = prediction.away === result.away ? 2 * multiplier : 0;
  const diffPoints = predictedDiff === actualDiff ? 1 * multiplier : 0;

  return {
    winnerPoints,
    homeGoalsPoints,
    awayGoalsPoints,
    diffPoints,
    totalPoints: winnerPoints + homeGoalsPoints + awayGoalsPoints + diffPoints,
  };
}

/** Maximum points a prediction can earn in a single match. */
export function maxPointsForMatch(isKnockout: boolean): number {
  return isKnockout ? 20 : 10;
}

/** Whether a match result is a draw. */
export function isDraw(result: ResultInput): boolean {
  return result.home === result.away;
}
