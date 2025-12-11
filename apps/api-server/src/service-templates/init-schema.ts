/**
 * Service Initialization Schema
 * Phase 8 — Service Environment Initialization & Multi-Tenant Isolation
 *
 * Defines the structure for service initialization packs that configure
 * the initial environment when a new service is created.
 */

import type { ServiceGroup } from '../middleware/tenant-context.middleware.js';

// =============================================================================
// Menu Definitions
// =============================================================================

/**
 * Menu item definition for navigation
 */
export interface MenuItemDefinition {
  /** Unique identifier for this menu item */
  id: string;

  /** Display label */
  label: string;

  /** Icon name (lucide-react icon) */
  icon?: string;

  /** URL path for this menu item */
  path?: string;

  /** External URL (opens in new tab) */
  externalUrl?: string;

  /** Child menu items */
  children?: MenuItemDefinition[];

  /** Required permission to see this item */
  permission?: string;

  /** Sort order */
  order?: number;

  /** Whether this item is visible by default */
  visible?: boolean;
}

/**
 * Navigation menu definition
 */
export interface MenuDefinition {
  /** Menu identifier (e.g., 'main', 'footer', 'sidebar') */
  id: string;

  /** Menu label */
  label: string;

  /** Menu location (header, footer, sidebar) */
  location: 'header' | 'footer' | 'sidebar' | 'mobile';

  /** Menu items */
  items: MenuItemDefinition[];

  /** Whether this menu is active */
  isActive: boolean;
}

// =============================================================================
// Category Definitions
// =============================================================================

/**
 * Category definition for content organization
 */
export interface CategoryDefinition {
  /** Unique slug for this category */
  slug: string;

  /** Display name */
  name: string;

  /** Description */
  description?: string;

  /** Parent category slug (for hierarchical categories) */
  parentSlug?: string;

  /** Icon name */
  icon?: string;

  /** Sort order */
  order?: number;

  /** Associated CPT (custom post type) */
  cptSlug?: string;

  /** Custom metadata */
  meta?: Record<string, unknown>;
}

// =============================================================================
// Theme Preset Definitions
// =============================================================================

/**
 * Color palette definition
 */
export interface ColorPalette {
  primary: string;
  primaryLight?: string;
  primaryDark?: string;
  secondary: string;
  secondaryLight?: string;
  secondaryDark?: string;
  accent?: string;
  background: string;
  surface: string;
  text: string;
  textSecondary?: string;
  error?: string;
  warning?: string;
  success?: string;
  info?: string;
}

/**
 * Typography settings
 */
export interface TypographySettings {
  fontFamily: string;
  fontFamilyHeading?: string;
  fontSize: {
    xs: string;
    sm: string;
    base: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
  };
  fontWeight: {
    normal: number;
    medium: number;
    semibold: number;
    bold: number;
  };
  lineHeight: {
    tight: number;
    normal: number;
    relaxed: number;
  };
}

/**
 * Theme preset definition
 */
export interface ThemePresetDefinition {
  /** Unique preset identifier */
  id: string;

  /** Display name */
  name: string;

  /** Description */
  description?: string;

  /** Color palette */
  colors: ColorPalette;

  /** Typography settings */
  typography?: TypographySettings;

  /** Border radius values */
  borderRadius?: {
    none: string;
    sm: string;
    md: string;
    lg: string;
    full: string;
  };

  /** Shadow definitions */
  shadows?: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };

  /** Spacing scale */
  spacing?: Record<string, string>;

  /** CSS variables to inject */
  cssVariables?: Record<string, string>;
}

// =============================================================================
// Seed Data Definitions
// =============================================================================

/**
 * Seed data entry for initial content
 */
export interface SeedDataDefinition {
  /** Entity type (e.g., 'post', 'page', 'category') */
  entityType: string;

  /** CPT slug if applicable */
  cptSlug?: string;

  /** Data to seed */
  data: Record<string, unknown>;

  /** Whether to skip if data already exists */
  skipIfExists?: boolean;

  /** Unique key to check for existence */
  uniqueKey?: string;
}

// =============================================================================
// Settings Definitions
// =============================================================================

/**
 * Service settings definition
 */
export interface ServiceSettingsDefinition {
  /** General settings */
  general?: {
    siteName?: string;
    tagline?: string;
    timezone?: string;
    dateFormat?: string;
    language?: string;
  };

  /** SEO settings */
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    ogImage?: string;
    robotsTxt?: string;
  };

  /** Feature flags */
  features?: Record<string, boolean>;

  /** Custom settings */
  custom?: Record<string, unknown>;
}

// =============================================================================
// Service Init Pack
// =============================================================================

/**
 * Complete Service Initialization Pack
 *
 * Contains all data and configuration needed to initialize
 * a new service environment after apps are installed.
 */
export interface ServiceInitPack {
  /** Init pack identifier (matches template ID) */
  id: string;

  /** Display name */
  name: string;

  /** Description */
  description?: string;

  /** Service group this init pack is for */
  serviceGroup: ServiceGroup;

  /** Version number */
  version: string;

  /** Default navigation menus */
  defaultMenus?: MenuDefinition[];

  /** Default categories */
  defaultCategories?: CategoryDefinition[];

  /** Default service settings */
  defaultSettings?: ServiceSettingsDefinition;

  /** Default theme preset ID */
  defaultTheme?: string;

  /** Theme preset definition (if custom) */
  themePreset?: ThemePresetDefinition;

  /** Seed data to create */
  seedData?: SeedDataDefinition[];

  /** Pages to create */
  defaultPages?: Array<{
    slug: string;
    title: string;
    content?: string;
    template?: string;
    isHomepage?: boolean;
  }>;

  /** User roles to create */
  defaultRoles?: Array<{
    name: string;
    slug: string;
    permissions: string[];
    isDefault?: boolean;
  }>;

  /** Hooks to run after initialization */
  postInitHooks?: string[];
}

// =============================================================================
// Initialization Result
// =============================================================================

/**
 * Service initialization result
 */
export interface ServiceInitResult {
  /** Whether initialization succeeded */
  success: boolean;

  /** Tenant ID */
  tenantId: string;

  /** Organization ID */
  organizationId: string;

  /** Init pack used */
  initPackId: string;

  /** Menus created */
  menusCreated: number;

  /** Categories created */
  categoriesCreated: number;

  /** Pages created */
  pagesCreated: number;

  /** Seed data entries created */
  seedDataCreated: number;

  /** Theme applied */
  themeApplied?: string;

  /** Settings applied */
  settingsApplied: boolean;

  /** Errors encountered */
  errors: Array<{ step: string; error: string }>;

  /** Warnings (non-fatal issues) */
  warnings: Array<{ step: string; message: string }>;

  /** Total initialization time in ms */
  initializationTimeMs: number;
}

// =============================================================================
// Init Pack Registry Entry
// =============================================================================

/**
 * Init pack registry entry
 */
export interface InitPackRegistryEntry {
  initPack: ServiceInitPack;
  loadedAt: Date;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Default menu locations
 */
export const MENU_LOCATIONS = ['header', 'footer', 'sidebar', 'mobile'] as const;

/**
 * Default entity types for seed data
 */
export const SEED_ENTITY_TYPES = [
  'post',
  'page',
  'category',
  'tag',
  'media',
  'user',
  'role',
  'setting',
] as const;
