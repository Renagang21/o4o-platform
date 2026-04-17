/**
 * Store Settings — Common Types
 *
 * WO-STORE-COMMON-SETTINGS-FOUNDATION-V1
 *
 * Platform-wide canonical types for storefront_config (JSONB),
 * block layout, channel config, and template.
 *
 * All services (KPA, GlycoPharm, K-Cosmetics) share these types.
 */

// ── Templates ────────────────────────────────────────────────────────────────

/**
 * Unified template enum.
 *
 * Migration mapping from legacy service-specific names:
 *   KPA "standard"  → BASIC
 *   KPA "compact"   → MINIMAL
 *   KPA "visual"    → CONTENT_FOCUS
 *   KPA "minimal"   → MINIMAL
 */
export type StoreTemplate = 'BASIC' | 'COMMERCE_FOCUS' | 'CONTENT_FOCUS' | 'MINIMAL';

export const VALID_TEMPLATES: StoreTemplate[] = ['BASIC', 'COMMERCE_FOCUS', 'CONTENT_FOCUS', 'MINIMAL'];

// ── Themes ───────────────────────────────────────────────────────────────────

export type StoreTheme = 'professional' | 'neutral' | 'clean' | 'modern';

export const VALID_THEMES: StoreTheme[] = ['professional', 'neutral', 'clean', 'modern'];

// ── Blocks ───────────────────────────────────────────────────────────────────

export type StoreBlockType =
  | 'HERO'
  | 'PRODUCT_GRID'
  | 'BLOG_LIST'
  | 'INFO_SECTION'
  | 'TABLET_PROMO'
  | 'SIGNAGE_PROMO';

export const VALID_BLOCK_TYPES: StoreBlockType[] = [
  'HERO', 'PRODUCT_GRID', 'BLOG_LIST', 'INFO_SECTION', 'TABLET_PROMO', 'SIGNAGE_PROMO',
];

export interface StoreBlock {
  type: StoreBlockType;
  enabled: boolean;
  config?: Record<string, any>;
}

// ── Storefront Config ─────────────────────────────────────────────────────────

/**
 * Canonical storefront_config structure.
 * Stored as JSONB in organizations.storefront_config.
 *
 * Backward compat:
 *   - blocks: if null/undefined, derived from storefront_blocks or template
 *   - template: if null/undefined, derived from template_profile column
 *   - theme: defaults to 'professional' if missing
 *   - components: KPA legacy toggle map (maps to block.enabled in new model)
 */
export interface StorefrontConfig {
  template?: StoreTemplate;
  theme?: StoreTheme;
  blocks?: StoreBlock[];
  /**
   * Component visibility map — KPA legacy.
   * New code should prefer blocks[].enabled instead.
   */
  components?: Record<string, boolean>;
  /**
   * Service-specific extensions.
   * Use for fields that don't fit the common model.
   */
  customizations?: Record<string, any>;
}

// ── Channels ─────────────────────────────────────────────────────────────────

export type ChannelType = 'B2C' | 'KIOSK' | 'TABLET' | 'SIGNAGE';
export type ChannelStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'SUSPENDED'
  | 'EXPIRED'
  | 'TERMINATED';

export const VALID_CHANNEL_TYPES: ChannelType[] = ['B2C', 'KIOSK', 'TABLET', 'SIGNAGE'];

export interface B2CChannelConfig {
  enabled: boolean;
  visibilityMode?: 'PUBLIC' | 'PRIVATE';
  productLimit?: number;
}

export interface KioskChannelConfig {
  enabled: boolean;
  pin?: string;
  autoResetMinutes?: number;
  productLimit?: number;
}

export interface TabletChannelConfig {
  enabled: boolean;
  pin?: string;
  autoResetMinutes?: number;
  slideShowIntervalSeconds?: number;
}

export interface SignageChannelConfig {
  enabled: boolean;
  playlistId?: string;
  autoRotateSeconds?: number;
}

export type ChannelConfig =
  | B2CChannelConfig
  | KioskChannelConfig
  | TabletChannelConfig
  | SignageChannelConfig;

export interface StoreChannel {
  id: string;
  type: ChannelType;
  status: ChannelStatus;
  config: ChannelConfig | null;
  approvedAt: string | null;
  createdAt: string;
}

// ── Settings Response ─────────────────────────────────────────────────────────

export interface StoreSettingsData {
  storeId: string;
  slug: string;
  settings: {
    template: StoreTemplate;
    theme: StoreTheme;
    blocks: StoreBlock[];
    components: Record<string, boolean>;
    customizations: Record<string, any>;
  };
  channels: StoreChannel[];
}
