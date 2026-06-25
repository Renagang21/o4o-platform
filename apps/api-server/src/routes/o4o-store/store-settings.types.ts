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
 *
 * WO-O4O-STORE-HOME-DESIGN-UNUSED-FIELDS-CLEANUP-V1:
 *   레거시 고아 필드 `components`/`customizations` 제거 — 3서비스 프론트 미참조 +
 *   공개 storefront 렌더 미사용 + 운영 DB 0건(키 부재). (IR-O4O-KPA-STORE-HOME-DESIGN-UNUSED-SETTINGS-AUDIT-V1)
 */
export interface StorefrontConfig {
  template?: StoreTemplate;
  theme?: StoreTheme;
  blocks?: StoreBlock[];
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
  };
  channels: StoreChannel[];
}
