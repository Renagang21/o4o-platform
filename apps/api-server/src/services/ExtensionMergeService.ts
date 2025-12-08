/**
 * Extension Merge Service
 *
 * Handles conflict detection and resolution when Core/Extension apps
 * register overlapping CPTs, Routes, Menus, or Blocks.
 *
 * Merge Policies:
 * - ignore: Skip conflicting registration silently
 * - override: Replace existing with new registration
 * - error: Throw an error on conflict
 * - fallback: Use a fallback/default value
 */

import logger from '../utils/logger.js';

/**
 * Merge Policy Types
 */
export type MergePolicy = 'ignore' | 'override' | 'error' | 'fallback';

/**
 * Conflict Types
 */
export type ConflictType = 'cpt' | 'route' | 'menu' | 'block' | 'acf';

/**
 * Conflict Detection Result
 */
export interface ConflictResult {
  hasConflict: boolean;
  conflictType: ConflictType;
  existingOwner: string;
  newOwner: string;
  resourceId: string;
  details?: string;
}

/**
 * Merge Configuration
 */
export interface MergeConfig {
  cpt: MergePolicy;
  route: MergePolicy;
  menu: MergePolicy;
  block: MergePolicy;
  acf: MergePolicy;
}

/**
 * Registration Record
 */
interface RegistrationRecord {
  resourceId: string;
  type: ConflictType;
  owner: string;
  registeredAt: Date;
  metadata?: Record<string, any>;
}

/**
 * Merge Result
 */
export interface MergeResult {
  success: boolean;
  action: 'registered' | 'ignored' | 'overridden' | 'error';
  resourceId: string;
  type: ConflictType;
  message?: string;
}

/**
 * Default merge configuration
 * - CPT: error (strict - prevent duplicate content types)
 * - Route: error (strict - prevent routing conflicts)
 * - Menu: override (extensions can customize menus)
 * - Block: override (extensions can enhance blocks)
 * - ACF: override (extensions can add/modify fields)
 */
const DEFAULT_MERGE_CONFIG: MergeConfig = {
  cpt: 'error',
  route: 'error',
  menu: 'override',
  block: 'override',
  acf: 'override',
};

/**
 * Extension Merge Service
 *
 * Manages registration of app resources and handles conflicts
 */
export class ExtensionMergeService {
  private static instance: ExtensionMergeService;

  // Resource registries
  private cptRegistry: Map<string, RegistrationRecord> = new Map();
  private routeRegistry: Map<string, RegistrationRecord> = new Map();
  private menuRegistry: Map<string, RegistrationRecord> = new Map();
  private blockRegistry: Map<string, RegistrationRecord> = new Map();
  private acfRegistry: Map<string, RegistrationRecord> = new Map();

  // Configuration
  private config: MergeConfig;

  // Conflict history for debugging
  private conflictHistory: ConflictResult[] = [];

  private constructor(config?: Partial<MergeConfig>) {
    this.config = { ...DEFAULT_MERGE_CONFIG, ...config };
    logger.info('[ExtensionMerge] Service initialized with config:', this.config);
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: Partial<MergeConfig>): ExtensionMergeService {
    if (!ExtensionMergeService.instance) {
      ExtensionMergeService.instance = new ExtensionMergeService(config);
    }
    return ExtensionMergeService.instance;
  }

  /**
   * Reset instance (for testing)
   */
  static resetInstance(): void {
    ExtensionMergeService.instance = undefined as any;
  }

  /**
   * Update merge configuration
   */
  updateConfig(config: Partial<MergeConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('[ExtensionMerge] Config updated:', this.config);
  }

  /**
   * Get registry for a given type
   */
  private getRegistry(type: ConflictType): Map<string, RegistrationRecord> {
    switch (type) {
      case 'cpt':
        return this.cptRegistry;
      case 'route':
        return this.routeRegistry;
      case 'menu':
        return this.menuRegistry;
      case 'block':
        return this.blockRegistry;
      case 'acf':
        return this.acfRegistry;
    }
  }

  /**
   * Get merge policy for a given type
   */
  private getPolicy(type: ConflictType): MergePolicy {
    return this.config[type];
  }

  /**
   * Check for conflict
   */
  checkConflict(
    type: ConflictType,
    resourceId: string,
    newOwner: string
  ): ConflictResult | null {
    const registry = this.getRegistry(type);
    const existing = registry.get(resourceId);

    if (!existing) {
      return null; // No conflict
    }

    // Same owner re-registering is not a conflict
    if (existing.owner === newOwner) {
      return null;
    }

    const conflict: ConflictResult = {
      hasConflict: true,
      conflictType: type,
      existingOwner: existing.owner,
      newOwner,
      resourceId,
      details: `${type.toUpperCase()} "${resourceId}" is already registered by "${existing.owner}"`,
    };

    // Record conflict for history
    this.conflictHistory.push(conflict);

    return conflict;
  }

  /**
   * Register a resource with conflict handling
   */
  register(
    type: ConflictType,
    resourceId: string,
    owner: string,
    metadata?: Record<string, any>
  ): MergeResult {
    const registry = this.getRegistry(type);
    const policy = this.getPolicy(type);
    const conflict = this.checkConflict(type, resourceId, owner);

    // No conflict - register normally
    if (!conflict) {
      registry.set(resourceId, {
        resourceId,
        type,
        owner,
        registeredAt: new Date(),
        metadata,
      });

      logger.debug(`[ExtensionMerge] Registered ${type}: ${resourceId} (owner: ${owner})`);

      return {
        success: true,
        action: 'registered',
        resourceId,
        type,
      };
    }

    // Handle conflict based on policy
    switch (policy) {
      case 'ignore':
        logger.warn(
          `[ExtensionMerge] Conflict ignored: ${type} "${resourceId}" ` +
            `(existing: ${conflict.existingOwner}, attempted: ${owner})`
        );
        return {
          success: true,
          action: 'ignored',
          resourceId,
          type,
          message: `Ignored: ${resourceId} already registered by ${conflict.existingOwner}`,
        };

      case 'override':
        registry.set(resourceId, {
          resourceId,
          type,
          owner,
          registeredAt: new Date(),
          metadata,
        });
        logger.info(
          `[ExtensionMerge] Override: ${type} "${resourceId}" ` +
            `(${conflict.existingOwner} → ${owner})`
        );
        return {
          success: true,
          action: 'overridden',
          resourceId,
          type,
          message: `Overridden: ${resourceId} from ${conflict.existingOwner} to ${owner}`,
        };

      case 'error':
        logger.error(
          `[ExtensionMerge] Conflict error: ${type} "${resourceId}" ` +
            `already registered by ${conflict.existingOwner}`
        );
        return {
          success: false,
          action: 'error',
          resourceId,
          type,
          message: conflict.details,
        };

      case 'fallback':
        // For fallback, we keep the existing registration
        logger.warn(
          `[ExtensionMerge] Fallback: keeping existing ${type} "${resourceId}" ` +
            `(owner: ${conflict.existingOwner})`
        );
        return {
          success: true,
          action: 'ignored',
          resourceId,
          type,
          message: `Fallback: kept existing ${resourceId} by ${conflict.existingOwner}`,
        };

      default:
        throw new Error(`Unknown merge policy: ${policy}`);
    }
  }

  /**
   * Batch register multiple resources
   */
  registerBatch(
    type: ConflictType,
    resources: Array<{ id: string; metadata?: Record<string, any> }>,
    owner: string
  ): MergeResult[] {
    return resources.map((r) => this.register(type, r.id, owner, r.metadata));
  }

  /**
   * Unregister a resource
   */
  unregister(type: ConflictType, resourceId: string, owner: string): boolean {
    const registry = this.getRegistry(type);
    const existing = registry.get(resourceId);

    if (!existing) {
      logger.warn(`[ExtensionMerge] Unregister: ${type} "${resourceId}" not found`);
      return false;
    }

    if (existing.owner !== owner) {
      logger.warn(
        `[ExtensionMerge] Unregister denied: ${type} "${resourceId}" ` +
          `owned by ${existing.owner}, not ${owner}`
      );
      return false;
    }

    registry.delete(resourceId);
    logger.debug(`[ExtensionMerge] Unregistered ${type}: ${resourceId}`);
    return true;
  }

  /**
   * Unregister all resources for an owner
   */
  unregisterAll(owner: string): number {
    let count = 0;

    const registries = [
      this.cptRegistry,
      this.routeRegistry,
      this.menuRegistry,
      this.blockRegistry,
      this.acfRegistry,
    ];

    for (const registry of registries) {
      for (const [resourceId, record] of registry.entries()) {
        if (record.owner === owner) {
          registry.delete(resourceId);
          count++;
        }
      }
    }

    logger.info(`[ExtensionMerge] Unregistered ${count} resources for owner: ${owner}`);
    return count;
  }

  /**
   * Get all resources for an owner
   */
  getResourcesByOwner(owner: string): Record<ConflictType, string[]> {
    const result: Record<ConflictType, string[]> = {
      cpt: [],
      route: [],
      menu: [],
      block: [],
      acf: [],
    };

    const types: ConflictType[] = ['cpt', 'route', 'menu', 'block', 'acf'];

    for (const type of types) {
      const registry = this.getRegistry(type);
      for (const [resourceId, record] of registry.entries()) {
        if (record.owner === owner) {
          result[type].push(resourceId);
        }
      }
    }

    return result;
  }

  /**
   * Get owner of a resource
   */
  getOwner(type: ConflictType, resourceId: string): string | null {
    const registry = this.getRegistry(type);
    const record = registry.get(resourceId);
    return record?.owner ?? null;
  }

  /**
   * Check if a resource is registered
   */
  isRegistered(type: ConflictType, resourceId: string): boolean {
    return this.getRegistry(type).has(resourceId);
  }

  /**
   * Get conflict history
   */
  getConflictHistory(): ConflictResult[] {
    return [...this.conflictHistory];
  }

  /**
   * Clear conflict history
   */
  clearConflictHistory(): void {
    this.conflictHistory = [];
  }

  /**
   * Get statistics
   */
  getStats(): {
    cpt: number;
    route: number;
    menu: number;
    block: number;
    acf: number;
    conflicts: number;
  } {
    return {
      cpt: this.cptRegistry.size,
      route: this.routeRegistry.size,
      menu: this.menuRegistry.size,
      block: this.blockRegistry.size,
      acf: this.acfRegistry.size,
      conflicts: this.conflictHistory.length,
    };
  }

  /**
   * Validate app manifest for potential conflicts
   * Returns list of potential conflicts without registering
   */
  validateManifest(
    appId: string,
    manifest: {
      cpt?: Array<{ name: string }>;
      routes?: string[];
      acf?: Array<{ groupId: string }>;
    }
  ): ConflictResult[] {
    const conflicts: ConflictResult[] = [];

    // Check CPTs
    if (manifest.cpt) {
      for (const cpt of manifest.cpt) {
        const conflict = this.checkConflict('cpt', cpt.name, appId);
        if (conflict) conflicts.push(conflict);
      }
    }

    // Check Routes
    if (manifest.routes) {
      for (const route of manifest.routes) {
        const conflict = this.checkConflict('route', route, appId);
        if (conflict) conflicts.push(conflict);
      }
    }

    // Check ACF groups
    if (manifest.acf) {
      for (const acf of manifest.acf) {
        const conflict = this.checkConflict('acf', acf.groupId, appId);
        if (conflict) conflicts.push(conflict);
      }
    }

    return conflicts;
  }

  /**
   * Register resources from app manifest
   */
  registerFromManifest(
    appId: string,
    manifest: {
      cpt?: Array<{ name: string; [key: string]: any }>;
      routes?: string[];
      acf?: Array<{ groupId: string; [key: string]: any }>;
    }
  ): {
    success: boolean;
    results: MergeResult[];
    errors: string[];
  } {
    const results: MergeResult[] = [];
    const errors: string[] = [];

    // Register CPTs
    if (manifest.cpt) {
      for (const cpt of manifest.cpt) {
        const result = this.register('cpt', cpt.name, appId, cpt);
        results.push(result);
        if (!result.success) {
          errors.push(result.message || `Failed to register CPT: ${cpt.name}`);
        }
      }
    }

    // Register Routes
    if (manifest.routes) {
      for (const route of manifest.routes) {
        const result = this.register('route', route, appId);
        results.push(result);
        if (!result.success) {
          errors.push(result.message || `Failed to register route: ${route}`);
        }
      }
    }

    // Register ACF groups
    if (manifest.acf) {
      for (const acf of manifest.acf) {
        const result = this.register('acf', acf.groupId, appId, acf);
        results.push(result);
        if (!result.success) {
          errors.push(result.message || `Failed to register ACF: ${acf.groupId}`);
        }
      }
    }

    return {
      success: errors.length === 0,
      results,
      errors,
    };
  }
}

// Export singleton instance getter
export function getExtensionMergeService(
  config?: Partial<MergeConfig>
): ExtensionMergeService {
  return ExtensionMergeService.getInstance(config);
}
