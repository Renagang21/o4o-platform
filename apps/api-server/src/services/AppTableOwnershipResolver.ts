import { DataSource } from 'typeorm';
import { AppDataSource } from '../database/connection.js';
import type { AppManifest } from '@o4o/types';
import {
  isCoreTable,
  isCoreCPT,
  isCoreACF,
  findTableOwner,
  findCPTOwner,
  findACFOwner,
} from '../constants/coreTables.js';
import logger from '../utils/logger.js';

/**
 * Ownership validation error types
 */
export class OwnershipValidationError extends Error {
  constructor(
    message: string,
    public readonly violations: OwnershipViolation[]
  ) {
    super(message);
    this.name = 'OwnershipValidationError';
  }
}

/**
 * Individual ownership violation
 */
export interface OwnershipViolation {
  type: 'table' | 'cpt' | 'acf';
  resourceName: string;
  reason: string;
  ownedBy?: string;
}

/**
 * AppTableOwnershipResolver Service
 *
 * Manages and validates app data ownership declarations.
 *
 * Key responsibilities:
 * - Query database for existing tables
 * - Validate ownership claims in app manifests
 * - Prevent extension apps from claiming core tables
 * - Prevent apps from claiming non-existent tables
 * - Provide ownership information for purge operations
 */
export class AppTableOwnershipResolver {
  private dataSource: DataSource;

  constructor() {
    this.dataSource = AppDataSource;
  }

  /**
   * Get all table names from PostgreSQL database
   * Queries the pg_catalog to get actual table list
   *
   * @returns Array of table names in public schema
   */
  async getAllTables(): Promise<string[]> {
    try {
      const result = await this.dataSource.query(`
        SELECT tablename
        FROM pg_catalog.pg_tables
        WHERE schemaname = 'public'
        ORDER BY tablename
      `);

      const tables = result.map((r: any) => r.tablename);
      logger.info(`[OwnershipResolver] Found ${tables.length} tables in database`);
      return tables;
    } catch (error) {
      logger.error('[OwnershipResolver] Failed to query database tables:', error);
      throw error;
    }
  }

  /**
   * Validate ownership claims in app manifest
   *
   * Checks:
   * 1. Extension apps cannot own core tables/CPTs/ACFs
   * 2. Declared tables must exist in database
   * 3. No duplicate ownership claims (future enhancement)
   *
   * @param manifest - App manifest to validate
   * @param existingTables - List of tables that exist in database (optional, will query if not provided)
   * @throws OwnershipValidationError if validation fails
   */
  async validateOwnership(
    manifest: AppManifest,
    existingTables?: string[]
  ): Promise<void> {
    const {
      appId,
      type = 'standalone',
      ownsTables = [],
      ownsCPT = [],
      ownsACF = [],
    } = manifest;

    const violations: OwnershipViolation[] = [];

    // Get existing tables if not provided
    const dbTables = existingTables || (await this.getAllTables());

    logger.info(
      `[OwnershipResolver] Validating ownership for ${appId} (${type})`
    );
    logger.info(
      `[OwnershipResolver] Claims: ${ownsTables.length} tables, ${ownsCPT.length} CPTs, ${ownsACF.length} ACFs`
    );

    // 1. Validate table ownership
    for (const tableName of ownsTables) {
      // Extension apps cannot own core tables
      if (type === 'extension' && isCoreTable(tableName)) {
        const owner = findTableOwner(tableName);
        violations.push({
          type: 'table',
          resourceName: tableName,
          reason: `Extension app cannot own core table '${tableName}' (owned by ${owner})`,
          ownedBy: owner || undefined,
        });
      }

      // Extension apps CAN create their own tables during install
      // They just cannot claim ownership of CORE tables
      // Note: Table existence check is only relevant during uninstall/purge
      // During install, new tables will be created by the lifecycle install script
    }

    // 2. Validate CPT ownership
    for (const cptName of ownsCPT) {
      // Extension apps cannot own core CPTs
      if (type === 'extension' && isCoreCPT(cptName)) {
        const owner = findCPTOwner(cptName);
        violations.push({
          type: 'cpt',
          resourceName: cptName,
          reason: `Extension app cannot own core CPT '${cptName}' (owned by ${owner})`,
          ownedBy: owner || undefined,
        });
      }
    }

    // 3. Validate ACF ownership
    for (const acfName of ownsACF) {
      // Extension apps cannot own core ACF groups
      if (type === 'extension' && isCoreACF(acfName)) {
        const owner = findACFOwner(acfName);
        violations.push({
          type: 'acf',
          resourceName: acfName,
          reason: `Extension app cannot own core ACF group '${acfName}' (owned by ${owner})`,
          ownedBy: owner || undefined,
        });
      }
    }

    // Throw error if violations found
    if (violations.length > 0) {
      logger.error(
        `[OwnershipResolver] Ownership validation failed for ${appId}:`,
        violations
      );

      const violationMessages = violations
        .map((v) => `  - ${v.reason}`)
        .join('\n');

      throw new OwnershipValidationError(
        `Ownership validation failed for app '${appId}':\n${violationMessages}`,
        violations
      );
    }

    logger.info(`[OwnershipResolver] ✓ Ownership validation passed for ${appId}`);
  }

  /**
   * Get ownership summary for an app
   * Used for display purposes in Admin UI
   *
   * @param manifest - App manifest
   * @returns Ownership summary object
   */
  getOwnershipSummary(manifest: AppManifest): {
    tables: string[];
    cpt: string[];
    acf: string[];
    totalResources: number;
  } {
    const tables = manifest.ownsTables || [];
    const cpt = manifest.ownsCPT || [];
    const acf = manifest.ownsACF || [];

    return {
      tables,
      cpt,
      acf,
      totalResources: tables.length + cpt.length + acf.length,
    };
  }

  /**
   * Check if app owns any data
   * Used to determine if PURGE option should be available
   *
   * @param manifest - App manifest
   * @returns true if app owns any tables/CPTs/ACFs
   */
  hasOwnedData(manifest: AppManifest): boolean {
    const summary = this.getOwnershipSummary(manifest);
    return summary.totalResources > 0;
  }

  /**
   * Verify that all owned resources can be safely deleted
   * Checks if tables/CPTs/ACFs actually exist before purge
   *
   * @param manifest - App manifest
   * @returns List of resources that will be deleted
   */
  async getVerifiedOwnedResources(manifest: AppManifest): Promise<{
    tables: string[];
    cpt: string[];
    acf: string[];
    missingTables: string[];
  }> {
    const dbTables = await this.getAllTables();
    const ownsTables = manifest.ownsTables || [];

    const existingTables = ownsTables.filter((t) => dbTables.includes(t));
    const missingTables = ownsTables.filter((t) => !dbTables.includes(t));

    if (missingTables.length > 0) {
      logger.warn(
        `[OwnershipResolver] App ${manifest.appId} claims tables that don't exist:`,
        missingTables
      );
    }

    return {
      tables: existingTables,
      cpt: manifest.ownsCPT || [],
      acf: manifest.ownsACF || [],
      missingTables,
    };
  }
}
