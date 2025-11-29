/**
 * ACF Registry
 *
 * In-memory registry for ACF (Advanced Custom Fields) field groups.
 * Stores ACF group definitions from app manifests and provides
 * schema information for Admin UI form generation.
 */

import type { ACFGroupDefinition } from '@o4o/types';
import logger from '../utils/logger.js';

/**
 * ACF Group with app ownership info
 */
export interface ACFGroupWithApp extends ACFGroupDefinition {
  /** App that owns this ACF group */
  appId: string;

  /** Registration timestamp */
  registeredAt?: Date;
}

/**
 * Central ACF Registry
 * Validates and stores ACF group definitions for runtime access
 */
export class ACFRegistry {
  private groups = new Map<string, ACFGroupWithApp>();

  /**
   * Register a new ACF group
   * @param appId - App that owns this group
   * @param group - ACF group definition
   * @throws {Error} if validation fails or groupId already exists
   */
  register(appId: string, group: ACFGroupDefinition): void {
    // Basic validation
    if (!group.groupId) {
      throw new Error('ACF group must have a groupId');
    }

    if (!group.fields || group.fields.length === 0) {
      throw new Error(`ACF group "${group.groupId}" must have at least one field`);
    }

    // Check for duplicate registration
    if (this.groups.has(group.groupId)) {
      logger.warn(
        `[ACFRegistry] ACF group "${group.groupId}" is already registered. Replacing with new definition from ${appId}`
      );
    }

    // Store with app ownership and timestamp
    const groupWithApp: ACFGroupWithApp = {
      ...group,
      appId,
      registeredAt: new Date(),
    };

    this.groups.set(group.groupId, groupWithApp);
    logger.info(`[ACFRegistry] Registered ACF group: ${group.groupId} (app: ${appId})`);
  }

  /**
   * Register multiple ACF groups from an app
   * @param appId - App identifier
   * @param groups - Array of ACF group definitions
   */
  registerMultiple(appId: string, groups: ACFGroupDefinition[]): void {
    for (const group of groups) {
      try {
        this.register(appId, group);
      } catch (error) {
        logger.error(`[ACFRegistry] Failed to register ACF group "${group.groupId}":`, error);
        // Continue registering other groups
      }
    }
  }

  /**
   * Unregister ACF groups owned by an app
   * @param appId - App identifier
   * @returns Number of groups unregistered
   */
  unregisterByApp(appId: string): number {
    let count = 0;

    for (const [groupId, group] of this.groups.entries()) {
      if (group.appId === appId) {
        this.groups.delete(groupId);
        count++;
      }
    }

    if (count > 0) {
      logger.info(`[ACFRegistry] Unregistered ${count} ACF groups from app: ${appId}`);
    }

    return count;
  }

  /**
   * Get a specific ACF group by ID
   * @param groupId - ACF group ID
   * @returns ACF group definition or undefined
   */
  get(groupId: string): ACFGroupWithApp | undefined {
    return this.groups.get(groupId);
  }

  /**
   * Get all ACF groups for a specific CPT
   * @param cptName - CPT name (e.g., 'forum_post')
   * @returns Array of ACF groups that apply to this CPT
   */
  getGroupsForCPT(cptName: string): ACFGroupWithApp[] {
    const results: ACFGroupWithApp[] = [];

    for (const group of this.groups.values()) {
      if (group.appliesTo === cptName) {
        results.push(group);
      }
    }

    return results;
  }

  /**
   * Get all ACF groups owned by an app
   * @param appId - App identifier
   * @returns Array of ACF groups
   */
  getGroupsByApp(appId: string): ACFGroupWithApp[] {
    const results: ACFGroupWithApp[] = [];

    for (const group of this.groups.values()) {
      if (group.appId === appId) {
        results.push(group);
      }
    }

    return results;
  }

  /**
   * List all registered ACF groups
   * @returns Array of all ACF groups
   */
  listAll(): ACFGroupWithApp[] {
    return Array.from(this.groups.values());
  }

  /**
   * List all registered ACF group IDs
   * @returns Array of group IDs
   */
  listGroupIds(): string[] {
    return Array.from(this.groups.keys());
  }

  /**
   * Check if an ACF group is registered
   * @param groupId - ACF group ID
   * @returns true if group is registered
   */
  has(groupId: string): boolean {
    return this.groups.has(groupId);
  }

  /**
   * Clear all registered groups (for testing)
   */
  clear(): void {
    this.groups.clear();
    logger.info('[ACFRegistry] Cleared all ACF groups');
  }

  /**
   * Get total count of registered ACF groups
   * @returns Number of groups
   */
  count(): number {
    return this.groups.size;
  }

  /**
   * Get statistics about registered ACF groups
   * @returns Statistics object
   */
  getStats(): {
    totalGroups: number;
    groupsByApp: Record<string, number>;
    groupsByCPT: Record<string, number>;
  } {
    const groupsByApp: Record<string, number> = {};
    const groupsByCPT: Record<string, number> = {};

    for (const group of this.groups.values()) {
      // Count by app
      groupsByApp[group.appId] = (groupsByApp[group.appId] || 0) + 1;

      // Count by CPT
      if (group.appliesTo) {
        groupsByCPT[group.appliesTo] = (groupsByCPT[group.appliesTo] || 0) + 1;
      }
    }

    return {
      totalGroups: this.groups.size,
      groupsByApp,
      groupsByCPT,
    };
  }
}

/**
 * Global singleton ACF registry instance
 * Import this in your application bootstrap
 */
export const acfRegistry = new ACFRegistry();

export default acfRegistry;
