/**
 * Slug Validation Utilities
 *
 * WO-CORE-STORE-SLUG-SYSTEM-V1
 *
 * Validation rules for store slugs.
 */

import { isReservedSlug } from '../constants/reserved-slugs.js';

/**
 * Slug validation constraints
 */
export const SLUG_CONSTRAINTS = {
  MIN_LENGTH: 3,
  MAX_LENGTH: 120,
  /**
   * Pattern allows:
   * - Korean characters (가-힣)
   * - Lowercase letters (a-z)
   * - Numbers (0-9)
   * - Hyphens (-) but not at start/end
   */
  PATTERN: /^[a-z0-9\uAC00-\uD7AF]([a-z0-9\uAC00-\uD7AF-]*[a-z0-9\uAC00-\uD7AF])?$/,
  /**
   * Pattern to detect consecutive hyphens
   */
  CONSECUTIVE_HYPHEN_PATTERN: /--+/,
} as const;

/**
 * Slug validation result
 */
export interface SlugValidationResult {
  valid: boolean;
  error?: SlugValidationError;
}

export type SlugValidationError =
  | 'TOO_SHORT'
  | 'TOO_LONG'
  | 'INVALID_CHARACTERS'
  | 'STARTS_WITH_HYPHEN'
  | 'ENDS_WITH_HYPHEN'
  | 'CONSECUTIVE_HYPHENS'
  | 'RESERVED';

/**
 * Validate a slug against all rules
 */
export function validateSlug(slug: string): SlugValidationResult {
  // Length checks
  if (slug.length < SLUG_CONSTRAINTS.MIN_LENGTH) {
    return { valid: false, error: 'TOO_SHORT' };
  }

  if (slug.length > SLUG_CONSTRAINTS.MAX_LENGTH) {
    return { valid: false, error: 'TOO_LONG' };
  }

  // Hyphen position checks
  if (slug.startsWith('-')) {
    return { valid: false, error: 'STARTS_WITH_HYPHEN' };
  }

  if (slug.endsWith('-')) {
    return { valid: false, error: 'ENDS_WITH_HYPHEN' };
  }

  // Consecutive hyphens check
  if (SLUG_CONSTRAINTS.CONSECUTIVE_HYPHEN_PATTERN.test(slug)) {
    return { valid: false, error: 'CONSECUTIVE_HYPHENS' };
  }

  // Pattern check (valid characters)
  if (!SLUG_CONSTRAINTS.PATTERN.test(slug)) {
    return { valid: false, error: 'INVALID_CHARACTERS' };
  }

  // Reserved slug check
  if (isReservedSlug(slug)) {
    return { valid: false, error: 'RESERVED' };
  }

  return { valid: true };
}

/**
 * Generate a slug from a store name
 *
 * Rules:
 * - Preserves Korean characters
 * - Converts to lowercase
 * - Replaces spaces with hyphens
 * - Removes invalid characters
 * - Collapses consecutive hyphens
 * - Trims to max length
 */
export function generateSlugFromName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    // Keep Korean, alphanumeric, spaces, hyphens
    .replace(/[^\w\uAC00-\uD7AF\s-]/g, '')
    // Spaces to hyphens
    .replace(/\s+/g, '-')
    // Collapse multiple hyphens
    .replace(/-+/g, '-')
    // Trim leading/trailing hyphens
    .replace(/^-+|-+$/g, '')
    // Max length
    .slice(0, SLUG_CONSTRAINTS.MAX_LENGTH);
}

/**
 * Normalize a slug (lowercase, trim)
 */
export function normalizeSlug(slug: string): string {
  return slug.toLowerCase().trim();
}
