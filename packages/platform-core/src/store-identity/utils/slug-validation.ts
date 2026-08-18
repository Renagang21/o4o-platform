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
 * WO-O4O-STORE-SLUG-CANONICAL-CONTRACT-HARDENING-V1 §4:
 *   생성 규칙과 `validateSlug` 규칙은 반드시 일치해야 한다.
 *   (구) 구현은 `\w` 를 보존 문자 집합에 써서 `_` 를 남겼고, 그 결과
 *   `"E2E_TEST Pharmacy"` → `e2e_test-pharmacy` 처럼 **validator 가 거부하는 slug**
 *   를 생성해 `generateUniqueSlug` 가 100회 재시도 후 throw 했다.
 *   또 MAX_LENGTH 절단이 말단 하이픈을 남길 수 있었다.
 *
 * Rules:
 * - Preserves Korean characters
 * - Converts to lowercase
 * - Converts underscore/whitespace runs to the canonical separator (-)
 * - Removes characters outside the validator's allowed set
 * - Collapses consecutive hyphens
 * - Trims leading/trailing hyphens (절단 이후에도 재확인)
 */
export function generateSlugFromName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    // underscore / whitespace → canonical separator
    .replace(/[_\s]+/g, '-')
    // validator 허용 문자 집합(a-z, 0-9, 한글, -) 외 제거
    .replace(/[^a-z0-9가-힯-]/g, '')
    // Collapse multiple hyphens
    .replace(/-+/g, '-')
    // Trim leading/trailing hyphens
    .replace(/^-+|-+$/g, '')
    // Max length
    .slice(0, SLUG_CONSTRAINTS.MAX_LENGTH)
    // 절단으로 생긴 말단 하이픈 제거
    .replace(/-+$/g, '');
}

/**
 * 이름 기반 채번의 **base slug** 를 validator 계약에 맞춰 보정한다.
 *
 * WO-O4O-STORE-SLUG-CANONICAL-CONTRACT-HARDENING-V1 §4:
 *   `generateSlugFromName` 이 빈 문자열을 돌려주는 이름(예: `"!!!"`, `"___"`)은
 *   숫자 suffix 재시도(`-1` … `-100`)로도 유효 slug 가 되지 않는다(`-1` 은 STARTS_WITH_HYPHEN).
 *   이 경우에만 fallback base 를 쓴다. TOO_SHORT / RESERVED 는 기존대로
 *   숫자 suffix 로 해소되므로 base 를 바꾸지 않는다(기존 채번 결과 회귀 0).
 */
export const SLUG_FALLBACK_BASE = 'my-store';

export function toValidSlugBase(name: string, fallback: string = SLUG_FALLBACK_BASE): string {
  const base = generateSlugFromName(name);
  if (base.length > 0) return base;
  const normalizedFallback = generateSlugFromName(fallback);
  return normalizedFallback.length > 0 ? normalizedFallback : SLUG_FALLBACK_BASE;
}

/**
 * Normalize a slug (lowercase, trim)
 */
export function normalizeSlug(slug: string): string {
  return slug.toLowerCase().trim();
}
