/**
 * Baseline Consistency Linter Service
 * Phase 9 Task 4.3 — Cross-Service Baseline Consistency Linting
 *
 * Validates tenant configurations against established baselines:
 * - Navigation consistency
 * - ViewSystem consistency
 * - ThemePreset consistency
 * - AppStore consistency
 */

import { AppDataSource } from '../database/connection.js';
import { Site } from '../modules/sites/site.entity.js';
import logger from '../utils/logger.js';

// =============================================================================
// Lint Types
// =============================================================================

export type BaselineLintCategory = 'navigation' | 'views' | 'theme' | 'apps';

export type BaselineLintErrorType =
  | 'NavigationMismatchWarning'
  | 'ViewMismatchWarning'
  | 'ThemeMismatchWarning'
  | 'MissingCoreApp'
  | 'IncompatibleExtension'
  | 'BaselineDeviation';

export type BaselineLintSeverity = 'critical' | 'warning' | 'info';

export interface BaselineLintError {
  type: BaselineLintErrorType;
  category: BaselineLintCategory;
  severity: BaselineLintSeverity;
  tenantId: string;
  serviceGroup: string;
  field: string;
  message: string;
  expected?: unknown;
  actual?: unknown;
  details?: Record<string, unknown>;
}

export interface TenantLintResult {
  tenantId: string;
  serviceGroup: string;
  isValid: boolean;
  score: number; // 0-100
  errors: BaselineLintError[];
  warnings: BaselineLintError[];
  infos: BaselineLintError[];
  lintedAt: Date;
}

export interface SystemLintResult {
  totalTenants: number;
  validTenants: number;
  invalidTenants: number;
  averageScore: number;
  tenantResults: TenantLintResult[];
  categorySummary: Record<BaselineLintCategory, { errors: number; warnings: number }>;
  lintedAt: Date;
  duration: number;
}

// =============================================================================
// Baseline Definitions
// =============================================================================

/**
 * Required navigation keys per service group
 */
const REQUIRED_NAVIGATION_KEYS: Record<string, string[]> = {
  cosmetics: ['home', 'shop', 'products', 'account'],
  yaksa: ['home', 'members', 'forum', 'reports', 'mypage'],
  tourist: ['home', 'destinations', 'tours', 'bookings'],
  default: ['home', 'about', 'contact'],
};

/**
 * Forbidden navigation keys per service group (from other services)
 */
const FORBIDDEN_NAVIGATION_KEYS: Record<string, string[]> = {
  cosmetics: ['pharmacy', 'yaksa', 'members', 'verification', 'forum'],
  yaksa: ['shop', 'products', 'brands', 'beauty', 'skincare'],
  tourist: ['pharmacy', 'shop', 'products'],
  default: [],
};

/**
 * Required core apps per service group
 */
const REQUIRED_APPS: Record<string, string[]> = {
  cosmetics: ['cms-core', 'organization-core'],
  yaksa: ['cms-core', 'organization-core'],
  tourist: ['cms-core', 'organization-core'],
  default: ['cms-core', 'organization-core'],
};

/**
 * Recommended apps per service group
 */
const RECOMMENDED_APPS: Record<string, string[]> = {
  cosmetics: ['cosmetics-core'],
  yaksa: ['membership-yaksa', 'forum-yaksa'],
  tourist: [],
  default: [],
};

/**
 * Incompatible apps per service group
 */
const INCOMPATIBLE_APPS: Record<string, string[]> = {
  cosmetics: ['yaksa-core', 'yaksa-member', 'forum-yaksa', 'membership-yaksa', 'reporting-yaksa'],
  yaksa: ['cosmetics-core', 'cosmetics-seller'],
  tourist: ['yaksa-core', 'cosmetics-core'],
  default: [],
};

/**
 * Default theme presets per service group
 */
const DEFAULT_THEME_PRESETS: Record<string, string[]> = {
  cosmetics: ['cosmetics-light', 'cosmetics-dark', 'default-light', 'default-dark'],
  yaksa: ['yaksa-professional', 'yaksa-modern', 'default-light', 'default-dark'],
  tourist: ['tourist-adventure', 'default-light', 'default-dark'],
  default: ['default-light', 'default-dark', 'minimal'],
};

/**
 * View templates per service group (expected views)
 */
const EXPECTED_VIEWS: Record<string, string[]> = {
  cosmetics: ['product-list', 'product-detail', 'cart', 'checkout'],
  yaksa: ['member-list', 'member-profile', 'forum-list', 'forum-post'],
  tourist: ['destination-list', 'tour-detail', 'booking-form'],
  default: ['page', 'post-list', 'post-detail'],
};

/**
 * Views that should NOT exist in a service group
 */
const FORBIDDEN_VIEWS: Record<string, string[]> = {
  cosmetics: ['member-list', 'forum-post', 'yaksa-dashboard'],
  yaksa: ['product-list', 'product-detail', 'cart', 'checkout', 'cosmetics-dashboard'],
  tourist: ['member-list', 'product-detail'],
  default: [],
};

// =============================================================================
// Baseline Linter Service
// =============================================================================

export class BaselineLinterService {
  private siteRepository = AppDataSource.getRepository(Site);

  /**
   * Lint all tenants against baselines
   */
  async lintAllTenants(): Promise<SystemLintResult> {
    const startTime = Date.now();

    try {
      const sites = await this.siteRepository.find();
      const tenantResults: TenantLintResult[] = [];

      for (const site of sites) {
        const result = await this.lintTenant(site);
        tenantResults.push(result);
      }

      // Calculate summary
      const validTenants = tenantResults.filter(r => r.isValid).length;
      const averageScore = tenantResults.length > 0
        ? tenantResults.reduce((sum, r) => sum + r.score, 0) / tenantResults.length
        : 100;

      // Category summary
      const categorySummary: Record<BaselineLintCategory, { errors: number; warnings: number }> = {
        navigation: { errors: 0, warnings: 0 },
        views: { errors: 0, warnings: 0 },
        theme: { errors: 0, warnings: 0 },
        apps: { errors: 0, warnings: 0 },
      };

      tenantResults.forEach(result => {
        [...result.errors, ...result.warnings].forEach(issue => {
          const category = issue.category;
          if (issue.severity === 'critical') {
            categorySummary[category].errors++;
          } else if (issue.severity === 'warning') {
            categorySummary[category].warnings++;
          }
        });
      });

      return {
        totalTenants: sites.length,
        validTenants,
        invalidTenants: sites.length - validTenants,
        averageScore: Math.round(averageScore * 10) / 10,
        tenantResults,
        categorySummary,
        lintedAt: new Date(),
        duration: Date.now() - startTime,
      };
    } catch (error) {
      logger.error('[BaselineLinter] Error linting tenants:', error);
      throw error;
    }
  }

  /**
   * Lint a single tenant
   */
  async lintTenant(site: Site): Promise<TenantLintResult> {
    const errors: BaselineLintError[] = [];
    const warnings: BaselineLintError[] = [];
    const infos: BaselineLintError[] = [];

    const tenantId = site.domain;
    const serviceGroup = this.detectServiceGroup(site);
    const config = site.config || {};
    const apps = site.apps || [];

    // A) Navigation Lint
    this.lintNavigation(tenantId, serviceGroup, config, errors, warnings, infos);

    // B) ViewSystem Lint
    this.lintViews(tenantId, serviceGroup, config, errors, warnings, infos);

    // C) ThemePreset Lint
    this.lintTheme(tenantId, serviceGroup, config, errors, warnings, infos);

    // D) AppStore Lint
    this.lintApps(tenantId, serviceGroup, apps, errors, warnings, infos);

    // Calculate score
    const score = this.calculateScore(errors, warnings);

    return {
      tenantId,
      serviceGroup,
      isValid: errors.length === 0,
      score,
      errors,
      warnings,
      infos,
      lintedAt: new Date(),
    };
  }

  /**
   * Lint a single tenant by ID
   */
  async lintTenantById(tenantId: string): Promise<TenantLintResult | null> {
    try {
      const site = await this.siteRepository.findOne({
        where: { domain: tenantId },
      });

      if (!site) {
        return null;
      }

      return this.lintTenant(site);
    } catch (error) {
      logger.error(`[BaselineLinter] Error linting tenant ${tenantId}:`, error);
      return null;
    }
  }

  // ===========================================================================
  // Lint Methods
  // ===========================================================================

  /**
   * A) Navigation Lint
   */
  private lintNavigation(
    tenantId: string,
    serviceGroup: string,
    config: Record<string, any>,
    errors: BaselineLintError[],
    warnings: BaselineLintError[],
    infos: BaselineLintError[]
  ): void {
    const navigation = config.navigation || {};
    const menus = navigation.items || navigation.menus || [];

    // Extract all navigation paths and labels
    const navKeys: string[] = [];
    this.extractNavigationKeys(menus, navKeys);

    // Check required navigation keys
    const requiredKeys = REQUIRED_NAVIGATION_KEYS[serviceGroup] || REQUIRED_NAVIGATION_KEYS.default;
    for (const required of requiredKeys) {
      const found = navKeys.some(key =>
        key.toLowerCase().includes(required.toLowerCase())
      );
      if (!found) {
        warnings.push({
          type: 'NavigationMismatchWarning',
          category: 'navigation',
          severity: 'warning',
          tenantId,
          serviceGroup,
          field: 'navigation',
          message: `Missing recommended navigation key: '${required}'`,
          expected: required,
        });
      }
    }

    // Check forbidden navigation keys
    const forbiddenKeys = FORBIDDEN_NAVIGATION_KEYS[serviceGroup] || [];
    for (const forbidden of forbiddenKeys) {
      const found = navKeys.some(key =>
        key.toLowerCase().includes(forbidden.toLowerCase())
      );
      if (found) {
        errors.push({
          type: 'NavigationMismatchWarning',
          category: 'navigation',
          severity: 'critical',
          tenantId,
          serviceGroup,
          field: 'navigation',
          message: `Navigation contains forbidden key '${forbidden}' for ${serviceGroup} service`,
          actual: forbidden,
        });
      }
    }
  }

  /**
   * Extract navigation keys recursively
   */
  private extractNavigationKeys(items: any[], keys: string[]): void {
    if (!Array.isArray(items)) return;

    items.forEach(item => {
      if (item.label) keys.push(item.label);
      if (item.path) keys.push(item.path);
      if (item.id) keys.push(item.id);
      if (item.children) {
        this.extractNavigationKeys(item.children, keys);
      }
      if (item.items) {
        this.extractNavigationKeys(item.items, keys);
      }
    });
  }

  /**
   * B) ViewSystem Lint
   */
  private lintViews(
    tenantId: string,
    serviceGroup: string,
    config: Record<string, any>,
    errors: BaselineLintError[],
    warnings: BaselineLintError[],
    infos: BaselineLintError[]
  ): void {
    const views = config.views || config.registeredViews || [];
    const viewNames = Array.isArray(views) ? views : Object.keys(views);

    // Check for forbidden views
    const forbiddenViews = FORBIDDEN_VIEWS[serviceGroup] || [];
    for (const forbidden of forbiddenViews) {
      const found = viewNames.some(view =>
        view.toLowerCase().includes(forbidden.toLowerCase())
      );
      if (found) {
        errors.push({
          type: 'ViewMismatchWarning',
          category: 'views',
          severity: 'critical',
          tenantId,
          serviceGroup,
          field: 'views',
          message: `View '${forbidden}' should not exist in ${serviceGroup} service`,
          actual: forbidden,
        });
      }
    }

    // Check for missing expected views (info only, not enforced)
    const expectedViews = EXPECTED_VIEWS[serviceGroup] || EXPECTED_VIEWS.default;
    for (const expected of expectedViews) {
      const found = viewNames.some(view =>
        view.toLowerCase().includes(expected.toLowerCase())
      );
      if (!found) {
        infos.push({
          type: 'ViewMismatchWarning',
          category: 'views',
          severity: 'info',
          tenantId,
          serviceGroup,
          field: 'views',
          message: `Expected view '${expected}' not found - this may be normal`,
          expected,
        });
      }
    }
  }

  /**
   * C) ThemePreset Lint
   */
  private lintTheme(
    tenantId: string,
    serviceGroup: string,
    config: Record<string, any>,
    errors: BaselineLintError[],
    warnings: BaselineLintError[],
    infos: BaselineLintError[]
  ): void {
    const theme = config.theme || {};
    const themeId = theme.id || theme.preset || theme.name;

    if (!themeId) {
      warnings.push({
        type: 'ThemeMismatchWarning',
        category: 'theme',
        severity: 'warning',
        tenantId,
        serviceGroup,
        field: 'theme',
        message: 'No theme preset configured',
      });
      return;
    }

    // Check if theme is in the allowed list
    const allowedThemes = DEFAULT_THEME_PRESETS[serviceGroup] || DEFAULT_THEME_PRESETS.default;
    const isAllowed = allowedThemes.some(allowed =>
      themeId.toLowerCase().includes(allowed.toLowerCase()) ||
      allowed.toLowerCase().includes(themeId.toLowerCase())
    );

    if (!isAllowed) {
      // Check if it's a theme from another service
      const otherServiceThemes = Object.entries(DEFAULT_THEME_PRESETS)
        .filter(([key]) => key !== serviceGroup && key !== 'default')
        .flatMap(([, themes]) => themes);

      const isFromOtherService = otherServiceThemes.some(other =>
        themeId.toLowerCase().includes(other.toLowerCase())
      );

      if (isFromOtherService) {
        errors.push({
          type: 'ThemeMismatchWarning',
          category: 'theme',
          severity: 'critical',
          tenantId,
          serviceGroup,
          field: 'theme',
          message: `Theme '${themeId}' appears to be from a different service group`,
          actual: themeId,
          expected: allowedThemes,
        });
      } else {
        warnings.push({
          type: 'ThemeMismatchWarning',
          category: 'theme',
          severity: 'warning',
          tenantId,
          serviceGroup,
          field: 'theme',
          message: `Custom theme '${themeId}' is not in the default list for ${serviceGroup}`,
          actual: themeId,
          expected: allowedThemes,
        });
      }
    }
  }

  /**
   * D) AppStore Lint
   */
  private lintApps(
    tenantId: string,
    serviceGroup: string,
    apps: string[],
    errors: BaselineLintError[],
    warnings: BaselineLintError[],
    infos: BaselineLintError[]
  ): void {
    // Check required apps
    const requiredApps = REQUIRED_APPS[serviceGroup] || REQUIRED_APPS.default;
    for (const required of requiredApps) {
      if (!apps.includes(required)) {
        errors.push({
          type: 'MissingCoreApp',
          category: 'apps',
          severity: 'critical',
          tenantId,
          serviceGroup,
          field: 'apps',
          message: `Missing required core app: '${required}'`,
          expected: required,
        });
      }
    }

    // Check recommended apps
    const recommendedApps = RECOMMENDED_APPS[serviceGroup] || [];
    for (const recommended of recommendedApps) {
      if (!apps.includes(recommended)) {
        warnings.push({
          type: 'MissingCoreApp',
          category: 'apps',
          severity: 'warning',
          tenantId,
          serviceGroup,
          field: 'apps',
          message: `Missing recommended app: '${recommended}'`,
          expected: recommended,
        });
      }
    }

    // Check incompatible apps
    const incompatibleApps = INCOMPATIBLE_APPS[serviceGroup] || [];
    for (const incompatible of incompatibleApps) {
      if (apps.includes(incompatible)) {
        errors.push({
          type: 'IncompatibleExtension',
          category: 'apps',
          severity: 'critical',
          tenantId,
          serviceGroup,
          field: 'apps',
          message: `Incompatible app installed: '${incompatible}'`,
          actual: incompatible,
        });
      }
    }
  }

  // ===========================================================================
  // Helper Methods
  // ===========================================================================

  /**
   * Detect service group from site
   */
  private detectServiceGroup(site: Site): string {
    // Try from template
    if (site.template) {
      if (site.template.includes('cosmetics')) return 'cosmetics';
      if (site.template.includes('yaksa') || site.template.includes('pharmacy')) return 'yaksa';
      if (site.template.includes('tourist')) return 'tourist';
    }

    // Try from installed apps
    const apps = site.apps || [];
    if (apps.includes('cosmetics-core') || apps.some(a => a.includes('cosmetics'))) return 'cosmetics';
    if (apps.includes('yaksa-core') || apps.some(a => a.includes('yaksa'))) return 'yaksa';
    if (apps.includes('tourist-core') || apps.some(a => a.includes('tourist'))) return 'tourist';

    return 'default';
  }

  /**
   * Calculate quality score
   * 100 - (critical * 20) - (warnings * 5) - (baselineDeviations * 10)
   */
  private calculateScore(errors: BaselineLintError[], warnings: BaselineLintError[]): number {
    const criticalCount = errors.filter(e => e.severity === 'critical').length;
    const warningCount = warnings.length;

    const penalty = (criticalCount * 20) + (warningCount * 5);
    return Math.max(0, 100 - penalty);
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

export const baselineLinterService = new BaselineLinterService();

// =============================================================================
// Exports
// =============================================================================

export {
  REQUIRED_NAVIGATION_KEYS,
  FORBIDDEN_NAVIGATION_KEYS,
  REQUIRED_APPS,
  RECOMMENDED_APPS,
  INCOMPATIBLE_APPS,
  DEFAULT_THEME_PRESETS,
  EXPECTED_VIEWS,
  FORBIDDEN_VIEWS,
};
