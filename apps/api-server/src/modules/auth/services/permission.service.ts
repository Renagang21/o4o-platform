/**
 * PermissionService - Manages Permission entity and app-level permissions
 *
 * Extends BaseService to inherit standard CRUD operations.
 * Provides permission management features:
 * - App-specific permission registration
 * - Batch permission registration
 * - Permission lifecycle management
 * - Permission validation
 */

import { BaseService } from '../../../common/base.service.js';
import { AppDataSource } from '../../../database/connection.js';
import { Permission } from '../entities/Permission.js';
import logger from '../../../utils/logger.js';

export interface RegisterPermissionInput {
  /** Permission key (e.g., 'forum.read') */
  key: string;

  /** Human-readable description */
  description?: string;

  /** App that owns this permission */
  appId: string;
}

export class PermissionService extends BaseService<Permission> {
  constructor() {
    super(AppDataSource.getRepository(Permission));
  }

  /**
   * Find permission by key
   * @param key - Permission key (e.g., 'forum.read')
   * @returns Permission or null if not found
   */
  async findByKey(key: string): Promise<Permission | null> {
    return await this.repository.findOne({ where: { key } });
  }

  /**
   * Register a new permission for an app
   * If permission already exists, updates its appId and description
   *
   * @param input - Permission registration data
   * @returns Created or updated permission
   * @throws Error if permission key format is invalid
   */
  async registerPermission(input: RegisterPermissionInput): Promise<Permission> {
    const { key, description, appId } = input;

    // Parse category from key (e.g., 'forum.read' -> 'forum')
    const [category, action] = key.split('.');
    if (!category || !action) {
      throw new Error(
        `Invalid permission key format: ${key}. Expected format: 'category.action'`
      );
    }

    // Check if permission already exists
    let permission = await this.findByKey(key);

    if (permission) {
      // Update existing permission
      logger.info(
        `[PermissionService] Updating existing permission: ${key} -> appId: ${appId}`
      );
      permission.appId = appId;
      permission.description = description || permission.description;
      permission.category = category;
    } else {
      // Create new permission
      logger.info(
        `[PermissionService] Creating new permission: ${key} (appId: ${appId})`
      );
      permission = this.repository.create({
        key,
        description: description || `${category} - ${action}`,
        category,
        appId,
        isActive: true,
      });
    }

    return await this.repository.save(permission);
  }

  /**
   * Register multiple permissions for an app
   * Continues on errors to register as many permissions as possible
   *
   * @param appId - App identifier
   * @param permissions - Array of permission keys or detailed inputs
   * @returns Array of successfully created/updated permissions
   */
  async registerPermissions(
    appId: string,
    permissions: Array<string | RegisterPermissionInput>
  ): Promise<Permission[]> {
    const results: Permission[] = [];

    for (const perm of permissions) {
      try {
        const input: RegisterPermissionInput =
          typeof perm === 'string' ? { key: perm, appId } : { ...perm, appId };

        const permission = await this.registerPermission(input);
        results.push(permission);
      } catch (error) {
        logger.error(`[PermissionService] Failed to register permission:`, error);
        // Continue with other permissions
      }
    }

    return results;
  }

  /**
   * Delete permissions owned by a specific app
   *
   * @param appId - App identifier
   * @returns Number of deleted permissions
   */
  async deletePermissionsByApp(appId: string): Promise<number> {
    logger.info(`[PermissionService] Deleting permissions for app: ${appId}`);

    const permissions = await this.repository.find({ where: { appId } });

    if (permissions.length === 0) {
      logger.info(`[PermissionService] No permissions found for app: ${appId}`);
      return 0;
    }

    await this.repository.remove(permissions);

    logger.info(
      `[PermissionService] Deleted ${permissions.length} permissions for app: ${appId}`
    );
    return permissions.length;
  }

  /**
   * Get all permissions owned by a specific app
   *
   * @param appId - App identifier
   * @returns Array of permissions
   */
  async getPermissionsByApp(appId: string): Promise<Permission[]> {
    return await this.repository.find({ where: { appId } });
  }

  /**
   * Check if a permission exists by key
   *
   * @param key - Permission key
   * @returns true if permission exists, false otherwise
   */
  async permissionExists(key: string): Promise<boolean> {
    const permission = await this.findByKey(key);
    return !!permission;
  }

  /**
   * Get all permissions by category
   *
   * @param category - Permission category (e.g., 'forum', 'commerce')
   * @returns Array of permissions in the category
   */
  async getPermissionsByCategory(category: string): Promise<Permission[]> {
    return await this.repository.find({
      where: { category },
      order: { key: 'ASC' },
    });
  }

  /**
   * Get all active permissions
   *
   * @returns Array of active permissions
   */
  async getActivePermissions(): Promise<Permission[]> {
    return await this.repository.find({
      where: { isActive: true },
      order: { category: 'ASC', key: 'ASC' },
    });
  }
}

// Export singleton instance
export const permissionService = new PermissionService();

export default PermissionService;
