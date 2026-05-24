/**
 * KPA Asset Snapshot Controller
 *
 * WO-O4O-ASSET-COPY-CORE-EXTRACTION-V1
 * WO-O4O-KPA-BRANCH-DISTRICT-LEGACY-CLEANUP-V1: kpa:branch_admin / kpa:branch_operator 제거
 * WO-O4O-LMS-STORE-LIBRARY-FOUNDATION-V1: assetType 'lesson' 추가 (LMS 강의 Reference Metadata)
 * WO-O4O-CONTENT-HUB-ASSET-SNAPSHOT-WIRING-V1: assetType 'content' 추가 (kpa_contents Full Copy)
 * WO-O4O-ASSET-SNAPSHOT-COPY-STORE-OWNER-ALIGN-V1: kpa:store_owner 권한 정렬
 *   매장(약국) 운영자는 자료함의 canonical principal — 콘텐츠 가져가기/POP/QR/블로그 제작의
 *   주된 사용자임. 기존 화이트리스트가 HQ role(admin/operator)과 일반 약사(pharmacist)만 포함했던
 *   것은 store_owner role 도입(types/roles.ts) 이전 구성으로, 정책과 불일치하여 본 WO에서 정렬.
 * WO-O4O-RESOURCES-LIBRARY-IMPORT-FLOW-V1: assetType 'resource' 추가 (kpa_contents sub_type='resource')
 * WO-O4O-OPERATOR-BLOG-PUBLISHING-BACKEND-FOUNDATION-V1: assetType 'blog' 추가 (Phase 1 Placeholder).
 *   현재는 KpaAssetResolver.resolveBlog 가 항상 null 반환 (Phase 2 schema 확장 후 활성화).
 *   허용 목록 에만 등록되어 외부 caller 가 'blog' assetType 으로 요청 시 controller 통과
 *   하되 source 미발견 (SOURCE_NOT_FOUND) 으로 처리된다.
 *
 * Uses Core Controller Factory with KPA-specific config:
 * - Roles: kpa:admin, kpa:operator, kpa:pharmacist, kpa:store_owner
 * - Org: KpaMember.organization_id
 * - Resolver: KpaAssetResolver (CmsContent + signage_media + lms_courses + kpa_contents content/resource + blog placeholder)
 * - Asset types: cms, signage, lesson, content, resource, blog (placeholder)
 */

import type { RequestHandler } from 'express';
import type { Router } from 'express';
import { DataSource } from 'typeorm';
import { createAssetCopyController } from '@o4o/asset-copy-core';
import { KpaAssetResolver } from '../../../modules/asset-snapshot/resolvers/kpa-asset.resolver.js';
import { KpaMember } from '../../kpa/entities/kpa-member.entity.js';
import { isStoreOwner } from '../../../utils/store-owner.utils.js';

type AuthMiddleware = RequestHandler;

/**
 * Resolve KPA organization ID — store-library-feed.controller 와 동일한 dual-resolution 전략.
 * WO-O4O-CONTENT-TO-STORE-LIBRARY-COPY-FIX-V1:
 *   store_owner의 경우 약국 org ID(organization_members)를 우선 반환하여
 *   store-library-feed 의 조회 org ID 와 일치시킨다.
 *   admin/operator 등 store_owner 가 아닌 경우 kpa_members fallback.
 */
async function resolveKpaOrgId(
  dataSource: DataSource,
  userId: string,
): Promise<string | null> {
  const { organizationId: pharmacyOrgId } = await isStoreOwner(dataSource, userId, 'kpa');
  if (pharmacyOrgId) return pharmacyOrgId;
  const memberRepo = dataSource.getRepository(KpaMember);
  const member = await memberRepo.findOne({ where: { user_id: userId } });
  return member?.organization_id || null;
}

export function createAssetSnapshotController(
  dataSource: DataSource,
  requireAuth: AuthMiddleware,
): Router {
  return createAssetCopyController(dataSource, requireAuth, {
    // WO-O4O-ASSET-SNAPSHOT-COPY-STORE-OWNER-ALIGN-V1: kpa:store_owner 추가.
    // 매장 단위 자료함은 store_owner가 canonical principal. 동일 controller가 cms/signage/lesson/
    // content/resource 5종 assetType 전체에 적용되므로, store_owner는 모든 자료 가져가기에 자동 허용된다.
    allowedRoles: ['kpa:admin', 'kpa:operator', 'kpa:pharmacist', 'kpa:store_owner'],
    sourceService: 'kpa',
    resolver: new KpaAssetResolver(dataSource),
    resolveOrgId: resolveKpaOrgId,
    noOrgErrorCode: 'NO_ORGANIZATION',
    noOrgMessage: 'User has no KPA organization membership',
    // WO-O4O-LMS-STORE-LIBRARY-FOUNDATION-V1: LMS 강의(lesson) 자료함 가져가기 허용.
    //   Resolver가 published + reusable_policy != restricted 만 통과시킨다.
    // WO-O4O-CONTENT-HUB-ASSET-SNAPSHOT-WIRING-V1: KPA 콘텐츠 허브(content) 가져가기 허용.
    //   Resolver가 is_deleted=false 만 통과시킨다.
    // WO-O4O-RESOURCES-LIBRARY-IMPORT-FLOW-V1: KPA 자료실(resource) 가져가기 허용.
    //   Resolver가 sub_type='resource' + is_deleted=false + reusable_policy≠restricted 통과시킨다.
    // WO-O4O-OPERATOR-BLOG-PUBLISHING-BACKEND-FOUNDATION-V1: 'blog' assetType 등록 (Phase 1 Placeholder).
    //   현재 resolveBlog 는 null 반환 — Phase 2 schema 확장 후 활성화.
    // WO-O4O-KPA-POP-OPERATOR-PUBLISHING-V1 Phase 1 (2026-05-24): 'pop' assetType 등록 (Phase 1 Placeholder).
    //   store_pops entity 는 신설됐으나 resolvePop 은 null 반환 — Phase 2 후속에서 실 구현.
    //   외부 caller 가 'pop' assetType 으로 요청 시 controller 통과하되 source 미발견
    //   (SOURCE_NOT_FOUND) 으로 처리된다.
    allowedAssetTypes: ['cms', 'signage', 'lesson', 'content', 'resource', 'blog', 'pop'],
  });
}
