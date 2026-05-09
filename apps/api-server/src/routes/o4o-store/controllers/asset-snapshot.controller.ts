/**
 * KPA Asset Snapshot Controller
 *
 * WO-O4O-ASSET-COPY-CORE-EXTRACTION-V1
 * WO-O4O-KPA-BRANCH-DISTRICT-LEGACY-CLEANUP-V1: kpa:branch_admin / kpa:branch_operator 제거
 * WO-O4O-LMS-STORE-LIBRARY-FOUNDATION-V1: assetType 'lesson' 추가 (LMS 강의 Reference Metadata)
 * WO-O4O-CONTENT-HUB-ASSET-SNAPSHOT-WIRING-V1: assetType 'content' 추가 (kpa_contents Full Copy)
 *
 * Uses Core Controller Factory with KPA-specific config:
 * - Roles: kpa:admin, kpa:operator, kpa:pharmacist
 * - Org: KpaMember.organization_id
 * - Resolver: KpaAssetResolver (CmsContent + signage_media + lms_courses + kpa_contents)
 * - Asset types: cms, signage, lesson, content
 */

import type { RequestHandler } from 'express';
import type { Router } from 'express';
import { DataSource } from 'typeorm';
import { createAssetCopyController } from '@o4o/asset-copy-core';
import { KpaAssetResolver } from '../../../modules/asset-snapshot/resolvers/kpa-asset.resolver.js';
import { KpaMember } from '../../kpa/entities/kpa-member.entity.js';

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
    allowedRoles: ['kpa:admin', 'kpa:operator', 'kpa:pharmacist'],
    sourceService: 'kpa',
    resolver: new KpaAssetResolver(dataSource),
    resolveOrgId: resolveKpaOrgId,
    noOrgErrorCode: 'NO_ORGANIZATION',
    noOrgMessage: 'User has no KPA organization membership',
    // WO-O4O-LMS-STORE-LIBRARY-FOUNDATION-V1: LMS 강의(lesson) 자료함 가져가기 허용.
    //   Resolver가 published + reusable_policy != restricted 만 통과시킨다.
    // WO-O4O-CONTENT-HUB-ASSET-SNAPSHOT-WIRING-V1: KPA 콘텐츠 허브(content) 가져가기 허용.
    //   Resolver가 is_deleted=false 만 통과시킨다.
    allowedAssetTypes: ['cms', 'signage', 'lesson', 'content'],
  });
}
