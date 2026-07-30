/**
 * Pharmacy-Hub Routes
 *
 * WO-PHARMACY-HUB-NEW-SERVICE-FOUNDATION-V1 (Foundation)
 * WO-PHARMACY-HUB-MEMBERSHIP-JOIN-AND-APPROVAL-V1 (가입·승인)
 *
 *   GET   /api/v1/pharmacy-hub/service-info                              (public)
 *   GET   /api/v1/pharmacy-hub/me/access                                 (auth)
 *   POST  /api/v1/pharmacy-hub/join                                      (public)  가입 신청
 *   GET   /api/v1/pharmacy-hub/join/status                               (auth)    내 가입 상태
 *   GET   /api/v1/pharmacy-hub/operator/memberships                      (operator scope)
 *   GET   /api/v1/pharmacy-hub/operator/memberships/:id                  (operator scope)
 *   PATCH /api/v1/pharmacy-hub/operator/memberships/:id/approve          (operator scope)
 *   PATCH /api/v1/pharmacy-hub/operator/memberships/:id/reject           (operator scope)
 *   GET   /api/v1/pharmacy-hub/{operator|store-owner|supplier}/ping      (각 scope)
 *
 * 포함하지 않는 것 (후속 WO):
 *   상품 카탈로그/장바구니/주문, 콘텐츠 저작·전달, 커뮤니티, 이벤트 오퍼.
 *   운영자 권한은 회원 가입 승인·반려까지이며 상품·주문·콘텐츠 승인은 정의하지 않는다.
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
import { PharmacyHubJoinController } from '../../controllers/pharmacy-hub/PharmacyHubJoinController.js';
import { PharmacyHubMembershipConsoleController } from '../../controllers/pharmacy-hub/PharmacyHubMembershipConsoleController.js';
// WO-PHARMACY-HUB-SUPPLIER-PRODUCT-OFFER-DELIVERY-V1
import { PharmacyHubSupplierProductController } from '../../controllers/pharmacy-hub/PharmacyHubSupplierProductController.js';
import { PharmacyHubStoreProductController } from '../../controllers/pharmacy-hub/PharmacyHubStoreProductController.js';
import { createRequireActiveSupplier } from '../../modules/neture/middleware/neture-identity.middleware.js';
import { AppDataSource } from '../../database/connection.js';

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

  // ───────────────────────────────────────────────────────────────────────────
  // 가입 신청 (WO-PHARMACY-HUB-MEMBERSHIP-JOIN-AND-APPROVAL-V1 §6-A)
  //   POST /join         (public) 신규/기존 사용자 가입 신청 — Core register 경로에 위임
  //   GET  /join/status  (auth)   내 가입 상태
  // ───────────────────────────────────────────────────────────────────────────
  router.post('/join', PharmacyHubJoinController.apply);
  router.get('/join/status', requireAuth as any, PharmacyHubJoinController.myStatus);

  // ───────────────────────────────────────────────────────────────────────────
  // 운영자 회원 승인 콘솔 (§6-C)
  //   모든 엔드포인트가 requireAuth + pharmacy-hub:operator scope 를 요구하고,
  //   service_key='pharmacy-hub' 범위를 코드에서 고정한다.
  //   회원 가입 승인·반려 외의 승인(상품/주문/콘텐츠)은 정의하지 않는다 (§5.5).
  // ───────────────────────────────────────────────────────────────────────────
  const operatorGuards = [requireAuth as any, requirePharmacyHubScope(`${SERVICE_KEY}:operator`)];

  router.get('/operator/memberships', ...operatorGuards, PharmacyHubMembershipConsoleController.list);
  router.get(
    '/operator/memberships/:membershipId',
    ...operatorGuards,
    PharmacyHubMembershipConsoleController.detail,
  );
  router.patch(
    '/operator/memberships/:membershipId/approve',
    ...operatorGuards,
    PharmacyHubMembershipConsoleController.approve,
  );
  router.patch(
    '/operator/memberships/:membershipId/reject',
    ...operatorGuards,
    PharmacyHubMembershipConsoleController.reject,
  );

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

  // ───────────────────────────────────────────────────────────────────────────
  // 공급자 상품 제공 설정 (WO-PHARMACY-HUB-SUPPLIER-PRODUCT-OFFER-DELIVERY-V1 §6-A)
  //
  //   자격 3중 (WO §4.2):
  //     requireAuth
  //     → requirePharmacyHubScope('pharmacy-hub:supplier')  membership active + 역할
  //     → createRequireActiveSupplier                        Neture 공급자 원장 + ACTIVE
  //   본인 소유 Offer 검증은 setServiceDelivery / 목록 WHERE supplier_id 에서 수행한다.
  //
  //   상품 등록·수정은 여기 없다 — 기존 Neture 공급자 원장이 담당한다 (§9).
  // ───────────────────────────────────────────────────────────────────────────
  const supplierProductGuards = [
    requireAuth as any,
    requirePharmacyHubScope(`${SERVICE_KEY}:supplier`),
    createRequireActiveSupplier(AppDataSource) as any,
  ];

  router.get('/supplier/products', ...supplierProductGuards, PharmacyHubSupplierProductController.list);
  router.patch(
    '/supplier/products/:offerId/delivery',
    ...supplierProductGuards,
    PharmacyHubSupplierProductController.setDelivery,
  );

  // ───────────────────────────────────────────────────────────────────────────
  // 약국 경영자 상품 조회 (§6-D)
  //   Pharmacy-Hub 제공 대상 + 공통 안전 게이트를 통과한 상품만 노출한다.
  //   담기·주문·취급등록 액션은 이번 WO 범위 밖 (§9).
  // ───────────────────────────────────────────────────────────────────────────
  const storeOwnerGuards = [requireAuth as any, requirePharmacyHubScope(`${SERVICE_KEY}:store_owner`)];

  router.get('/store-owner/products', ...storeOwnerGuards, PharmacyHubStoreProductController.list);
  router.get('/store-owner/products/:offerId', ...storeOwnerGuards, PharmacyHubStoreProductController.detail);

  return router;
}
