/**
 * Theme Preset Service
 * Phase 8 — Service-Level Theme/Appearance Auto-initialization
 *
 * Manages theme presets for different service groups and tenants.
 */

import logger from '../utils/logger.js';
import type { ThemePresetDefinition, ColorPalette, TypographySettings } from '../service-templates/init-schema.js';
import type { ServiceGroup } from '../middleware/tenant-context.middleware.js';

/**
 * Stored theme preset with tenant information
 */
export interface StoredThemePreset extends ThemePresetDefinition {
  tenantId?: string;
  serviceGroup?: ServiceGroup;
  isDefault?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Default theme presets by service group
 */
const DEFAULT_THEME_PRESETS: Record<ServiceGroup, ThemePresetDefinition> = {
  cosmetics: {
    id: 'cosmetics-default',
    name: '코스메틱 기본 테마',
    description: '화장품 서비스를 위한 파스텔 핑크 테마',
    colors: {
      primary: '#FF6B9D',
      primaryLight: '#FFB3CC',
      primaryDark: '#E91E63',
      secondary: '#9C27B0',
      secondaryLight: '#CE93D8',
      secondaryDark: '#7B1FA2',
      accent: '#FF4081',
      background: '#FFF5F8',
      surface: '#FFFFFF',
      text: '#333333',
      textSecondary: '#666666',
      error: '#F44336',
      warning: '#FF9800',
      success: '#4CAF50',
      info: '#2196F3',
    },
  },
  yaksa: {
    id: 'yaksa-default',
    name: '약사회 기본 테마',
    description: '약사회 서비스를 위한 블루/화이트 테마',
    colors: {
      primary: '#1565C0',
      primaryLight: '#42A5F5',
      primaryDark: '#0D47A1',
      secondary: '#00897B',
      secondaryLight: '#4DB6AC',
      secondaryDark: '#00695C',
      accent: '#FF5722',
      background: '#F5F7FA',
      surface: '#FFFFFF',
      text: '#212121',
      textSecondary: '#757575',
      error: '#D32F2F',
      warning: '#F57C00',
      success: '#388E3C',
      info: '#1976D2',
    },
  },
  tourist: {
    id: 'tourist-default',
    name: '관광 기본 테마',
    description: '관광 서비스를 위한 옐로우/네이비 테마',
    colors: {
      primary: '#FFC107',
      primaryLight: '#FFE082',
      primaryDark: '#FFA000',
      secondary: '#1A237E',
      secondaryLight: '#534BAE',
      secondaryDark: '#000051',
      accent: '#FF5722',
      background: '#FFFDE7',
      surface: '#FFFFFF',
      text: '#212121',
      textSecondary: '#616161',
      error: '#D32F2F',
      warning: '#F57C00',
      success: '#388E3C',
      info: '#0288D1',
    },
  },
  sellerops: {
    id: 'sellerops-default',
    name: '셀러 운영 기본 테마',
    description: '셀러 운영을 위한 그린/블랙 테마',
    colors: {
      primary: '#2E7D32',
      primaryLight: '#66BB6A',
      primaryDark: '#1B5E20',
      secondary: '#212121',
      secondaryLight: '#484848',
      secondaryDark: '#000000',
      accent: '#FF9800',
      background: '#F1F8E9',
      surface: '#FFFFFF',
      text: '#212121',
      textSecondary: '#616161',
      error: '#D32F2F',
      warning: '#F57C00',
      success: '#388E3C',
      info: '#0288D1',
    },
  },
  supplierops: {
    id: 'supplierops-default',
    name: '공급사 운영 기본 테마',
    description: '공급사 운영을 위한 다크 블루 테마',
    colors: {
      primary: '#0D47A1',
      primaryLight: '#5472D3',
      primaryDark: '#002171',
      secondary: '#37474F',
      secondaryLight: '#62727B',
      secondaryDark: '#102027',
      accent: '#00BCD4',
      background: '#ECEFF1',
      surface: '#FFFFFF',
      text: '#263238',
      textSecondary: '#546E7A',
      error: '#D32F2F',
      warning: '#F57C00',
      success: '#388E3C',
      info: '#0288D1',
    },
  },
  global: {
    id: 'global-default',
    name: '기본 테마',
    description: '플랫폼 기본 테마',
    colors: {
      primary: '#3F51B5',
      primaryLight: '#7986CB',
      primaryDark: '#303F9F',
      secondary: '#607D8B',
      secondaryLight: '#90A4AE',
      secondaryDark: '#455A64',
      accent: '#FF4081',
      background: '#FAFAFA',
      surface: '#FFFFFF',
      text: '#212121',
      textSecondary: '#757575',
      error: '#F44336',
      warning: '#FF9800',
      success: '#4CAF50',
      info: '#2196F3',
    },
  },
};

/**
 * Theme Preset Service Class
 */
export class ThemePresetService {
  // In-memory store for tenant theme presets (would be DB in production)
  private tenantThemes = new Map<string, StoredThemePreset>();

  /**
   * Get default theme preset for a service group
   */
  getDefaultPreset(serviceGroup: ServiceGroup): ThemePresetDefinition {
    return DEFAULT_THEME_PRESETS[serviceGroup] || DEFAULT_THEME_PRESETS.global;
  }

  /**
   * Get all default presets
   */
  getAllDefaultPresets(): Record<ServiceGroup, ThemePresetDefinition> {
    return { ...DEFAULT_THEME_PRESETS };
  }

  /**
   * Get theme preset for a tenant
   */
  async getTenantTheme(tenantId: string): Promise<StoredThemePreset | null> {
    // Check tenant-specific theme first
    const tenantTheme = this.tenantThemes.get(tenantId);
    if (tenantTheme) {
      return tenantTheme;
    }

    return null;
  }

  /**
   * Get effective theme for a tenant (with fallback to default)
   */
  async getEffectiveTheme(tenantId: string, serviceGroup: ServiceGroup): Promise<ThemePresetDefinition> {
    // Check tenant-specific theme first
    const tenantTheme = await this.getTenantTheme(tenantId);
    if (tenantTheme) {
      return tenantTheme;
    }

    // Fall back to service group default
    return this.getDefaultPreset(serviceGroup);
  }

  /**
   * Set theme preset for a tenant
   */
  async setTenantTheme(
    tenantId: string,
    theme: ThemePresetDefinition,
    serviceGroup?: ServiceGroup
  ): Promise<StoredThemePreset> {
    const storedTheme: StoredThemePreset = {
      ...theme,
      tenantId,
      serviceGroup,
      isDefault: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.tenantThemes.set(tenantId, storedTheme);
    logger.info(`[ThemePresetService] Set theme for tenant ${tenantId}: ${theme.id}`);

    return storedTheme;
  }

  /**
   * Update tenant theme colors
   */
  async updateTenantThemeColors(
    tenantId: string,
    colors: Partial<ColorPalette>
  ): Promise<StoredThemePreset | null> {
    const existing = await this.getTenantTheme(tenantId);
    if (!existing) {
      return null;
    }

    const updated: StoredThemePreset = {
      ...existing,
      colors: { ...existing.colors, ...colors },
      updatedAt: new Date(),
    };

    this.tenantThemes.set(tenantId, updated);
    logger.info(`[ThemePresetService] Updated theme colors for tenant ${tenantId}`);

    return updated;
  }

  /**
   * Reset tenant theme to default
   */
  async resetTenantTheme(tenantId: string, serviceGroup: ServiceGroup): Promise<ThemePresetDefinition> {
    this.tenantThemes.delete(tenantId);
    logger.info(`[ThemePresetService] Reset theme for tenant ${tenantId} to ${serviceGroup} default`);

    return this.getDefaultPreset(serviceGroup);
  }

  /**
   * Generate CSS variables from theme preset
   */
  generateCSSVariables(theme: ThemePresetDefinition): Record<string, string> {
    const variables: Record<string, string> = {};

    // Color variables
    Object.entries(theme.colors).forEach(([key, value]) => {
      variables[`--color-${this.kebabCase(key)}`] = value;
    });

    // Typography variables
    if (theme.typography) {
      variables['--font-family'] = theme.typography.fontFamily;
      if (theme.typography.fontFamilyHeading) {
        variables['--font-family-heading'] = theme.typography.fontFamilyHeading;
      }

      Object.entries(theme.typography.fontSize).forEach(([key, value]) => {
        variables[`--font-size-${key}`] = value;
      });

      Object.entries(theme.typography.fontWeight).forEach(([key, value]) => {
        variables[`--font-weight-${key}`] = String(value);
      });

      Object.entries(theme.typography.lineHeight).forEach(([key, value]) => {
        variables[`--line-height-${key}`] = String(value);
      });
    }

    // Border radius variables
    if (theme.borderRadius) {
      Object.entries(theme.borderRadius).forEach(([key, value]) => {
        variables[`--border-radius-${key}`] = value;
      });
    }

    // Shadow variables
    if (theme.shadows) {
      Object.entries(theme.shadows).forEach(([key, value]) => {
        variables[`--shadow-${key}`] = value;
      });
    }

    // Custom CSS variables
    if (theme.cssVariables) {
      Object.entries(theme.cssVariables).forEach(([key, value]) => {
        variables[key] = value;
      });
    }

    return variables;
  }

  /**
   * Generate CSS string from theme preset
   */
  generateCSS(theme: ThemePresetDefinition): string {
    const variables = this.generateCSSVariables(theme);
    const cssLines = Object.entries(variables)
      .map(([key, value]) => `  ${key}: ${value};`)
      .join('\n');

    return `:root {\n${cssLines}\n}`;
  }

  /**
   * Convert camelCase to kebab-case
   */
  private kebabCase(str: string): string {
    return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
  }

  /**
   * Validate theme preset
   */
  validateTheme(theme: Partial<ThemePresetDefinition>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!theme.id) {
      errors.push('Theme ID is required');
    }

    if (!theme.name) {
      errors.push('Theme name is required');
    }

    if (!theme.colors) {
      errors.push('Theme colors are required');
    } else {
      const requiredColors = ['primary', 'secondary', 'background', 'surface', 'text'];
      for (const color of requiredColors) {
        if (!(color in theme.colors)) {
          errors.push(`Missing required color: ${color}`);
        }
      }

      // Validate color formats
      const colorPattern = /^#[0-9A-Fa-f]{6}$/;
      for (const [key, value] of Object.entries(theme.colors)) {
        if (value && !colorPattern.test(value)) {
          errors.push(`Invalid color format for ${key}: ${value}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

/**
 * Singleton instance
 */
export const themePresetService = new ThemePresetService();

export default themePresetService;
