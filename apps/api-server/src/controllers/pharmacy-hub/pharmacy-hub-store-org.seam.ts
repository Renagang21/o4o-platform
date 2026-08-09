/**
 * Pharmacy-Hub 조직 해석 seam — 공통 라우터에 주입하는 어댑터
 *
 * WO-PHARMACY-HUB-STORE-TABLET-SERVICE-SCOPED-INTEGRATION-V1
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 왜 필요한가
 *   `routes/platform/store-tablet.routes.ts` 는 40여 개 엔드포인트가 전부 같은 seam
 *   (`withStoreAuth`)을 통과해 `organizationId` 하나만 주입받는 구조다.
 *   그 기본 해석기는 `createRequireStoreOwner(dataSource)` 를 **serviceKey 없이** 호출하므로
 *     (a) 모든 서비스의 store_owner role 을 통과시키고
 *     (b) 조직을 `organization_members` 의 **정렬 없는 LIMIT 1** 로 고른다.
 *   다중 조직 계정에서 어느 서비스의 매장이 잡힐지 보장되지 않는다
 *   (CHECK-PHARMACY-HUB-STORE-EXECUTION-ASSETS-V1 §8-① 부채).
 *
 *   공통 가드(`createRequireStoreOwner`)는 KPA·GlycoPharm·K-Cosmetics 가 함께 쓰므로
 *   변경하지 않고, **조직 해석만** Pharmacy-Hub enrollment 기준으로 갈아 끼운다.
 *
 * 계약 (StoreTabletRoutesOptions.resolveOrganizationId)
 *   반환 `string` : 그 조직으로 핸들러 실행
 *   반환 `null`   : **이미 응답을 보낸 상태** — 핸들러를 실행하지 않는다
 *
 * 인증은 하지 않는다. 이 seam 을 쓰는 라우터는 호출 측에서 이미
 * `requireAuth` + `requirePharmacyHubScope('pharmacy-hub:store_owner')` 를 통과했다.
 */
import type { Request, Response } from 'express';
import {
  resolvePharmacyHubStoreOrganization,
  type StoreOrgResolution,
} from './store-organization.resolver.js';
import logger from '../../utils/logger.js';

/**
 * 미연결·모호 상태를 다른 Pharmacy-Hub 매장 컨트롤러와 **같은 코드·같은 상태코드**로 응답한다.
 * (읽기든 쓰기든 409 로 통일 — 이 seam 을 쓰는 공통 라우터는 읽기/쓰기를 구분해 주지 않는다.)
 */
function sendBlocked(res: Response, resolution: StoreOrgResolution): null {
  if (resolution.status === 'not_connected') {
    res.status(409).json({
      success: false,
      error: '매장이 연결되어 있지 않아 태블릿을 관리할 수 없습니다.',
      code: 'STORE_NOT_CONNECTED',
    });
    return null;
  }
  res.status(409).json({
    success: false,
    error: '연결된 매장이 여러 개입니다. 운영자에게 문의해 주세요.',
    code: 'AMBIGUOUS_STORE_CONNECTION',
  });
  return null;
}

/**
 * 공통 store 라우터에 주입할 Pharmacy-Hub 조직 해석기.
 *
 * 클라이언트가 보낸 organizationId·storeId 는 어떤 경우에도 신뢰하지 않는다 —
 * 조직은 항상 인증 사용자 + pharmacy-hub active enrollment 로 서버가 다시 결정한다.
 */
export async function resolvePharmacyHubOrganizationForRoute(
  req: Request,
  res: Response,
): Promise<string | null> {
  const userId = (req as any).user?.id;
  if (typeof userId !== 'string' || userId.length === 0) {
    res.status(401).json({ success: false, error: 'Unauthorized', code: 'AUTH_REQUIRED' });
    return null;
  }

  try {
    const resolution = await resolvePharmacyHubStoreOrganization(userId);
    if (resolution.status !== 'connected') return sendBlocked(res, resolution);
    return resolution.organizationId;
  } catch (error) {
    logger.error('[PharmacyHubStoreOrgSeam] resolve failed', {
      userId,
      path: req.originalUrl,
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      success: false,
      error: '매장 정보를 확인하지 못했습니다.',
      code: 'STORE_RESOLVE_FAILED',
    });
    return null;
  }
}
