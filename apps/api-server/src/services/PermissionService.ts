/**
 * Permission Service
 *
 * Manages app-level permissions.
 * Supports registering and deleting permissions owned by apps.
 */

import { Repository } from 'typeorm';
import { AppDataSource } from '../database/connection.js';
import { Permission } from '../entities/Permission.js';
import logger from '../utils/logger.js';

export interface RegisterPermissionInput {
  /** Permission key (e.g., 'forum.read') */
  key: string;

  /** Human-readable description */
  description?: string;

  /** App that owns this permission */
  appId: string;
}

export class PermissionService {
  private repo: Repository<Permission>;

  constructor() {
    this.repo = AppDataSource.getRepository(Permission);
  }

  /**
   * Register a new permission for an app
   * If permission already exists, updates its appId
   *
   * @param input - Permission registration data
   * @returns Created or updated permission
   */
  async registerPermission(input: RegisterPermissionInput): Promise<Permission> {
    const { key, description, appId } = input;

    // Parse category from key (e.g., 'forum.read' -> 'forum')
    const [category, action] = key.split('.');
    if (!category || !action) {
      throw new Error(`Invalid permission key format: ${key}. Expected format: 'category.action'`);
    }

    // Check if permission already exists
    let permission = await this.repo.findOne({ where: { key } });

    if (permission) {
      // Update existing permission
      logger.info(`[PermissionService] Updating existing permission: ${key} -> appId: ${appId}`);
      permission.appId = appId;
      permission.description = description || permission.description;
      permission.category = category;
    } else {
      // Create new permission
      logger.info(`[PermissionService] Creating new permission: ${key} (appId: ${appId})`);
      permission = this.repo.create({
        key,
        description: description || `${category} - ${action}`,
        category,
        appId,
        isActive: true,
      });
    }

    return await this.repo.save(permission);
  }

  /**
   * Register multiple permissions for an app
   *
   * @param appId - App identifier
   * @param permissions - Array of permission keys or detailed inputs
   * @returns Array of created/updated permissions
   */
  async registerPermissions(
    appId: string,
    permissions: Array<string | RegisterPermissionInput>
  ): Promise<Permission[]> {
    const results: Permission[] = [];

    for (const perm of permissions) {
      try {
        const input: RegisterPermissionInput = typeof perm === 'string'
          ? { key: perm, appId }
          : { ...perm, appId };

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
   * Delete permissions owned by an app
   *
   * @param appId - App identifier
   * @returns Number of deleted permissions
   */
  async deletePermissionsByApp(appId: string): Promise<number> {
    logger.info(`[PermissionService] Deleting permissions for app: ${appId}`);

    const permissions = await this.repo.find({ where: { appId } });

    if (permissions.length === 0) {
      logger.info(`[PermissionService] No permissions found for app: ${appId}`);
      return 0;
    }

    await this.repo.remove(permissions);

    logger.info(`[PermissionService] Deleted ${permissions.length} permissions for app: ${appId}`);
    return permissions.length;
  }

  /**
   * Get all permissions owned by an app
   *
   * @param appId - App identifier
   * @returns Array of permissions
   */
  async getPermissionsByApp(appId: string): Promise<Permission[]> {
    return await this.repo.find({ where: { appId } });
  }

  /**
   * Check if a permission exists
   *
   * @param key - Permission key
   * @returns true if permission exists
   */
  async permissionExists(key: string): Promise<boolean> {
    const permission = await this.repo.findOne({ where: { key } });
    return !!permission;
  }
}

export default PermissionService;
