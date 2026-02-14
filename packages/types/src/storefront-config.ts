// =============================================================================
// STOREFRONT CONFIGURATION TYPES
// =============================================================================
// WO-O4O-STOREFRONT-STABILIZATION-V1 Phase 1
// Type-only definitions — NO runtime code except const arrays for validation.

/** Store theme name */
export type StorefrontTheme = 'neutral' | 'clean' | 'modern' | 'professional';

/** Store template name */
export type StorefrontTemplate = 'franchise-standard';

/** Hero content source */
export type StorefrontHeroSource = 'operator' | 'pharmacy' | 'default';

/** Hero content item stored in storefront_config.heroContents */
export interface StorefrontHeroContent {
  id: string;
  source: StorefrontHeroSource;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  ctaText?: string;
  ctaLink?: string;
  isActive: boolean;
  priority: number;
}

/** The full storefront_config JSONB shape */
export interface StorefrontConfig {
  theme?: StorefrontTheme;
  template?: StorefrontTemplate;
  heroContents?: StorefrontHeroContent[];
}

/** Allowed theme values for runtime validation */
export const STOREFRONT_THEMES = [
  'neutral', 'clean', 'modern', 'professional',
] as const;

/** Allowed template values for runtime validation */
export const STOREFRONT_TEMPLATES = [
  'franchise-standard',
] as const;

/** Allowed hero source values for runtime validation */
export const STOREFRONT_HERO_SOURCES = [
  'operator', 'pharmacy', 'default',
] as const;
