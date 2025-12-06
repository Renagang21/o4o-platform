/**
 * Recommendation Scoring Utilities
 *
 * Helper functions for calculating product recommendation scores
 * based on cosmetics metadata matching
 */

/**
 * Calculate intersection score between two arrays
 * Returns the count of matching elements
 */
export function intersectionScore(arr1: string[], arr2: string[]): number {
  if (!arr1 || !arr2 || arr1.length === 0 || arr2.length === 0) {
    return 0;
  }

  const set2 = new Set(arr2.map(item => item.toLowerCase()));
  return arr1.filter(item => set2.has(item.toLowerCase())).length;
}

/**
 * Apply boolean condition with weight
 */
export function booleanScore(condition: boolean, weight: number): number {
  return condition ? weight : 0;
}

/**
 * Normalize score to 0-1 range
 */
export function normalizeScore(score: number, maxScore: number): number {
  if (maxScore === 0) return 0;
  return Math.min(1, score / maxScore);
}

/**
 * Calculate final recommendation score for a product
 */
export function calculateProductScore(
  product: {
    metadata?: {
      cosmetics_metadata?: {
        skinTypes?: string[];
        concerns?: string[];
        category?: string;
      };
    };
    brand?: string;
  },
  input: {
    skinTypes?: string[];
    concerns?: string[];
    brand?: string;
    category?: string;
  }
): number {
  const cosmeticsMetadata = product.metadata?.cosmetics_metadata || {};

  // Calculate individual scores
  const skinTypeMatches = intersectionScore(
    cosmeticsMetadata.skinTypes || [],
    input.skinTypes || []
  );

  const concernMatches = intersectionScore(
    cosmeticsMetadata.concerns || [],
    input.concerns || []
  );

  const brandMatch = input.brand && product.brand
    ? product.brand.toLowerCase() === input.brand.toLowerCase()
    : false;

  const categoryMatch = input.category && cosmeticsMetadata.category
    ? cosmeticsMetadata.category.toLowerCase() === input.category.toLowerCase()
    : false;

  // Weighted scoring:
  // - Concerns: 3 points per match (most important)
  // - Skin Types: 2 points per match
  // - Brand: 5 points for exact match
  // - Category: 3 points for exact match
  const score =
    (skinTypeMatches * 2) +
    (concernMatches * 3) +
    booleanScore(brandMatch, 5) +
    booleanScore(categoryMatch, 3);

  return score;
}
