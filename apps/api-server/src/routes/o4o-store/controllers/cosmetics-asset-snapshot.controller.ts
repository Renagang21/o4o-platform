/**
 * K-Cosmetics Asset Snapshot Controller
 *
 * WO-O4O-KCOS-LIBRARY-ORGANIZATION-SCOPE-AND-SNAPSHOT-ROUTE-CLOSURE-V1
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 고친 결함
 *
 *   `cosmetics.routes.ts` 가 `/assets` 에 `createAssetSnapshotController`(KPA 전용)를
 *   그대로 마운트하고 있었다. 그 컨트롤러는
 *     - allowedRoles = kpa:*                    → KCos 전용 매장은 403
 *     - resolveOrgId = isStoreOwner(…, 'kpa')   → 두 서비스에 다 가입한 사용자는 **KPA 조직**으로 해석
 *       + KpaMember fallback
 *   이라서, KCos 자료함 목록(`GET /cosmetics/assets?type=content`)이 **KPA 조직 스냅샷**을 돌려줬다.
 *   POP V2 resolver 는 계약대로 KCos organizationId 로 조회하므로 그 id 를 찾지 못했다(404).
 *   404 는 V2 쪽이 옳았다는 증거다 — cross-org 유출을 막은 쪽이 resolver 다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 계약
 *
 *   KCos request → cosmetics:* role → isStoreOwner(…, 'cosmetics') → **KCos organizationId**
 *   → 그 조직의 snapshot list / copy / patch / delete
 *
 *   - **KPA organization fallback 금지.** kpa_members 를 보지 않는다.
 *   - body/query 의 organizationId 를 신뢰하지 않는다 (asset-copy-core 팩토리가 애초에 받지 않는다).
 *   - store_owner 가 아닌 admin/operator 는 조직이 없으므로 `NO_ORGANIZATION`(403).
 *     KPA 는 kpa_members fallback 이 있지만 KCos 에는 대응 원장이 없고,
 *     없는 fallback 을 KPA 테이블로 대신 채우는 것이 바로 이번 결함이었다.
 *
 * KPA 컨트롤러(`asset-snapshot.controller.ts`)는 **한 글자도 바꾸지 않는다.**
 */

import type { RequestHandler, Router } from 'express';
import { DataSource } from 'typeorm';
import { createAssetCopyController } from '@o4o/asset-copy-core';
import { CosmeticsAssetResolver, COSMETICS_SOURCE_SERVICE } from '../../../modules/asset-snapshot/resolvers/cosmetics-asset.resolver.js';
import { isStoreOwner } from '../../../utils/store-owner.utils.js';

type AuthMiddleware = RequestHandler;

/**
 * KCos organization 해석 — 오직 `cosmetics:store_owner` 의 조직만.
 * `serviceKey='cosmetics'` 를 명시해 다른 서비스 role 로의 침투를 차단한다
 * (store-owner.utils 의 service-scoped 경로 · service_memberships(active) 검사 포함).
 */
export async function resolveCosmeticsOrgId(
  dataSource: DataSource,
  userId: string,
): Promise<string | null> {
  const { organizationId } = await isStoreOwner(dataSource, userId, 'cosmetics');
  return organizationId ?? null;
}

/** KPA 목록과 같은 형태 — role prefix 만 cosmetics. */
export const COSMETICS_ASSET_SNAPSHOT_ROLES = [
  'cosmetics:admin',
  'cosmetics:operator',
  'cosmetics:pharmacist',
  'cosmetics:store_owner',
] as const;

/**
 * allowlist 는 copy + 목록 조회(GET /assets?type=) 양쪽에 쓰인다 (KPA 와 같은 이유).
 * 실제 신규 사본 생성은 resolver 분기가 있는 cms · signage 2종뿐이고,
 * 나머지는 목록 호환을 위해 남긴다(빼면 기존 사본 조회가 400 으로 깨진다).
 */
export const COSMETICS_ASSET_SNAPSHOT_TYPES = ['cms', 'signage', 'content', 'resource', 'blog', 'pop', 'qr'] as const;

export function createCosmeticsAssetSnapshotController(
  dataSource: DataSource,
  requireAuth: AuthMiddleware,
): Router {
  return createAssetCopyController(dataSource, requireAuth, {
    allowedRoles: [...COSMETICS_ASSET_SNAPSHOT_ROLES],
    sourceService: COSMETICS_SOURCE_SERVICE,
    resolver: new CosmeticsAssetResolver(dataSource),
    resolveOrgId: resolveCosmeticsOrgId,
    noOrgErrorCode: 'NO_ORGANIZATION',
    noOrgMessage: 'User has no K-Cosmetics store organization',
    allowedAssetTypes: [...COSMETICS_ASSET_SNAPSHOT_TYPES],
  });
}
