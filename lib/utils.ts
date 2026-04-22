/**
 * Calculates statistical confidence that treatment outperforms control.
 * Uses normal approximation to binomial distribution.
 *
 * @param visitsA - Total visits for the control variant.
 * @param convsA - Total conversions for the control variant.
 * @param visitsB - Total visits for the treatment variant.
 * @param convsB - Total conversions for the treatment variant.
 * @returns 0–99 (never 100). Returns 0 if either variant has zero visits.
 */
export function getConfidence(
  visitsA: number,
  convsA: number,
  visitsB: number,
  convsB: number
): number {
  if (visitsA === 0 || visitsB === 0) {
    return 0;
  }

  const rateA = convsA / visitsA;
  const rateB = convsB / visitsB;

  if (rateA === rateB) {
    return 50;
  }

  const pooled = (convsA + convsB) / (visitsA + visitsB);
  const standardError = Math.sqrt(pooled * (1 - pooled) * (1 / visitsA + 1 / visitsB));

  if (standardError === 0) {
    return 0;
  }

  const zScore = Math.abs(rateB - rateA) / standardError;

  return Math.min(
    99,
    Math.round((1 - Math.exp(-0.717 * zScore - 0.416 * zScore * zScore)) * 100)
  );
}
