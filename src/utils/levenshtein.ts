/**
 * Fast Levenshtein distance implementation for typo detection and suggestions.
 */
export function levenshteinDistance(a: string, b: string): number {
  const an = a.length;
  const bn = b.length;
  if (an === 0) return bn;
  if (bn === 0) return an;

  const matrix: number[] = new Array((an + 1) * (bn + 1));

  for (let i = 0; i <= an; i++) {
    matrix[i] = i;
  }
  for (let j = 0; j <= bn; j++) {
    matrix[j * (an + 1)] = j;
  }

  for (let j = 1; j <= bn; j++) {
    for (let i = 1; i <= an; i++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const index = i + j * (an + 1);
      matrix[index] = Math.min(
        matrix[i - 1 + j * (an + 1)] + 1, // deletion
        matrix[i + (j - 1) * (an + 1)] + 1, // insertion
        matrix[i - 1 + (j - 1) * (an + 1)] + cost // substitution
      );
    }
  }

  return matrix[an + bn * (an + 1)];
}

/**
 * Finds the closest candidate string within a maximum edit distance.
 */
export function findClosestMatch(
  target: string,
  candidates: readonly string[],
  maxDistance = 4
): string | undefined {
  let closest: string | undefined;
  let minDistance = maxDistance + 1;

  for (const candidate of candidates) {
    const dist = levenshteinDistance(target.toLowerCase(), candidate.toLowerCase());
    if (dist < minDistance) {
      minDistance = dist;
      closest = candidate;
    }
  }

  return closest;
}
