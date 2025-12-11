/**
 * Service Initializer
 * Phase 8 — Service Environment Initialization
 *
 * Handles applying initialization packs to newly created services.
 * Creates menus, categories, settings, themes, and seed data.
 */

import logger from '../utils/logger.js';
import { initPackRegistry } from './init-pack-registry.js';
import type {
  ServiceInitPack,
  ServiceInitResult,
  MenuDefinition,
  CategoryDefinition,
  ServiceSettingsDefinition,
  ThemePresetDefinition,
  SeedDataDefinition,
} from './init-schema.js';

/**
 * Service Initializer Class
 *
 * Applies initialization packs to configure new service environments.
 */
export class ServiceInitializer {
  /**
   * Initialize a service with its init pack
   *
   * @param tenantId - Tenant ID
   * @param organizationId - Organization ID
   * @param templateId - Service template ID
   * @param options - Additional options
   */
  async initializeService(
    tenantId: string,
    organizationId: string,
    templateId: string,
    options?: {
      skipMenus?: boolean;
      skipCategories?: boolean;
      skipSettings?: boolean;
      skipTheme?: boolean;
      skipSeedData?: boolean;
      settingsOverride?: ServiceSettingsDefinition;
      themeOverride?: string;
    }
  ): Promise<ServiceInitResult> {
    const startTime = Date.now();
    const errors: Array<{ step: string; error: string }> = [];
    const warnings: Array<{ step: string; message: string }> = [];

    let menusCreated = 0;
    let categoriesCreated = 0;
    let pagesCreated = 0;
    let seedDataCreated = 0;
    let themeApplied: string | undefined;
    let settingsApplied = false;

    // Find init pack for template
    const initPack = initPackRegistry.getInitPackForTemplate(templateId);

    if (!initPack) {
      logger.warn(`[ServiceInitializer] No init pack found for template: ${templateId}`);
      return {
        success: true, // Not having an init pack is not a failure
        tenantId,
        organizationId,
        initPackId: '',
        menusCreated: 0,
        categoriesCreated: 0,
        pagesCreated: 0,
        seedDataCreated: 0,
        settingsApplied: false,
        errors: [],
        warnings: [{ step: 'init_pack', message: `No init pack found for template: ${templateId}` }],
        initializationTimeMs: Date.now() - startTime,
      };
    }

    logger.info(`[ServiceInitializer] Initializing service: tenant=${tenantId}, pack=${initPack.id}`);

    // Step 1: Apply default menus
    if (!options?.skipMenus && initPack.defaultMenus) {
      try {
        menusCreated = await this.applyMenus(tenantId, initPack.defaultMenus);
        logger.info(`[ServiceInitializer] Created ${menusCreated} menus`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        errors.push({ step: 'menus', error: errorMsg });
        logger.error(`[ServiceInitializer] Failed to create menus:`, error);
      }
    }

    // Step 2: Apply default categories
    if (!options?.skipCategories && initPack.defaultCategories) {
      try {
        categoriesCreated = await this.applyCategories(tenantId, initPack.defaultCategories);
        logger.info(`[ServiceInitializer] Created ${categoriesCreated} categories`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        errors.push({ step: 'categories', error: errorMsg });
        logger.error(`[ServiceInitializer] Failed to create categories:`, error);
      }
    }

    // Step 3: Apply default settings
    if (!options?.skipSettings) {
      try {
        const settings = options?.settingsOverride || initPack.defaultSettings;
        if (settings) {
          await this.applySettings(tenantId, settings);
          settingsApplied = true;
          logger.info(`[ServiceInitializer] Applied settings`);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        errors.push({ step: 'settings', error: errorMsg });
        logger.error(`[ServiceInitializer] Failed to apply settings:`, error);
      }
    }

    // Step 4: Apply theme
    if (!options?.skipTheme) {
      try {
        const themeId = options?.themeOverride || initPack.defaultTheme;
        const themePreset = initPack.themePreset;

        if (themeId || themePreset) {
          themeApplied = await this.applyTheme(tenantId, themeId, themePreset);
          logger.info(`[ServiceInitializer] Applied theme: ${themeApplied}`);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        errors.push({ step: 'theme', error: errorMsg });
        logger.error(`[ServiceInitializer] Failed to apply theme:`, error);
      }
    }

    // Step 5: Create default pages
    if (initPack.defaultPages) {
      try {
        pagesCreated = await this.createPages(tenantId, initPack.defaultPages);
        logger.info(`[ServiceInitializer] Created ${pagesCreated} pages`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        errors.push({ step: 'pages', error: errorMsg });
        logger.error(`[ServiceInitializer] Failed to create pages:`, error);
      }
    }

    // Step 6: Apply seed data
    if (!options?.skipSeedData && initPack.seedData) {
      try {
        seedDataCreated = await this.applySeedData(tenantId, initPack.seedData);
        logger.info(`[ServiceInitializer] Created ${seedDataCreated} seed data entries`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        errors.push({ step: 'seed_data', error: errorMsg });
        logger.error(`[ServiceInitializer] Failed to apply seed data:`, error);
      }
    }

    // Step 7: Create default roles
    if (initPack.defaultRoles) {
      try {
        await this.createRoles(tenantId, initPack.defaultRoles);
        logger.info(`[ServiceInitializer] Created ${initPack.defaultRoles.length} roles`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        errors.push({ step: 'roles', error: errorMsg });
        logger.error(`[ServiceInitializer] Failed to create roles:`, error);
      }
    }

    // Step 8: Run post-init hooks
    if (initPack.postInitHooks) {
      for (const hookName of initPack.postInitHooks) {
        try {
          await this.runPostInitHook(tenantId, hookName);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          warnings.push({ step: `hook:${hookName}`, message: errorMsg });
        }
      }
    }

    const success = errors.length === 0;
    const initializationTimeMs = Date.now() - startTime;

    logger.info(`[ServiceInitializer] Initialization ${success ? 'completed' : 'completed with errors'} in ${initializationTimeMs}ms`);

    return {
      success,
      tenantId,
      organizationId,
      initPackId: initPack.id,
      menusCreated,
      categoriesCreated,
      pagesCreated,
      seedDataCreated,
      themeApplied,
      settingsApplied,
      errors,
      warnings,
      initializationTimeMs,
    };
  }

  /**
   * Apply menu definitions
   */
  private async applyMenus(tenantId: string, menus: MenuDefinition[]): Promise<number> {
    let count = 0;

    for (const menu of menus) {
      try {
        // Store menu in tenant's navigation settings
        // This would integrate with the existing navigation system
        await this.storeMenuForTenant(tenantId, menu);
        count++;
      } catch (error) {
        logger.error(`[ServiceInitializer] Failed to create menu ${menu.id}:`, error);
      }
    }

    return count;
  }

  /**
   * Store menu for tenant (placeholder - integrates with navigation system)
   */
  private async storeMenuForTenant(tenantId: string, menu: MenuDefinition): Promise<void> {
    // TODO: Integrate with actual navigation storage system
    // For now, this is a placeholder that logs the action
    logger.debug(`[ServiceInitializer] Storing menu ${menu.id} for tenant ${tenantId}`);

    // In a real implementation, this would:
    // 1. Create navigation_menus record
    // 2. Create navigation_items records for each menu item
    // 3. Set up parent-child relationships
  }

  /**
   * Apply category definitions
   */
  private async applyCategories(tenantId: string, categories: CategoryDefinition[]): Promise<number> {
    let count = 0;

    for (const category of categories) {
      try {
        await this.storeCategoryForTenant(tenantId, category);
        count++;
      } catch (error) {
        logger.error(`[ServiceInitializer] Failed to create category ${category.slug}:`, error);
      }
    }

    return count;
  }

  /**
   * Store category for tenant (placeholder - integrates with taxonomy system)
   */
  private async storeCategoryForTenant(tenantId: string, category: CategoryDefinition): Promise<void> {
    // TODO: Integrate with actual taxonomy storage system
    logger.debug(`[ServiceInitializer] Storing category ${category.slug} for tenant ${tenantId}`);

    // In a real implementation, this would:
    // 1. Create taxonomy record if not exists
    // 2. Create term record for the category
    // 3. Set up parent-child relationships if parentSlug is set
  }

  /**
   * Apply settings
   */
  private async applySettings(tenantId: string, settings: ServiceSettingsDefinition): Promise<void> {
    // TODO: Integrate with settings storage system
    logger.debug(`[ServiceInitializer] Applying settings for tenant ${tenantId}:`, settings);

    // In a real implementation, this would:
    // 1. Store general settings
    // 2. Store SEO settings
    // 3. Enable/disable feature flags
  }

  /**
   * Apply theme
   */
  private async applyTheme(
    tenantId: string,
    themeId?: string,
    themePreset?: ThemePresetDefinition
  ): Promise<string | undefined> {
    if (themePreset) {
      // Store custom theme preset
      await this.storeThemePreset(tenantId, themePreset);
      return themePreset.id;
    }

    if (themeId) {
      // Apply existing theme by ID
      await this.setActiveTheme(tenantId, themeId);
      return themeId;
    }

    return undefined;
  }

  /**
   * Store theme preset for tenant
   */
  private async storeThemePreset(tenantId: string, themePreset: ThemePresetDefinition): Promise<void> {
    // TODO: Integrate with appearance/theme system
    logger.debug(`[ServiceInitializer] Storing theme preset ${themePreset.id} for tenant ${tenantId}`);

    // In a real implementation, this would:
    // 1. Store theme preset in theme_presets table
    // 2. Generate CSS variables from preset
    // 3. Set as active theme for tenant
  }

  /**
   * Set active theme for tenant
   */
  private async setActiveTheme(tenantId: string, themeId: string): Promise<void> {
    // TODO: Integrate with appearance system
    logger.debug(`[ServiceInitializer] Setting active theme ${themeId} for tenant ${tenantId}`);
  }

  /**
   * Create default pages
   */
  private async createPages(
    tenantId: string,
    pages: Array<{
      slug: string;
      title: string;
      content?: string;
      template?: string;
      isHomepage?: boolean;
    }>
  ): Promise<number> {
    let count = 0;

    for (const page of pages) {
      try {
        await this.createPageForTenant(tenantId, page);
        count++;
      } catch (error) {
        logger.error(`[ServiceInitializer] Failed to create page ${page.slug}:`, error);
      }
    }

    return count;
  }

  /**
   * Create page for tenant
   */
  private async createPageForTenant(
    tenantId: string,
    page: {
      slug: string;
      title: string;
      content?: string;
      template?: string;
      isHomepage?: boolean;
    }
  ): Promise<void> {
    // TODO: Integrate with CMS/page system
    logger.debug(`[ServiceInitializer] Creating page ${page.slug} for tenant ${tenantId}`);

    // In a real implementation, this would:
    // 1. Create post/page record with CPT 'page'
    // 2. Set template if specified
    // 3. Mark as homepage if isHomepage is true
  }

  /**
   * Apply seed data
   */
  private async applySeedData(tenantId: string, seedData: SeedDataDefinition[]): Promise<number> {
    let count = 0;

    for (const seed of seedData) {
      try {
        // Check if should skip
        if (seed.skipIfExists && seed.uniqueKey) {
          const exists = await this.checkSeedDataExists(tenantId, seed);
          if (exists) {
            logger.debug(`[ServiceInitializer] Skipping existing seed data: ${seed.entityType}/${seed.uniqueKey}`);
            continue;
          }
        }

        await this.createSeedData(tenantId, seed);
        count++;
      } catch (error) {
        logger.error(`[ServiceInitializer] Failed to create seed data:`, error);
      }
    }

    return count;
  }

  /**
   * Check if seed data already exists
   */
  private async checkSeedDataExists(tenantId: string, seed: SeedDataDefinition): Promise<boolean> {
    // TODO: Implement actual existence check
    return false;
  }

  /**
   * Create seed data entry
   */
  private async createSeedData(tenantId: string, seed: SeedDataDefinition): Promise<void> {
    // TODO: Integrate with entity creation system
    logger.debug(`[ServiceInitializer] Creating seed data ${seed.entityType} for tenant ${tenantId}`);
  }

  /**
   * Create roles
   */
  private async createRoles(
    tenantId: string,
    roles: Array<{
      name: string;
      slug: string;
      permissions: string[];
      isDefault?: boolean;
    }>
  ): Promise<void> {
    for (const role of roles) {
      try {
        await this.createRoleForTenant(tenantId, role);
      } catch (error) {
        logger.error(`[ServiceInitializer] Failed to create role ${role.slug}:`, error);
      }
    }
  }

  /**
   * Create role for tenant
   */
  private async createRoleForTenant(
    tenantId: string,
    role: {
      name: string;
      slug: string;
      permissions: string[];
      isDefault?: boolean;
    }
  ): Promise<void> {
    // TODO: Integrate with role/permission system
    logger.debug(`[ServiceInitializer] Creating role ${role.slug} for tenant ${tenantId}`);
  }

  /**
   * Run post-initialization hook
   */
  private async runPostInitHook(tenantId: string, hookName: string): Promise<void> {
    // TODO: Implement hook system
    logger.debug(`[ServiceInitializer] Running post-init hook ${hookName} for tenant ${tenantId}`);
  }

  /**
   * Get initialization preview
   */
  getInitializationPreview(templateId: string): {
    initPack: ServiceInitPack | undefined;
    menusCount: number;
    categoriesCount: number;
    pagesCount: number;
    seedDataCount: number;
    hasTheme: boolean;
    hasSettings: boolean;
    rolesCount: number;
  } {
    const initPack = initPackRegistry.getInitPackForTemplate(templateId);

    if (!initPack) {
      return {
        initPack: undefined,
        menusCount: 0,
        categoriesCount: 0,
        pagesCount: 0,
        seedDataCount: 0,
        hasTheme: false,
        hasSettings: false,
        rolesCount: 0,
      };
    }

    return {
      initPack,
      menusCount: initPack.defaultMenus?.length || 0,
      categoriesCount: initPack.defaultCategories?.length || 0,
      pagesCount: initPack.defaultPages?.length || 0,
      seedDataCount: initPack.seedData?.length || 0,
      hasTheme: !!(initPack.defaultTheme || initPack.themePreset),
      hasSettings: !!initPack.defaultSettings,
      rolesCount: initPack.defaultRoles?.length || 0,
    };
  }
}

/**
 * Singleton instance
 */
export const serviceInitializer = new ServiceInitializer();

export default serviceInitializer;
