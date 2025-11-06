/**
 * @o4o/appearance-system
 *
 * Single Source of Truth (SSOT) for all appearance-related functionality
 * in the O4O Platform.
 *
 * This package consolidates:
 * - Design tokens (colors, spacing, typography, etc.)
 * - CSS generation logic
 * - Style injection utilities
 *
 * Usage:
 * ```typescript
 * import { defaultTokens, generateAllCSS, injectCSS } from '@o4o/appearance-system';
 *
 * const css = generateAllCSS(defaultTokens);
 * injectCSS(css, 'o4o-appearance');
 * ```
 *
 * @see /docs/APPEARANCE_TOKENS.md - Token reference
 * @see /docs/APPEARANCE_CLEANUP_PLAN.md - Migration plan
 */

// Export tokens
export {
  defaultTokens,
  generateCSSVariables,
  type DesignTokens,
  type ColorTokens,
  type SpacingTokens,
  type RadiusTokens,
  type TypographyTokens,
} from './tokens.js';

// Export CSS generators
export {
  generateButtonCSS,
  generateBreadcrumbCSS,
  generateHeaderCSS,
  generateMiniCartCSS,
  generateScrollToTopCSS,
  generateAllCSS,
} from './css-generators.js';

// Export injection utilities
export {
  injectCSS,
  removeCSS,
  createStyleElement,
  scopeCSS,
  STYLE_IDS,
} from './inject.js';
