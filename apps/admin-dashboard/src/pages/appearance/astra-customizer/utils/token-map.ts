/**
 * Master Token Map - Single Source of Truth
 *
 * This file defines the unified CSS variable naming system for the entire platform.
 * All systems (Customizer, CSS Generator, Tailwind) must use these variables.
 *
 * Naming Convention: --wp-{category}-{element}-{variant}-{state}
 * Examples:
 * - --wp-color-primary-500
 * - --wp-btn-primary-bg
 * - --wp-btn-primary-bg-hover
 */

export interface TokenCategory {
  /** CSS variable name */
  cssVar: string;
  /** Default value */
  defaultValue: string;
  /** Customizer setting path (dot notation) */
  customizerPath?: string;
  /** Description for documentation */
  description: string;
}

/**
 * Master Token Map
 * Maps logical concepts to CSS variable names
 */
export const TOKEN_MAP = {
  // ========================================
  // COLOR SYSTEM
  // ========================================

  colors: {
    // Primary Color Scale (5 shades)
    primary: {
      50: {
        cssVar: '--wp-color-primary-50',
        defaultValue: '#eff6ff',
        description: 'Primary color - lightest shade',
      },
      100: {
        cssVar: '--wp-color-primary-100',
        defaultValue: '#dbeafe',
        description: 'Primary color - very light',
      },
      500: {
        cssVar: '--wp-color-primary-500',
        defaultValue: '#3b82f6',
        customizerPath: 'colors.primaryColor',
        description: 'Primary color - main brand color',
      },
      700: {
        cssVar: '--wp-color-primary-700',
        defaultValue: '#1d4ed8',
        description: 'Primary color - dark',
      },
      900: {
        cssVar: '--wp-color-primary-900',
        defaultValue: '#1e3a8a',
        description: 'Primary color - darkest shade',
      },
    },

    // Secondary Color Scale
    secondary: {
      50: {
        cssVar: '--wp-color-secondary-50',
        defaultValue: '#f0fdfa',
        description: 'Secondary color - lightest',
      },
      500: {
        cssVar: '--wp-color-secondary-500',
        defaultValue: '#14b8a6',
        customizerPath: 'colors.secondaryColor',
        description: 'Secondary color - main accent',
      },
      900: {
        cssVar: '--wp-color-secondary-900',
        defaultValue: '#134e4a',
        description: 'Secondary color - darkest',
      },
    },

    // Text Colors
    text: {
      primary: {
        cssVar: '--wp-text-primary',
        defaultValue: '#111827',
        customizerPath: 'colors.textColor',
        description: 'Main text color',
      },
      secondary: {
        cssVar: '--wp-text-secondary',
        defaultValue: '#374151',
        description: 'Secondary text color',
      },
      tertiary: {
        cssVar: '--wp-text-tertiary',
        defaultValue: '#6b7280',
        description: 'Tertiary text color (muted)',
      },
      inverse: {
        cssVar: '--wp-text-inverse',
        defaultValue: '#ffffff',
        description: 'Text on dark backgrounds',
      },
    },

    // Background Colors
    background: {
      body: {
        cssVar: '--wp-bg-body',
        defaultValue: '#ffffff',
        customizerPath: 'colors.bodyBackground',
        description: 'Body background color',
      },
      content: {
        cssVar: '--wp-bg-content',
        defaultValue: '#ffffff',
        customizerPath: 'colors.contentBackground',
        description: 'Content area background',
      },
      primary: {
        cssVar: '--wp-bg-primary',
        defaultValue: '#ffffff',
        description: 'Primary background',
      },
      secondary: {
        cssVar: '--wp-bg-secondary',
        defaultValue: '#f9fafb',
        description: 'Secondary background',
      },
      tertiary: {
        cssVar: '--wp-bg-tertiary',
        defaultValue: '#f3f4f6',
        description: 'Tertiary background',
      },
    },

    // Border Colors
    border: {
      primary: {
        cssVar: '--wp-border-primary',
        defaultValue: '#e5e7eb',
        customizerPath: 'colors.borderColor',
        description: 'Primary border color',
      },
      secondary: {
        cssVar: '--wp-border-secondary',
        defaultValue: '#d1d5db',
        description: 'Secondary border color',
      },
      focus: {
        cssVar: '--wp-border-focus',
        defaultValue: '#3b82f6',
        description: 'Focus state border',
      },
    },

    // Link Colors
    link: {
      normal: {
        cssVar: '--wp-link-color',
        defaultValue: '#3b82f6',
        customizerPath: 'colors.linkColor.normal',
        description: 'Link color default',
      },
      hover: {
        cssVar: '--wp-link-color-hover',
        defaultValue: '#2563eb',
        customizerPath: 'colors.linkColor.hover',
        description: 'Link hover color',
      },
    },
  },

  // ========================================
  // BUTTONS
  // ========================================

  buttons: {
    primary: {
      bg: {
        cssVar: '--wp-btn-primary-bg',
        defaultValue: '#3b82f6',
        description: 'Primary button background',
      },
      bgHover: {
        cssVar: '--wp-btn-primary-bg-hover',
        defaultValue: '#2563eb',
        description: 'Primary button hover background',
      },
      text: {
        cssVar: '--wp-btn-primary-text',
        defaultValue: '#ffffff',
        description: 'Primary button text color',
      },
      textHover: {
        cssVar: '--wp-btn-primary-text-hover',
        defaultValue: '#ffffff',
        description: 'Primary button text hover',
      },
      border: {
        cssVar: '--wp-btn-primary-border',
        defaultValue: 'transparent',
        description: 'Primary button border',
      },
    },

    secondary: {
      bg: {
        cssVar: '--wp-btn-secondary-bg',
        defaultValue: '#ffffff',
        description: 'Secondary button background',
      },
      bgHover: {
        cssVar: '--wp-btn-secondary-bg-hover',
        defaultValue: '#f9fafb',
        description: 'Secondary button hover background',
      },
      text: {
        cssVar: '--wp-btn-secondary-text',
        defaultValue: '#374151',
        description: 'Secondary button text',
      },
      textHover: {
        cssVar: '--wp-btn-secondary-text-hover',
        defaultValue: '#111827',
        description: 'Secondary button text hover',
      },
      border: {
        cssVar: '--wp-btn-secondary-border',
        defaultValue: '#d1d5db',
        description: 'Secondary button border',
      },
    },
  },

  // ========================================
  // LAYOUT COMPONENTS
  // ========================================

  header: {
    bg: {
      cssVar: '--wp-header-bg',
      defaultValue: '#ffffff',
      customizerPath: 'header.primary.background',
      description: 'Header background color',
    },
    text: {
      cssVar: '--wp-header-text',
      defaultValue: '#111827',
      description: 'Header text color',
    },
    border: {
      cssVar: '--wp-header-border',
      defaultValue: '#e5e7eb',
      description: 'Header border color',
    },
    height: {
      desktop: {
        cssVar: '--wp-header-height-desktop',
        defaultValue: '80px',
        customizerPath: 'header.primary.height.desktop',
        description: 'Header height on desktop',
      },
      tablet: {
        cssVar: '--wp-header-height-tablet',
        defaultValue: '70px',
        customizerPath: 'header.primary.height.tablet',
        description: 'Header height on tablet',
      },
      mobile: {
        cssVar: '--wp-header-height-mobile',
        defaultValue: '60px',
        customizerPath: 'header.primary.height.mobile',
        description: 'Header height on mobile',
      },
    },
  },

  footer: {
    bg: {
      cssVar: '--wp-footer-bg',
      defaultValue: '#111827',
      customizerPath: 'footer.widgets.background',
      description: 'Footer background color',
    },
    text: {
      cssVar: '--wp-footer-text',
      defaultValue: '#f9fafb',
      customizerPath: 'footer.widgets.textColor',
      description: 'Footer text color',
    },
    linkColor: {
      cssVar: '--wp-footer-link-color',
      defaultValue: '#ffffff',
      customizerPath: 'footer.widgets.linkColor.normal',
      description: 'Footer link color',
    },
    linkHover: {
      cssVar: '--wp-footer-link-hover',
      defaultValue: '#3b82f6',
      customizerPath: 'footer.widgets.linkColor.hover',
      description: 'Footer link hover color',
    },
  },

  sidebar: {
    bg: {
      cssVar: '--wp-sidebar-bg',
      defaultValue: '#ffffff',
      description: 'Sidebar background',
    },
    text: {
      cssVar: '--wp-sidebar-text',
      defaultValue: '#374151',
      description: 'Sidebar text color',
    },
    hover: {
      cssVar: '--wp-sidebar-hover',
      defaultValue: '#f9fafb',
      description: 'Sidebar hover state',
    },
    active: {
      cssVar: '--wp-sidebar-active',
      defaultValue: '#eff6ff',
      description: 'Sidebar active state background',
    },
    activeText: {
      cssVar: '--wp-sidebar-active-text',
      defaultValue: '#2563eb',
      description: 'Sidebar active text',
    },
    border: {
      cssVar: '--wp-sidebar-border',
      defaultValue: '#e5e7eb',
      description: 'Sidebar border color',
    },
  },

  container: {
    width: {
      desktop: {
        cssVar: '--wp-container-width-desktop',
        defaultValue: '1200px',
        customizerPath: 'container.width.desktop',
        description: 'Container max width on desktop',
      },
      tablet: {
        cssVar: '--wp-container-width-tablet',
        defaultValue: '992px',
        customizerPath: 'container.width.tablet',
        description: 'Container max width on tablet',
      },
      mobile: {
        cssVar: '--wp-container-width-mobile',
        defaultValue: '100%',
        customizerPath: 'container.width.mobile',
        description: 'Container max width on mobile',
      },
    },
  },

  // ========================================
  // TYPOGRAPHY
  // ========================================

  typography: {
    fontFamily: {
      body: {
        cssVar: '--wp-font-body',
        defaultValue: 'system-ui, -apple-system, sans-serif',
        customizerPath: 'typography.bodyFont.fontFamily',
        description: 'Body font family',
      },
      heading: {
        cssVar: '--wp-font-heading',
        defaultValue: 'system-ui, -apple-system, sans-serif',
        description: 'Heading font family',
      },
    },

    fontSize: {
      body: {
        desktop: {
          cssVar: '--wp-font-size-body-desktop',
          defaultValue: '16px',
          customizerPath: 'typography.bodyFont.fontSize.desktop',
          description: 'Body font size - desktop',
        },
        tablet: {
          cssVar: '--wp-font-size-body-tablet',
          defaultValue: '15px',
          customizerPath: 'typography.bodyFont.fontSize.tablet',
          description: 'Body font size - tablet',
        },
        mobile: {
          cssVar: '--wp-font-size-body-mobile',
          defaultValue: '14px',
          customizerPath: 'typography.bodyFont.fontSize.mobile',
          description: 'Body font size - mobile',
        },
      },
    },

    lineHeight: {
      body: {
        desktop: {
          cssVar: '--wp-line-height-body-desktop',
          defaultValue: '1.65',
          customizerPath: 'typography.bodyFont.lineHeight.desktop',
          description: 'Body line height - desktop',
        },
        tablet: {
          cssVar: '--wp-line-height-body-tablet',
          defaultValue: '1.6',
          customizerPath: 'typography.bodyFont.lineHeight.tablet',
          description: 'Body line height - tablet',
        },
        mobile: {
          cssVar: '--wp-line-height-body-mobile',
          defaultValue: '1.5',
          customizerPath: 'typography.bodyFont.lineHeight.mobile',
          description: 'Body line height - mobile',
        },
      },
    },
  },

  // ========================================
  // ADMIN UI
  // ========================================

  admin: {
    blue: {
      cssVar: '--wp-admin-blue',
      defaultValue: '#0073aa',
      description: 'WordPress admin blue',
    },
    blueDark: {
      cssVar: '--wp-admin-blue-dark',
      defaultValue: '#005177',
      description: 'WordPress admin blue dark',
    },
    green: {
      cssVar: '--wp-admin-green',
      defaultValue: '#22c55e',
      description: 'WordPress admin green',
    },
    red: {
      cssVar: '--wp-admin-red',
      defaultValue: '#ef4444',
      description: 'WordPress admin red',
    },
    orange: {
      cssVar: '--wp-admin-orange',
      defaultValue: '#f59e0b',
      description: 'WordPress admin orange',
    },
  },
} as const;

/**
 * Helper function to get CSS variable name from token path
 * @example getCSSVar('colors.primary.500') => '--wp-color-primary-500'
 */
export function getCSSVar(path: string): string {
  const parts = path.split('.');
  let current: any = TOKEN_MAP;

  for (const part of parts) {
    if (current[part]) {
      current = current[part];
    }
  }

  return current?.cssVar || '';
}

/**
 * Helper function to get default value from token path
 * @example getDefaultValue('colors.primary.500') => '#3b82f6'
 */
export function getDefaultValue(path: string): string {
  const parts = path.split('.');
  let current: any = TOKEN_MAP;

  for (const part of parts) {
    if (current[part]) {
      current = current[part];
    }
  }

  return current?.defaultValue || '';
}

/**
 * Generate CSS variables string for :root
 */
export function generateCSSVariables(): string {
  const vars: string[] = [];

  function traverse(obj: any, prefix = '') {
    for (const key in obj) {
      const value = obj[key];

      if (value && typeof value === 'object') {
        if ('cssVar' in value && 'defaultValue' in value) {
          vars.push(`  ${value.cssVar}: ${value.defaultValue};`);
        } else {
          traverse(value, prefix ? `${prefix}.${key}` : key);
        }
      }
    }
  }

  traverse(TOKEN_MAP);

  return `:root {\n${vars.join('\n')}\n}`;
}

/**
 * Get all CSS variable names (for migration/validation)
 */
export function getAllCSSVars(): string[] {
  const vars: string[] = [];

  function traverse(obj: any) {
    for (const key in obj) {
      const value = obj[key];

      if (value && typeof value === 'object') {
        if ('cssVar' in value) {
          vars.push(value.cssVar);
        } else {
          traverse(value);
        }
      }
    }
  }

  traverse(TOKEN_MAP);

  return vars;
}
