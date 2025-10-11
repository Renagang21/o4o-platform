/**
 * Schema Migration Utility
 * Handles migration of customizer settings between versions
 * Ensures backward compatibility and data integrity
 */

// ============================================
// Version Constants
// ============================================

const CURRENT_VERSION = '1.0.0';
const LEGACY_VERSION = '0.0.0';

// ============================================
// Color Mapping Table
// ============================================

/**
 * Maps legacy color codes to new Tailwind-based colors
 */
const COLOR_MAPPING: Record<string, string> = {
  // Primary colors
  '#0073aa': '#3b82f6', // Old WordPress Blue → Tailwind Blue 500
  '#005177': '#2563eb', // Old WordPress Dark Blue → Tailwind Blue 600

  // Secondary colors
  '#ff6b6b': '#ef4444', // Old Red → Tailwind Red 500
  '#e74c3c': '#dc2626', // Old Dark Red → Tailwind Red 600

  // Success/Info colors
  '#4ecdc4': '#14b8a6', // Old Teal → Tailwind Teal 500
  '#00d2d3': '#06b6d4', // Old Cyan → Tailwind Cyan 500

  // Warning colors
  '#f7b731': '#f59e0b', // Old Orange → Tailwind Amber 500

  // Purple/Violet
  '#5f27cd': '#8b5cf6', // Old Purple → Tailwind Violet 500

  // Additional palette
  '#ff9ff3': '#f0abfc', // Pink
  '#54a0ff': '#60a5fa', // Light Blue
  '#48dbfb': '#38bdf8', // Sky Blue
};

/**
 * Check if a string is a valid hex color
 */
function isValidHexColor(color: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
}

/**
 * Map legacy color to new color if exists in mapping table
 */
export function mapLegacyColor(color: string): string {
  if (!color || !isValidHexColor(color)) {
    return color;
  }

  return COLOR_MAPPING[color.toLowerCase()] || color;
}

/**
 * Recursively map all color values in an object
 */
function mapColorsInObject(obj: any): any {
  if (typeof obj === 'string' && isValidHexColor(obj)) {
    return mapLegacyColor(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => mapColorsInObject(item));
  }

  if (obj !== null && typeof obj === 'object') {
    const result: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        result[key] = mapColorsInObject(obj[key]);
      }
    }
    return result;
  }

  return obj;
}

// ============================================
// Version Detection
// ============================================

/**
 * Detect version of customizer settings
 */
export function detectVersion(settings: any): string {
  // Check if _meta exists and has version
  if (settings?._meta?.version) {
    return settings._meta.version;
  }

  // Check if it's legacy structure (pre-v1.0.0)
  // Legacy indicators:
  // - No _meta field
  // - Has old color codes
  // - Missing new sections (scrollToTop, buttons, breadcrumbs)
  const hasLegacyStructure =
    !settings?._meta &&
    (settings?.colors?.primaryColor === '#0073aa' ||
      !settings?.scrollToTop ||
      !settings?.buttons ||
      !settings?.breadcrumbs);

  return hasLegacyStructure ? LEGACY_VERSION : CURRENT_VERSION;
}

// ============================================
// Migration Functions
// ============================================

/**
 * Migrate from legacy structure to v1.0.0
 */
export function migrateFromLegacy(legacySettings: any): any {
  // Start with legacy settings as base
  const migrated: any = { ...legacySettings };

  // Add missing General section settings with defaults
  if (!migrated.scrollToTop) {
    migrated.scrollToTop = {
      enabled: true,
      displayType: 'both',
      threshold: 300,
      backgroundColor: '#3b82f6',
      iconColor: '#ffffff',
      position: 'right',
    };
  }

  if (!migrated.buttons) {
    migrated.buttons = {
      primary: {
        backgroundColor: '#3b82f6',
        textColor: '#ffffff',
        borderWidth: 0,
        borderColor: '#3b82f6',
        borderStyle: 'solid',
        borderRadius: 4,
        paddingVertical: 12,
        paddingHorizontal: 24,
        hoverBackgroundColor: '#2563eb',
        hoverTextColor: '#ffffff',
        hoverBorderColor: '#2563eb',
        transitionDuration: 200,
        fontSize: { desktop: 16, tablet: 15, mobile: 14 },
        fontWeight: 500,
        textTransform: 'none',
        letterSpacing: 0,
      },
    };
  }

  if (!migrated.breadcrumbs) {
    migrated.breadcrumbs = {
      enabled: true,
      position: 'below-header',
      homeText: 'Home',
      separator: '>',
      showCurrentPage: true,
      showOnHomepage: false,
      linkColor: '#3b82f6',
      currentPageColor: '#6b7280',
      separatorColor: '#9ca3af',
      hoverColor: '#2563eb',
      fontSize: { desktop: 14, tablet: 13, mobile: 12 },
      fontWeight: 400,
      textTransform: 'none',
      itemSpacing: 8,
      marginTop: 16,
      marginBottom: 16,
      showIcons: false,
      mobileHidden: false,
    };
  }

  // Map all legacy colors to new colors
  const withMappedColors = mapColorsInObject(migrated);

  // Add _meta field
  withMappedColors._meta = {
    version: CURRENT_VERSION,
    lastModified: new Date().toISOString(),
    isDirty: false,
    migratedFrom: LEGACY_VERSION,
    migrationDate: new Date().toISOString(),
  };

  return withMappedColors;
}

/**
 * Main migration function - routes to appropriate migration
 */
export function migrateCustomizerSettings(settings: any): any {
  if (!settings || typeof settings !== 'object') {
    return settings;
  }

  const version = detectVersion(settings);

  // Already current version - no migration needed
  if (version === CURRENT_VERSION) {
    return settings;
  }

  // Migrate from legacy
  if (version === LEGACY_VERSION) {
    console.log('[Migration] Migrating customizer settings from legacy to v1.0.0');
    return migrateFromLegacy(settings);
  }

  // Unknown version - return as is (future versions would be handled here)
  console.warn(`[Migration] Unknown customizer settings version: ${version}`);
  return settings;
}

/**
 * Validate migration result
 */
export function validateMigration(settings: any): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check required sections
  const requiredSections = [
    'siteIdentity',
    'colors',
    'typography',
    'container',
    'sidebar',
    'header',
    'footer',
    'blog',
  ];

  for (const section of requiredSections) {
    if (!settings[section]) {
      errors.push(`Missing required section: ${section}`);
    }
  }

  // Check _meta field
  if (!settings._meta) {
    errors.push('Missing _meta field');
  } else {
    if (!settings._meta.version) {
      errors.push('Missing _meta.version');
    }
    if (!settings._meta.lastModified) {
      errors.push('Missing _meta.lastModified');
    }
  }

  // Check color format in colors section
  if (settings.colors) {
    const colorFields = ['primaryColor', 'secondaryColor', 'textColor', 'borderColor'];
    for (const field of colorFields) {
      const color = settings.colors[field];
      if (color && typeof color === 'string' && !isValidHexColor(color)) {
        errors.push(`Invalid color format for colors.${field}: ${color}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get default settings structure for v1.0.0
 * Used as fallback when no settings exist
 */
export function getDefaultSettingsV1(): any {
  return {
    siteIdentity: {
      logo: {
        desktop: null,
        mobile: null,
        width: { desktop: 200, tablet: 180, mobile: 150 },
      },
      siteTitle: {
        show: true,
        text: 'O4O Platform',
        color: { normal: '#000000', hover: '#3b82f6' },
        typography: {
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: { desktop: 30, tablet: 26, mobile: 22 },
          fontWeight: 700,
          lineHeight: { desktop: 1.2, tablet: 1.2, mobile: 1.2 },
          letterSpacing: { desktop: 0, tablet: 0, mobile: 0 },
          textTransform: 'none',
        },
      },
      tagline: {
        show: true,
        text: 'Optimize for Online',
        color: { normal: '#666666', hover: '#333333' },
        typography: {
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: { desktop: 14, tablet: 13, mobile: 12 },
          fontWeight: 400,
          lineHeight: { desktop: 1.5, tablet: 1.5, mobile: 1.5 },
          letterSpacing: { desktop: 0, tablet: 0, mobile: 0 },
          textTransform: 'none',
        },
      },
      favicon: null,
    },
    colors: {
      primaryColor: '#3b82f6',
      secondaryColor: '#ef4444',
      textColor: '#333333',
      linkColor: { normal: '#3b82f6', hover: '#2563eb' },
      borderColor: '#dddddd',
      bodyBackground: '#ffffff',
      contentBackground: '#ffffff',
      palette: {
        color1: '#3b82f6',
        color2: '#ef4444',
        color3: '#14b8a6',
        color4: '#f59e0b',
        color5: '#8b5cf6',
        color6: '#06b6d4',
        color7: '#f0abfc',
        color8: '#60a5fa',
        color9: '#38bdf8',
      },
    },
    typography: {
      bodyFont: {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: { desktop: 16, tablet: 15, mobile: 14 },
        fontWeight: 400,
        lineHeight: { desktop: 1.65, tablet: 1.6, mobile: 1.5 },
        letterSpacing: { desktop: 0, tablet: 0, mobile: 0 },
        textTransform: 'none',
      },
      headings: {
        h1: {
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: { desktop: 48, tablet: 40, mobile: 32 },
          fontWeight: 700,
          lineHeight: { desktop: 1.2, tablet: 1.3, mobile: 1.4 },
          letterSpacing: { desktop: -1, tablet: -0.5, mobile: 0 },
          textTransform: 'none',
        },
        h2: {
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: { desktop: 36, tablet: 32, mobile: 28 },
          fontWeight: 700,
          lineHeight: { desktop: 1.3, tablet: 1.3, mobile: 1.4 },
          letterSpacing: { desktop: -0.5, tablet: 0, mobile: 0 },
          textTransform: 'none',
        },
        h3: {
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: { desktop: 28, tablet: 24, mobile: 22 },
          fontWeight: 600,
          lineHeight: { desktop: 1.4, tablet: 1.4, mobile: 1.5 },
          letterSpacing: { desktop: 0, tablet: 0, mobile: 0 },
          textTransform: 'none',
        },
        h4: {
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: { desktop: 24, tablet: 20, mobile: 18 },
          fontWeight: 600,
          lineHeight: { desktop: 1.5, tablet: 1.5, mobile: 1.5 },
          letterSpacing: { desktop: 0, tablet: 0, mobile: 0 },
          textTransform: 'none',
        },
        h5: {
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: { desktop: 20, tablet: 18, mobile: 16 },
          fontWeight: 600,
          lineHeight: { desktop: 1.5, tablet: 1.5, mobile: 1.5 },
          letterSpacing: { desktop: 0, tablet: 0, mobile: 0 },
          textTransform: 'none',
        },
        h6: {
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: { desktop: 16, tablet: 16, mobile: 14 },
          fontWeight: 600,
          lineHeight: { desktop: 1.5, tablet: 1.5, mobile: 1.5 },
          letterSpacing: { desktop: 0, tablet: 0, mobile: 0 },
          textTransform: 'none',
        },
      },
      button: {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: { desktop: 16, tablet: 15, mobile: 14 },
        fontWeight: 500,
        lineHeight: { desktop: 1.5, tablet: 1.5, mobile: 1.5 },
        letterSpacing: { desktop: 0, tablet: 0, mobile: 0 },
        textTransform: 'none',
      },
    },
    container: {
      layout: 'boxed',
      width: { desktop: 1200, tablet: 992, mobile: 100 },
      padding: {
        desktop: { top: 0, right: 15, bottom: 0, left: 15 },
        tablet: { top: 0, right: 15, bottom: 0, left: 15 },
        mobile: { top: 0, right: 15, bottom: 0, left: 15 },
      },
      margin: {
        desktop: { top: 0, bottom: 0 },
        tablet: { top: 0, bottom: 0 },
        mobile: { top: 0, bottom: 0 },
      },
    },
    sidebar: {
      layout: 'right-sidebar',
      width: { desktop: 300, tablet: 250, mobile: 100 },
      gap: { desktop: 30, tablet: 20, mobile: 15 },
    },
    header: {
      layout: 'header-main-layout-1',
      sticky: false,
      transparentHeader: false,
      above: {
        enabled: false,
        height: { desktop: 50, tablet: 45, mobile: 40 },
        background: '#f5f5f5',
        content: [],
      },
      primary: {
        height: { desktop: 80, tablet: 70, mobile: 60 },
        background: '#ffffff',
        menuAlignment: 'right',
      },
      below: {
        enabled: false,
        height: { desktop: 50, tablet: 45, mobile: 40 },
        background: '#f5f5f5',
        content: [],
      },
    },
    footer: {
      layout: 'footer-layout-1',
      widgets: {
        enabled: true,
        columns: { desktop: 4, tablet: 2, mobile: 1 },
        background: '#f5f5f5',
        textColor: '#333333',
        linkColor: { normal: '#3b82f6', hover: '#2563eb' },
        padding: {
          desktop: { top: 60, bottom: 60 },
          tablet: { top: 40, bottom: 40 },
          mobile: { top: 30, bottom: 30 },
        },
      },
      bottomBar: {
        enabled: true,
        layout: 'layout-1',
        section1: '© 2025 O4O Platform. All rights reserved.',
        section2: '',
        background: '#333333',
        textColor: '#ffffff',
        linkColor: { normal: '#3b82f6', hover: '#2563eb' },
        padding: {
          desktop: { top: 20, bottom: 20 },
          tablet: { top: 15, bottom: 15 },
          mobile: { top: 12, bottom: 12 },
        },
      },
    },
    blog: {
      archive: {
        layout: 'grid',
        columns: { desktop: 3, tablet: 2, mobile: 1 },
        cardStyle: 'boxed',
        cardSpacing: 30,
        contentWidth: 'default',
        featuredImage: {
          enabled: true,
          ratio: '16:9',
          customRatio: { width: 16, height: 9 },
          size: 'large',
          position: 'top',
          hoverEffect: 'none',
        },
        meta: {
          items: [],
          position: 'after-title',
          separator: '•',
          showIcons: true,
          colors: {
            text: '#666666',
            links: '#3b82f6',
            icons: '#999999',
          },
        },
        content: {
          showTitle: true,
          titleTag: 'h2',
          showExcerpt: true,
          excerptLength: 150,
          excerptSource: 'auto',
          readMoreText: 'Read More',
          showReadMoreButton: true,
        },
        pagination: {
          enabled: true,
          type: 'numbers',
          postsPerPage: 10,
          showNumbers: true,
          showPrevNext: true,
          prevText: 'Previous',
          nextText: 'Next',
          infiniteScrollThreshold: 500,
        },
        sorting: {
          defaultOrder: 'date-desc',
          showSortOptions: false,
          enableSearch: false,
          enableFilters: false,
        },
        styling: {
          titleColor: '#333333',
          titleHoverColor: '#3b82f6',
          excerptColor: '#666666',
          metaColor: '#999999',
          backgroundColor: '#ffffff',
          borderColor: '#e5e5e5',
          borderRadius: 4,
          cardPadding: 20,
          typography: {
            titleSize: { desktop: 24, tablet: 20, mobile: 18 },
            titleWeight: 700,
            excerptSize: { desktop: 16, tablet: 15, mobile: 14 },
            metaSize: { desktop: 14, tablet: 13, mobile: 12 },
          },
        },
      },
      single: {
        layout: 'default',
        showFeaturedImage: true,
        showBreadcrumb: true,
        showPostNavigation: true,
        showAuthorBox: true,
        showRelatedPosts: true,
        relatedPostsCount: 3,
        meta: {
          showAuthor: true,
          showDate: true,
          showCategory: true,
          showTags: true,
          showComments: true,
          showReadTime: false,
          showViews: false,
          position: 'after-title',
        },
        relatedPosts: {
          title: 'Related Posts',
          layout: 'grid',
          columns: { desktop: 3, tablet: 2, mobile: 1 },
          basedOn: 'category',
        },
      },
      taxonomy: {
        showDescription: true,
        showPostCount: true,
        showHierarchy: true,
        inheritArchiveSettings: true,
      },
    },
    scrollToTop: {
      enabled: true,
      displayType: 'both',
      threshold: 300,
      backgroundColor: '#3b82f6',
      iconColor: '#ffffff',
      position: 'right',
    },
    buttons: {
      primary: {
        backgroundColor: '#3b82f6',
        textColor: '#ffffff',
        borderWidth: 0,
        borderColor: '#3b82f6',
        borderStyle: 'solid',
        borderRadius: 4,
        paddingVertical: 12,
        paddingHorizontal: 24,
        hoverBackgroundColor: '#2563eb',
        hoverTextColor: '#ffffff',
        hoverBorderColor: '#2563eb',
        transitionDuration: 200,
        fontSize: { desktop: 16, tablet: 15, mobile: 14 },
        fontWeight: 500,
        textTransform: 'none',
        letterSpacing: 0,
      },
    },
    breadcrumbs: {
      enabled: true,
      position: 'below-header',
      homeText: 'Home',
      separator: '>',
      showCurrentPage: true,
      showOnHomepage: false,
      linkColor: '#3b82f6',
      currentPageColor: '#6b7280',
      separatorColor: '#9ca3af',
      hoverColor: '#2563eb',
      fontSize: { desktop: 14, tablet: 13, mobile: 12 },
      fontWeight: 400,
      textTransform: 'none',
      itemSpacing: 8,
      marginTop: 16,
      marginBottom: 16,
      showIcons: false,
      mobileHidden: false,
    },
    customCSS: '',
    _meta: {
      version: CURRENT_VERSION,
      lastModified: new Date().toISOString(),
      isDirty: false,
    },
  };
}
