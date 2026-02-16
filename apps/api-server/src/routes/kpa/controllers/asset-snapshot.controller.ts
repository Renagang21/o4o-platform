/**
 * KPA Asset Snapshot Controller
 *
 * WO-O4O-ASSET-COPY-CORE-EXTRACTION-V1
 *
 * Uses Core Controller Factory with KPA-specific config:
 * - Roles: kpa:admin, kpa:operator, kpa:branch_admin, kpa:branch_operator
 * - Org: KpaMember.organization_id
 * - Resolver: KpaAssetResolver (CmsContent + signage_media)
 */

import type { RequestHandler } from 'express';
import type { Router } from 'express';
import { DataSource } from 'typeorm';
import { createAssetCopyController } from '@o4o/asset-copy-core';
import { KpaAssetResolver } from '../../../modules/asset-snapshot/resolvers/kpa-asset.resolver.js';
import { KpaMember } from '../entities/kpa-member.entity.js';

type AuthMiddleware = RequestHandler;

/**
 * Resolve KPA organization ID from user's membership
 */
async function resolveKpaOrgId(
  dataSource: DataSource,
  userId: string,
): Promise<string | null> {
  const memberRepo = dataSource.getRepository(KpaMember);
  const member = await memberRepo.findOne({
    where: { user_id: userId },
  });
  return member?.organization_id || null;
}

export function createAssetSnapshotController(
  dataSource: DataSource,
  requireAuth: AuthMiddleware,
): Router {
  return createAssetCopyController(dataSource, requireAuth, {
    allowedRoles: ['kpa:admin', 'kpa:operator', 'kpa:branch_admin', 'kpa:branch_operator'],
    sourceService: 'kpa',
    resolver: new KpaAssetResolver(dataSource),
    resolveOrgId: resolveKpaOrgId,
    noOrgErrorCode: 'NO_ORGANIZATION',
    noOrgMessage: 'User has no KPA organization membership',
  });
}
