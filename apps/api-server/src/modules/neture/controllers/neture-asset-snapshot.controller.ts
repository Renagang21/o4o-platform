/**
 * Neture Asset Snapshot Controller
 *
 * WO-O4O-ASSET-COPY-CORE-EXTRACTION-V1
 *
 * Uses Core Controller Factory with Neture-specific config:
 * - Roles: neture:admin, neture:supplier
 * - Org: neture_suppliers.id (supplierId)
 * - Resolver: NetureAssetResolver (NetureSupplierContent + signage_media)
 */

import type { RequestHandler } from 'express';
import type { Router } from 'express';
import { DataSource } from 'typeorm';
import { createAssetCopyController } from '@o4o/asset-copy-core';
import { NetureAssetResolver } from '../../asset-snapshot/resolvers/neture-asset.resolver.js';

type AuthMiddleware = RequestHandler;

/**
 * Resolve Neture supplier ID from user's linkage
 */
async function resolveNetureOrgId(
  dataSource: DataSource,
  userId: string,
): Promise<string | null> {
  const rows = await dataSource.query(
    `SELECT "id" FROM "neture_suppliers" WHERE "userId" = $1 AND "status" = 'ACTIVE' LIMIT 1`,
    [userId],
  );
  if (rows && rows.length > 0) {
    return rows[0].id;
  }
  return null;
}

export function createNetureAssetSnapshotController(
  dataSource: DataSource,
  requireAuth: AuthMiddleware,
): Router {
  return createAssetCopyController(dataSource, requireAuth, {
    allowedRoles: ['neture:admin', 'neture:supplier'],
    sourceService: 'neture',
    resolver: new NetureAssetResolver(dataSource),
    resolveOrgId: resolveNetureOrgId,
    noOrgErrorCode: 'NO_SUPPLIER',
    noOrgMessage: 'User has no active Neture supplier membership',
  });
}
