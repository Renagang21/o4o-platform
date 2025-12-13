/**
 * InitPack Quality Linter
 * Phase 9 Task 4.1 — InitPack Quality Enforcement System
 *
 * Validates InitPack configurations for quality and consistency:
 * - Required fields validation
 * - Structural linting
 * - Duplication detection
 * - Cross-service conflict detection
 */

import {
  ServiceInitPack,
  MenuDefinition,
  MenuItemDefinition,
  CategoryDefinition,
  SeedDataDefinition,
} from '../service-templates/init-schema.js';
import logger from '../utils/logger.js';

// =============================================================================
// Lint Error Types
// =============================================================================

export type LintErrorType =
  | 'MissingInitPackField'
  | 'InvalidFieldStructure'
  | 'DuplicateEntry'
  | 'CrossServiceConflict'
  | 'InvalidReference'
  | 'InvalidThemePreset';

export type LintSeverity = 'error' | 'warning' | 'info';

export interface LintError {
  type: LintErrorType;
  severity: LintSeverity;
  field: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface LintResult {
  initPackId: string;
  isValid: boolean;
  errors: LintError[];
  warnings: LintError[];
  infos: LintError[];
  score: number; // 0-100
  lintedAt: Date;
  duration: number; // ms
}

// =============================================================================
// Valid Theme Presets by Service Group
// =============================================================================

const VALID_THEME_PRESETS: Record<string, string[]> = {
  cosmetics: ['cosmetics-light', 'cosmetics-dark', 'cosmetics-luxury', 'cosmetics-natural'],
  yaksa: ['yaksa-professional', 'yaksa-modern', 'yaksa-classic', 'yaksa-trust'],
  tourist: ['tourist-adventure', 'tourist-luxury', 'tourist-cultural', 'tourist-nature'],
  default: ['default-light', 'default-dark', 'minimal', 'corporate'],
};

// =============================================================================
// Service-Specific Navigation Keys
// =============================================================================

const SERVICE_NAVIGATION_KEYS: Record<string, string[]> = {
  cosmetics: ['shop', 'products', 'brands', 'reviews', 'beauty', 'skincare', 'cosmetics'],
  yaksa: ['pharmacy', 'members', 'forum', 'reports', 'verification', 'education', 'yaksa'],
  tourist: ['destinations', 'tours', 'bookings', 'guides', 'travel', 'tourist'],
};

// =============================================================================
// Required Fields Definition
// =============================================================================

const REQUIRED_INITPACK_FIELDS = [
  'id',
  'name',
  'serviceGroup',
  'version',
];

const RECOMMENDED_INITPACK_FIELDS = [
  'defaultMenus',
  'defaultCategories',
  'defaultTheme',
  'defaultPages',
  'defaultRoles',
  'seedData',
];

// =============================================================================
// InitPack Linter Class
// =============================================================================

export class InitPackLinter {
  private errors: LintError[] = [];
  private warnings: LintError[] = [];
  private infos: LintError[] = [];

  /**
   * Lint a single InitPack
   */
  lint(initPack: ServiceInitPack): LintResult {
    const startTime = Date.now();
    this.errors = [];
    this.warnings = [];
    this.infos = [];

    // Run all validations
    this.validateRequiredFields(initPack);
    this.validateMenuStructure(initPack);
    this.validateCategoryStructure(initPack);
    this.validatePageStructure(initPack);
    this.validateRoleStructure(initPack);
    this.validateThemePreset(initPack);
    this.validateSeedData(initPack);
    this.detectDuplicates(initPack);
    this.detectCrossServiceConflicts(initPack);

    const duration = Date.now() - startTime;
    const score = this.calculateScore();

    return {
      initPackId: initPack.id,
      isValid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
      infos: this.infos,
      score,
      lintedAt: new Date(),
      duration,
    };
  }

  /**
   * Lint multiple InitPacks
   */
  lintAll(initPacks: ServiceInitPack[]): LintResult[] {
    return initPacks.map(pack => this.lint(pack));
  }

  // ===========================================================================
  // Validation Methods
  // ===========================================================================

  /**
   * A) Required Fields Validation
   */
  private validateRequiredFields(initPack: ServiceInitPack): void {
    // Check required fields
    for (const field of REQUIRED_INITPACK_FIELDS) {
      if (!(field in initPack) || initPack[field as keyof ServiceInitPack] === undefined) {
        this.addError('MissingInitPackField', 'error', field, `Required field '${field}' is missing`);
      }
    }

    // Check recommended fields (warnings)
    for (const field of RECOMMENDED_INITPACK_FIELDS) {
      const value = initPack[field as keyof ServiceInitPack];
      if (value === undefined || (Array.isArray(value) && value.length === 0)) {
        this.addError('MissingInitPackField', 'warning', field, `Recommended field '${field}' is missing or empty`);
      }
    }
  }

  /**
   * B) Menu Structure Validation
   */
  private validateMenuStructure(initPack: ServiceInitPack): void {
    if (!initPack.defaultMenus) return;

    initPack.defaultMenus.forEach((menu, menuIndex) => {
      // Check menu required fields
      if (!menu.id) {
        this.addError('InvalidFieldStructure', 'error', `defaultMenus[${menuIndex}].id`, 'Menu id is required');
      }
      if (!menu.label) {
        this.addError('InvalidFieldStructure', 'error', `defaultMenus[${menuIndex}].label`, 'Menu label is required');
      }
      if (!menu.location) {
        this.addError('InvalidFieldStructure', 'error', `defaultMenus[${menuIndex}].location`, 'Menu location is required');
      }
      if (!['header', 'footer', 'sidebar', 'mobile'].includes(menu.location)) {
        this.addError('InvalidFieldStructure', 'warning', `defaultMenus[${menuIndex}].location`,
          `Invalid menu location: ${menu.location}. Expected: header, footer, sidebar, mobile`);
      }

      // Validate menu items
      if (menu.items) {
        this.validateMenuItems(menu.items, `defaultMenus[${menuIndex}].items`, initPack.serviceGroup);
      }
    });
  }

  /**
   * Validate menu items recursively
   */
  private validateMenuItems(items: MenuItemDefinition[], path: string, serviceGroup: string): void {
    items.forEach((item, index) => {
      const itemPath = `${path}[${index}]`;

      if (!item.id) {
        this.addError('InvalidFieldStructure', 'error', `${itemPath}.id`, 'Menu item id is required');
      }
      if (!item.label) {
        this.addError('InvalidFieldStructure', 'error', `${itemPath}.label`, 'Menu item label is required');
      }
      if (!item.path && !item.externalUrl && (!item.children || item.children.length === 0)) {
        this.addError('InvalidFieldStructure', 'warning', `${itemPath}`,
          'Menu item should have path, externalUrl, or children');
      }

      // Recursively validate children
      if (item.children) {
        this.validateMenuItems(item.children, `${itemPath}.children`, serviceGroup);
      }
    });
  }

  /**
   * B) Category Structure Validation
   */
  private validateCategoryStructure(initPack: ServiceInitPack): void {
    if (!initPack.defaultCategories) return;

    initPack.defaultCategories.forEach((category, index) => {
      if (!category.name) {
        this.addError('InvalidFieldStructure', 'error', `defaultCategories[${index}].name`, 'Category name is required');
      }
      if (!category.slug) {
        this.addError('InvalidFieldStructure', 'error', `defaultCategories[${index}].slug`, 'Category slug is required');
      }

      // Validate slug format
      if (category.slug && !/^[a-z0-9-]+$/.test(category.slug)) {
        this.addError('InvalidFieldStructure', 'warning', `defaultCategories[${index}].slug`,
          `Category slug '${category.slug}' should only contain lowercase letters, numbers, and hyphens`);
      }

      // Check parent slug reference
      if (category.parentSlug) {
        const parentExists = initPack.defaultCategories?.some(c => c.slug === category.parentSlug);
        if (!parentExists) {
          this.addError('InvalidReference', 'warning', `defaultCategories[${index}].parentSlug`,
            `Parent category '${category.parentSlug}' not found in defaultCategories`);
        }
      }
    });
  }

  /**
   * B) Page Structure Validation
   */
  private validatePageStructure(initPack: ServiceInitPack): void {
    if (!initPack.defaultPages) return;

    let homepageCount = 0;
    initPack.defaultPages.forEach((page, index) => {
      if (!page.slug) {
        this.addError('InvalidFieldStructure', 'error', `defaultPages[${index}].slug`, 'Page slug is required');
      }
      if (!page.title) {
        this.addError('InvalidFieldStructure', 'error', `defaultPages[${index}].title`, 'Page title is required');
      }

      // Validate slug format
      if (page.slug && !/^[a-z0-9-/]+$/.test(page.slug)) {
        this.addError('InvalidFieldStructure', 'warning', `defaultPages[${index}].slug`,
          `Page slug '${page.slug}' should only contain lowercase letters, numbers, hyphens, and slashes`);
      }

      // Check template reference
      if (page.template) {
        this.addError('InvalidFieldStructure', 'info', `defaultPages[${index}].template`,
          `Page template '${page.template}' - ensure this template exists`);
      }

      if (page.isHomepage) {
        homepageCount++;
      }
    });

    if (homepageCount > 1) {
      this.addError('InvalidFieldStructure', 'warning', 'defaultPages',
        `Multiple pages marked as homepage (${homepageCount}). Only one should be homepage.`);
    }

    if (homepageCount === 0 && initPack.defaultPages.length > 0) {
      this.addError('InvalidFieldStructure', 'info', 'defaultPages',
        'No page marked as homepage. Consider setting isHomepage: true for one page.');
    }
  }

  /**
   * B) Role Structure Validation
   */
  private validateRoleStructure(initPack: ServiceInitPack): void {
    if (!initPack.defaultRoles) return;

    let defaultRoleCount = 0;
    initPack.defaultRoles.forEach((role, index) => {
      if (!role.name) {
        this.addError('InvalidFieldStructure', 'error', `defaultRoles[${index}].name`, 'Role name is required');
      }
      if (!role.slug) {
        this.addError('InvalidFieldStructure', 'error', `defaultRoles[${index}].slug`, 'Role slug is required');
      }
      if (!role.permissions || role.permissions.length === 0) {
        this.addError('InvalidFieldStructure', 'warning', `defaultRoles[${index}].permissions`,
          'Role should have at least one permission');
      }

      if (role.isDefault) {
        defaultRoleCount++;
      }
    });

    if (defaultRoleCount > 1) {
      this.addError('InvalidFieldStructure', 'warning', 'defaultRoles',
        `Multiple roles marked as default (${defaultRoleCount}). Only one should be default.`);
    }
  }

  /**
   * B) Theme Preset Validation
   */
  private validateThemePreset(initPack: ServiceInitPack): void {
    if (!initPack.defaultTheme) {
      this.addError('MissingInitPackField', 'warning', 'defaultTheme', 'No default theme specified');
      return;
    }

    const validPresets = VALID_THEME_PRESETS[initPack.serviceGroup] || VALID_THEME_PRESETS.default;
    const allValidPresets = [...validPresets, ...VALID_THEME_PRESETS.default];

    if (!allValidPresets.includes(initPack.defaultTheme)) {
      // Check if it's a custom theme preset
      if (initPack.themePreset && initPack.themePreset.id === initPack.defaultTheme) {
        this.addError('InvalidThemePreset', 'info', 'defaultTheme',
          `Using custom theme preset '${initPack.defaultTheme}'`);
      } else {
        this.addError('InvalidThemePreset', 'warning', 'defaultTheme',
          `Theme preset '${initPack.defaultTheme}' is not in the recommended list for ${initPack.serviceGroup}. ` +
          `Recommended: ${validPresets.join(', ')}`);
      }
    }

    // Validate custom theme preset structure
    if (initPack.themePreset) {
      if (!initPack.themePreset.id) {
        this.addError('InvalidFieldStructure', 'error', 'themePreset.id', 'Theme preset id is required');
      }
      if (!initPack.themePreset.name) {
        this.addError('InvalidFieldStructure', 'error', 'themePreset.name', 'Theme preset name is required');
      }
      if (!initPack.themePreset.colors) {
        this.addError('InvalidFieldStructure', 'error', 'themePreset.colors', 'Theme preset colors are required');
      }
    }
  }

  /**
   * B) Seed Data Validation
   */
  private validateSeedData(initPack: ServiceInitPack): void {
    if (!initPack.seedData) return;

    initPack.seedData.forEach((seed, index) => {
      if (!seed.entityType) {
        this.addError('InvalidFieldStructure', 'error', `seedData[${index}].entityType`, 'Seed data entityType is required');
      }
      if (!seed.data || Object.keys(seed.data).length === 0) {
        this.addError('InvalidFieldStructure', 'warning', `seedData[${index}].data`, 'Seed data should not be empty');
      }

      // Check for skipIfExists without uniqueKey
      if (seed.skipIfExists && !seed.uniqueKey) {
        this.addError('InvalidFieldStructure', 'warning', `seedData[${index}]`,
          'skipIfExists is set but uniqueKey is missing - skipIfExists will have no effect');
      }
    });
  }

  /**
   * C) Duplication Detection
   */
  private detectDuplicates(initPack: ServiceInitPack): void {
    // Check menu path duplicates
    if (initPack.defaultMenus) {
      const allPaths: string[] = [];
      initPack.defaultMenus.forEach(menu => {
        this.collectMenuPaths(menu.items, allPaths);
      });

      const duplicatePaths = this.findDuplicates(allPaths);
      duplicatePaths.forEach(path => {
        this.addError('DuplicateEntry', 'warning', 'defaultMenus',
          `Duplicate menu path found: '${path}'`);
      });
    }

    // Check category slug duplicates
    if (initPack.defaultCategories) {
      const slugs = initPack.defaultCategories.map(c => c.slug);
      const duplicateSlugs = this.findDuplicates(slugs);
      duplicateSlugs.forEach(slug => {
        this.addError('DuplicateEntry', 'error', 'defaultCategories',
          `Duplicate category slug found: '${slug}'`);
      });
    }

    // Check page slug duplicates
    if (initPack.defaultPages) {
      const slugs = initPack.defaultPages.map(p => p.slug);
      const duplicateSlugs = this.findDuplicates(slugs);
      duplicateSlugs.forEach(slug => {
        this.addError('DuplicateEntry', 'error', 'defaultPages',
          `Duplicate page slug found: '${slug}'`);
      });
    }

    // Check role slug duplicates
    if (initPack.defaultRoles) {
      const slugs = initPack.defaultRoles.map(r => r.slug);
      const duplicateSlugs = this.findDuplicates(slugs);
      duplicateSlugs.forEach(slug => {
        this.addError('DuplicateEntry', 'error', 'defaultRoles',
          `Duplicate role slug found: '${slug}'`);
      });
    }
  }

  /**
   * Collect all menu paths recursively
   */
  private collectMenuPaths(items: MenuItemDefinition[], paths: string[]): void {
    items.forEach(item => {
      if (item.path) {
        paths.push(item.path);
      }
      if (item.children) {
        this.collectMenuPaths(item.children, paths);
      }
    });
  }

  /**
   * Find duplicate values in an array
   */
  private findDuplicates(arr: string[]): string[] {
    const seen = new Set<string>();
    const duplicates = new Set<string>();
    arr.forEach(item => {
      if (seen.has(item)) {
        duplicates.add(item);
      }
      seen.add(item);
    });
    return Array.from(duplicates);
  }

  /**
   * D) Cross-Service Conflict Detection
   */
  private detectCrossServiceConflicts(initPack: ServiceInitPack): void {
    const serviceGroup = initPack.serviceGroup;
    const otherServices = Object.keys(SERVICE_NAVIGATION_KEYS).filter(s => s !== serviceGroup);

    // Check menus for cross-service keys
    if (initPack.defaultMenus) {
      initPack.defaultMenus.forEach(menu => {
        this.checkMenuItemsForConflicts(menu.items, serviceGroup, otherServices, 'defaultMenus');
      });
    }

    // Check categories for cross-service keys
    if (initPack.defaultCategories) {
      initPack.defaultCategories.forEach((category, index) => {
        otherServices.forEach(otherService => {
          const otherKeys = SERVICE_NAVIGATION_KEYS[otherService] || [];
          const slug = category.slug.toLowerCase();
          const name = category.name.toLowerCase();

          otherKeys.forEach(key => {
            if (slug.includes(key) || name.includes(key)) {
              this.addError('CrossServiceConflict', 'error', `defaultCategories[${index}]`,
                `Category '${category.name}' contains ${otherService}-specific key '${key}' in ${serviceGroup} InitPack`);
            }
          });
        });
      });
    }

    // Check pages for cross-service keys
    if (initPack.defaultPages) {
      initPack.defaultPages.forEach((page, index) => {
        otherServices.forEach(otherService => {
          const otherKeys = SERVICE_NAVIGATION_KEYS[otherService] || [];
          const slug = page.slug.toLowerCase();
          const title = page.title.toLowerCase();

          otherKeys.forEach(key => {
            if (slug.includes(key) || title.includes(key)) {
              this.addError('CrossServiceConflict', 'error', `defaultPages[${index}]`,
                `Page '${page.title}' contains ${otherService}-specific key '${key}' in ${serviceGroup} InitPack`);
            }
          });
        });
      });
    }
  }

  /**
   * Check menu items for cross-service conflicts
   */
  private checkMenuItemsForConflicts(
    items: MenuItemDefinition[],
    serviceGroup: string,
    otherServices: string[],
    basePath: string
  ): void {
    items.forEach((item, index) => {
      otherServices.forEach(otherService => {
        const otherKeys = SERVICE_NAVIGATION_KEYS[otherService] || [];
        const label = item.label.toLowerCase();
        const path = (item.path || '').toLowerCase();
        const id = item.id.toLowerCase();

        otherKeys.forEach(key => {
          if (label.includes(key) || path.includes(key) || id.includes(key)) {
            this.addError('CrossServiceConflict', 'error', `${basePath}[${index}]`,
              `Menu item '${item.label}' contains ${otherService}-specific key '${key}' in ${serviceGroup} InitPack`);
          }
        });
      });

      // Check children
      if (item.children) {
        this.checkMenuItemsForConflicts(item.children, serviceGroup, otherServices, `${basePath}[${index}].children`);
      }
    });
  }

  // ===========================================================================
  // Helper Methods
  // ===========================================================================

  /**
   * Add an error to the appropriate list
   */
  private addError(
    type: LintErrorType,
    severity: LintSeverity,
    field: string,
    message: string,
    details?: Record<string, unknown>
  ): void {
    const error: LintError = { type, severity, field, message, details };

    switch (severity) {
      case 'error':
        this.errors.push(error);
        break;
      case 'warning':
        this.warnings.push(error);
        break;
      case 'info':
        this.infos.push(error);
        break;
    }
  }

  /**
   * Calculate quality score
   * 100 - (errors * 20) - (warnings * 5)
   */
  private calculateScore(): number {
    const penalty = (this.errors.length * 20) + (this.warnings.length * 5);
    return Math.max(0, 100 - penalty);
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

export const initPackLinter = new InitPackLinter();

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Quick lint function
 */
export function lintInitPack(initPack: ServiceInitPack): LintResult {
  return initPackLinter.lint(initPack);
}

/**
 * Lint all InitPacks
 */
export function lintAllInitPacks(initPacks: ServiceInitPack[]): LintResult[] {
  return initPackLinter.lintAll(initPacks);
}
