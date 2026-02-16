/**
 * Controller Factory Configuration
 *
 * WO-O4O-ASSET-COPY-CORE-EXTRACTION-V1
 *
 * Each service provides this config to create a controller.
 * Core uses it to wire up routes without knowing service internals.
 */

import type { DataSource } from 'typeorm';
import type { ContentResolver } from './content-resolver.interface.js';
import type { PermissionChecker } from './permission-checker.interface.js';

/**
 * Config for createAssetCopyController()
 */
export interface AssetCopyControllerConfig {
  /** Service-prefixed roles allowed to copy/list assets */
  allowedRoles: string[];

  /** Source service identifier (e.g., 'kpa', 'neture') */
  sourceService: string;

  /** Content resolver for this service */
  resolver: ContentResolver;

  /**
   * Resolve organization/owner ID from authenticated user.
   * KPA → KpaMember.organization_id
   * Neture → neture_suppliers.id
   * Returns null if user has no membership.
   */
  resolveOrgId: (dataSource: DataSource, userId: string) => Promise<string | null>;

  /** Error code when user has no org membership (default: 'NO_ORGANIZATION') */
  noOrgErrorCode?: string;

  /** Error message when user has no org membership */
  noOrgMessage?: string;

  /**
   * Optional permission checker.
   * Default: exact string match (DefaultPermissionChecker).
   * Services with hierarchical roles can inject custom implementations.
   */
  permissionChecker?: PermissionChecker;
}
