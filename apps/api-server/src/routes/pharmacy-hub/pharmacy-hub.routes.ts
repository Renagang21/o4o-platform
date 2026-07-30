/**
 * Pharmacy-Hub Routes (Foundation)
 *
 * WO-PHARMACY-HUB-NEW-SERVICE-FOUNDATION-V1
 *
 * Foundation 범위 — 서비스 키 · 표시명 · 역할 경계가 동작하는지 확인하는 최소 라우트만 둔다.
 *
 *   GET /api/v1/pharmacy-hub/service-info            (public)  서비스 식별 정보
 *   GET /api/v1/pharmacy-hub/me/access               (auth)    내 멤버십/역할 진입점
 *   GET /api/v1/pharmacy-hub/operator/ping           (operator scope)
 *   GET /api/v1/pharmacy-hub/store-owner/ping        (store_owner scope)
 *   GET /api/v1/pharmacy-hub/supplier/ping           (supplier scope)
 *
 * 포함하지 않는 것 (후속 WO):
 *   가입 신청·승인 write-path, 회원 관리, 상품 카탈로그/장바구니/주문,
 *   콘텐츠 저작·전달, 커뮤니티, 이벤트 오퍼.
 *
 * 공통 원장 재사용 원칙 (WO §3):
 *   users / organizations / service_memberships / ProductMaster /
 *   SupplierProductOffer / cart / order / 콘텐츠 원장을 그대로 재사용한다.
 *   Pharmacy-Hub 전용 사본 테이블은 만들지 않는다.
 */

import { Router } from 'express';
import { getService } from '../../config/service-catalog.js';
import { SERVICE_KEYS } from '../../constants/service-keys.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requirePharmacyHubScope } from '../../middleware/pharmacy-hub-scope.middleware.js';

const SERVICE_KEY = SERVICE_KEYS.PHARMACY_HUB;

export function createPharmacyHubRoutes(): Router {
  const router = Router();

  /** 서비스 식별 정보 (public) — 프론트 브랜드/도메인 표시 및 키 등록 확인용 */
  router.get('/service-info', (_req, res) => {
    const svc = getService(SERVICE_KEY);
    if (!svc) {
      return res.status(500).json({
        success: false,
        error: 'Pharmacy-Hub service is not registered in the service catalog',
        code: 'SERVICE_NOT_REGISTERED',
      });
    }
    return res.json({
      success: true,
      data: {
        serviceKey: svc.key,
        name: svc.name,
        nameKo: svc.nameKo ?? svc.name,
        domain: svc.domain,
        description: svc.description,
        joinEnabled: svc.joinEnabled,
        eventOfferServiceKey: SERVICE_KEYS.PHARMACY_HUB_EVENT_OFFER,
      },
    });
  });

  /**
   * 내 접근 상태 (auth) — service_memberships 기반 서비스별 가입 상태 + 역할 진입점.
   * 다른 서비스 회원을 자동 편입하지 않는다: 멤버십이 없으면 status='none'.
   */
  router.get('/me/access', requireAuth as any, (req: any, res) => {
    const user = req.user ?? {};
    // membership 판정은 guard(createMembershipScopeGuard)와 동일한 JWT payload 축을 읽는다.
    // 별도 조회 경로를 만들지 않는다 (drift 방지).
    const memberships: { serviceKey: string; status: string }[] = user.memberships || [];
    const membershipStatus =
      memberships.find((m) => m.serviceKey === SERVICE_KEY)?.status ?? 'none';
    const roles: string[] = Array.isArray(user.roles) ? user.roles : [];
    const serviceRoles = roles.filter((r) => r.startsWith(`${SERVICE_KEY}:`));

    return res.json({
      success: true,
      data: {
        serviceKey: SERVICE_KEY,
        membershipStatus,
        roles: serviceRoles,
        entryPoints: {
          storeOwner: serviceRoles.includes(`${SERVICE_KEY}:store_owner`),
          supplier: serviceRoles.includes(`${SERVICE_KEY}:supplier`),
          operator: serviceRoles.includes(`${SERVICE_KEY}:operator`),
        },
      },
    });
  });

  /** 역할별 진입점 guard 동작 확인 (Foundation ping) */
  router.get(
    '/operator/ping',
    requireAuth as any,
    requirePharmacyHubScope(`${SERVICE_KEY}:operator`),
    (_req, res) => res.json({ success: true, data: { scope: `${SERVICE_KEY}:operator` } })
  );

  router.get(
    '/store-owner/ping',
    requireAuth as any,
    requirePharmacyHubScope(`${SERVICE_KEY}:store_owner`),
    (_req, res) => res.json({ success: true, data: { scope: `${SERVICE_KEY}:store_owner` } })
  );

  router.get(
    '/supplier/ping',
    requireAuth as any,
    requirePharmacyHubScope(`${SERVICE_KEY}:supplier`),
    (_req, res) => res.json({ success: true, data: { scope: `${SERVICE_KEY}:supplier` } })
  );

  return router;
}
