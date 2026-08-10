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
 *   GET   /api/v1/pharmacy-hub/store-owner/info                          (store_owner) 매장 정보
 *   PATCH /api/v1/pharmacy-hub/store-owner/info                          (store_owner) 매장 정보 수정
 *   GET   /api/v1/pharmacy-hub/store-owner/account/profile               (store_owner) 내 계정 조회
 *   PATCH /api/v1/pharmacy-hub/store-owner/account/profile               (store_owner) 내 계정 수정
 *   *     /api/v1/pharmacy-hub/store-owner/handled-products*             (store_owner) 매장 경영활용 제품
 *   *     /api/v1/pharmacy-hub/store-owner/local-products*               (store_owner) 매장 자체 상품
 *   *     /api/v1/pharmacy-hub/store-owner/content*                     (store_owner) 매장 콘텐츠
 *   *     /api/v1/pharmacy-hub/store-owner/library*                     (store_owner) 자료함
 *   *     /api/v1/pharmacy-hub/store-owner/blog*                        (store_owner) 블로그
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
import { PharmacyHubStoreDashboardController } from '../../controllers/pharmacy-hub/PharmacyHubStoreDashboardController.js';
// WO-PHARMACY-HUB-STORE-INFO-AND-ACCOUNT-V1
import { PharmacyHubStoreInfoController } from '../../controllers/pharmacy-hub/PharmacyHubStoreInfoController.js';
import { PharmacyHubAccountController } from '../../controllers/pharmacy-hub/PharmacyHubAccountController.js';
// WO-PHARMACY-HUB-STORE-HANDLED-PRODUCTS-V1
import { PharmacyHubHandledProductController } from '../../controllers/pharmacy-hub/PharmacyHubHandledProductController.js';
import { PharmacyHubLocalProductController } from '../../controllers/pharmacy-hub/PharmacyHubLocalProductController.js';
// WO-PHARMACY-HUB-STORE-CONTENT-LIBRARY-V1
import { PharmacyHubStoreContentController } from '../../controllers/pharmacy-hub/PharmacyHubStoreContentController.js';
import { PharmacyHubStoreLibraryController } from '../../controllers/pharmacy-hub/PharmacyHubStoreLibraryController.js';
import { PharmacyHubStoreBlogController } from '../../controllers/pharmacy-hub/PharmacyHubStoreBlogController.js';
// WO-PHARMACY-HUB-STORE-EXECUTION-ASSETS-V1 (매장 실행 자산)
import { PharmacyHubStoreQrController } from '../../controllers/pharmacy-hub/PharmacyHubStoreQrController.js';
import { PharmacyHubStoreManualController } from '../../controllers/pharmacy-hub/PharmacyHubStoreManualController.js';
import { PharmacyHubStorePopController } from '../../controllers/pharmacy-hub/PharmacyHubStorePopController.js';
import { PharmacyHubStoreSignageController } from '../../controllers/pharmacy-hub/PharmacyHubStoreSignageController.js';
// WO-PHARMACY-HUB-STORE-TABLET-SERVICE-SCOPED-INTEGRATION-V1 (태블릿 · Screen Set)
import { createStoreTabletRoutes } from '../platform/store-tablet.routes.js';
import { resolvePharmacyHubOrganizationForRoute } from '../../controllers/pharmacy-hub/pharmacy-hub-store-org.seam.js';
// WO-PHARMACY-HUB-B2B-CART-AND-BUYER-ORDER-V1
import { PharmacyHubCartController } from '../../controllers/pharmacy-hub/PharmacyHubCartController.js';
import { PharmacyHubOrderController } from '../../controllers/pharmacy-hub/PharmacyHubOrderController.js';
// WO-PHARMACY-HUB-PAYMENT-AND-SUPPLIER-FULFILLMENT-V1 (Phase 2)
import { PharmacyHubPaymentController } from '../../controllers/pharmacy-hub/PharmacyHubPaymentController.js';
import { PharmacyHubSupplierOrderController } from '../../controllers/pharmacy-hub/PharmacyHubSupplierOrderController.js';
import { PharmacyHubOperatorFulfillmentController } from '../../controllers/pharmacy-hub/PharmacyHubOperatorFulfillmentController.js';
import { createRequireActiveSupplier } from '../../modules/neture/middleware/neture-identity.middleware.js';
import { AppDataSource } from '../../database/connection.js';
import { resolveAccountAccess } from '../../common/auth/account-access.policy.js';

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
    // WO-O4O-RESTRICTED-LOGIN-FOR-PENDING-REJECTED-V1 §5-D:
    //   users.status=pending(restricted) 이면 DB role 이 잔존해도 진입점을 열지 않는다.
    //   (실제 차단은 중앙 가드가 담당하고, 여기서는 진입점 표시를 정규화한다 — §7.1)
    const restricted = resolveAccountAccess(user.status) === 'restricted';
    const serviceRoles = restricted ? [] : roles.filter((r) => r.startsWith(`${SERVICE_KEY}:`));

    return res.json({
      success: true,
      data: {
        serviceKey: SERVICE_KEY,
        membershipStatus,
        accountAccess: restricted ? 'restricted' : 'normal',
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
  //
  // WO-PHARMACY-HUB-ADMIN-ROLE-HIERARCHY-V1:
  //   admin ⊃ operator 계층을 실제로 관측할 수 있는 최소 진입점이다.
  //   admin/ping   → admin 만 통과 (operator 는 403)
  //   operator/ping → operator + admin 통과
  //   Admin 전용 관리 화면은 만들지 않는다 — 현재 분리할 근거 있는 기능이 없다 (WO §3 실행 3).
  router.get(
    '/admin/ping',
    requireAuth as any,
    requirePharmacyHubScope(`${SERVICE_KEY}:admin`),
    (_req, res) => res.json({ success: true, data: { scope: `${SERVICE_KEY}:admin` } })
  );

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

  // ───────────────────────────────────────────────────────────────────────────
  // 약국 경영자 홈 요약 (WO-PHARMACY-HUB-STORE-HOME-DASHBOARD-V1)
  //
  //   읽기 전용 SELECT 만 수행한다 — 신규 테이블·집계 저장소·migration 0.
  //   매장명은 organization_service_enrollments(service_code='pharmacy-hub',
  //   status='active') 스코프로만 해석하고, 장바구니·주문은 기존 buyerId 경계를
  //   그대로 사용한다. 상세 근거는 컨트롤러 상단 주석 참조.
  // ───────────────────────────────────────────────────────────────────────────
  router.get('/store-owner/dashboard', ...storeOwnerGuards, PharmacyHubStoreDashboardController.summary);

  // ───────────────────────────────────────────────────────────────────────────
  // 매장 정보 조회·수정 (WO-PHARMACY-HUB-STORE-INFO-AND-ACCOUNT-V1)
  //
  //   SSOT = organizations (+ enrollment / platform_store_slugs 표시).
  //   대상 조직은 **서버가** 인증 사용자 + pharmacy-hub active enrollment 로 결정한다 —
  //   클라이언트가 보낸 organizationId 는 신뢰하지 않으며 body 에 있으면 400 으로 거부한다.
  //   수정은 allowlist(name/phone/address/addressDetail/description) 만 반영한다.
  //   schema 변경·migration 0.
  // ───────────────────────────────────────────────────────────────────────────
  router.get('/store-owner/info', ...storeOwnerGuards, PharmacyHubStoreInfoController.get);
  router.patch('/store-owner/info', ...storeOwnerGuards, PharmacyHubStoreInfoController.update);

  // ───────────────────────────────────────────────────────────────────────────
  // 내 계정(프로필) 조회·수정 (동일 WO — 범위 B)
  //
  //   SSOT = users. 대상은 **항상 인증 사용자 자신**이며 body 로 다른 사용자를
  //   지목할 수 없다 (allowlist = name/nickname/phone).
  //   공통 /api/v1/users/* 는 `/password` 를 제외하면 requireAdmin 뒤에 있어
  //   일반 사용자 프로필 계약이 없다 → PH scope 최소 계약으로 둔다.
  //   비밀번호 변경은 기존 공통 계약(PUT /api/v1/users/password)을 그대로 쓴다.
  // ───────────────────────────────────────────────────────────────────────────
  router.get('/store-owner/account/profile', ...storeOwnerGuards, PharmacyHubAccountController.getProfile);
  router.patch('/store-owner/account/profile', ...storeOwnerGuards, PharmacyHubAccountController.updateProfile);

  // ───────────────────────────────────────────────────────────────────────────
  // 매장 경영활용 제품 · 매장 자체 상품 (WO-PHARMACY-HUB-STORE-HANDLED-PRODUCTS-V1)
  //
  //   `/store-owner/products`(위)는 **B2B 구매 대상 공급 상품**이고, 아래 두 축은
  //   **매장이 실제로 취급하는 제품**이다 — 합치거나 서로 대체하지 않는다.
  //     handled-products : O4O 상품 DB 제품을 매장이 취급 (organization_product_listings)
  //     local-products   : O4O 와 무관하게 매장이 직접 등록 (store_local_products)
  //   주문 완료 상품이 자동으로 취급 등록되지 않는다 (등록은 명시적 액션뿐).
  //
  //   저장 SSOT·검증 로직은 공통 services/store/* 를 그대로 호출한다 (복제 0).
  //   공통 `/api/v1/store/*` 대신 여기 두는 이유: 공통 라우트의 조직 해석
  //   (resolveStoreAccess → organization_members LIMIT 1)이 service enrollment 를
  //   보지 않아 다중 조직 계정에서 타 서비스 조직을 반환할 수 있기 때문이다.
  //   여기서는 resolvePharmacyHubStoreOrganization 으로만 조직을 정한다.
  //   schema 변경·migration 0.
  // ───────────────────────────────────────────────────────────────────────────
  router.get('/store-owner/handled-products', ...storeOwnerGuards, PharmacyHubHandledProductController.list);
  router.post('/store-owner/handled-products', ...storeOwnerGuards, PharmacyHubHandledProductController.apply);
  router.patch(
    '/store-owner/handled-products/active',
    ...storeOwnerGuards,
    PharmacyHubHandledProductController.setActive,
  );
  router.post(
    '/store-owner/handled-products/remove',
    ...storeOwnerGuards,
    PharmacyHubHandledProductController.remove,
  );

  router.get('/store-owner/local-products', ...storeOwnerGuards, PharmacyHubLocalProductController.list);
  router.post('/store-owner/local-products', ...storeOwnerGuards, PharmacyHubLocalProductController.create);
  router.get('/store-owner/local-products/:id', ...storeOwnerGuards, PharmacyHubLocalProductController.detail);
  router.put('/store-owner/local-products/:id', ...storeOwnerGuards, PharmacyHubLocalProductController.update);
  router.delete(
    '/store-owner/local-products/:id',
    ...storeOwnerGuards,
    PharmacyHubLocalProductController.deactivate,
  );

  // ───────────────────────────────────────────────────────────────────────────
  // 매장 콘텐츠 · 자료함 · 블로그 (WO-PHARMACY-HUB-STORE-CONTENT-LIBRARY-V1)
  //
  //   원장은 전부 공통 테이블이다 — 신규 Pharmacy-Hub 전용 테이블 0 / migration 0.
  //     content : kpa_store_contents      (legacy physical name = Store Production Material)
  //     library : store_execution_assets
  //     blog    : store_blog_posts        (경계 = store_id + service_key)
  //
  //   검증·SQL 계약은 공통 services/store/store-{content,library,blog}.service.ts 를
  //   그대로 호출한다 (KPA·K-Cosmetics 화면/로직 복사 0).
  //
  //   공통 `/api/v1/store/*` 를 그대로 마운트하지 않는 이유 — 세 축 모두 조직 해석이
  //   Pharmacy-Hub 와 어긋난다:
  //     library : createRequireStoreOwner(resolveStoreAccess) 가 service scope 없이
  //               organization_members 를 정렬 없는 LIMIT 1 로 고른다
  //     content : isStoreOwner(..., 'kpa') + KpaMember fallback (KPA 하드와이어)
  //     blog    : URL slug 로 매장을 찾고 소유 확인이 서비스별로 갈린다
  //   공통 resolveStoreAccess·공통 store-owner 가드는 변경 금지(WO)이므로 조직만 여기서 정한다.
  //
  //   블로그 V1 범위는 저작·관리까지다. Pharmacy-Hub 공개 블로그 렌더링 경로는
  //   아직 없으며 본 WO 에서 만들지 않는다 (발행 상태만 기록).
  // ───────────────────────────────────────────────────────────────────────────
  router.get('/store-owner/content', ...storeOwnerGuards, PharmacyHubStoreContentController.list);
  router.post('/store-owner/content', ...storeOwnerGuards, PharmacyHubStoreContentController.create);
  router.get('/store-owner/content/:id', ...storeOwnerGuards, PharmacyHubStoreContentController.detail);
  router.put('/store-owner/content/:id', ...storeOwnerGuards, PharmacyHubStoreContentController.update);
  router.delete('/store-owner/content/:id', ...storeOwnerGuards, PharmacyHubStoreContentController.remove);

  router.get('/store-owner/library', ...storeOwnerGuards, PharmacyHubStoreLibraryController.list);
  router.post('/store-owner/library', ...storeOwnerGuards, PharmacyHubStoreLibraryController.create);
  router.put('/store-owner/library/:id', ...storeOwnerGuards, PharmacyHubStoreLibraryController.update);
  router.delete('/store-owner/library/:id', ...storeOwnerGuards, PharmacyHubStoreLibraryController.deactivate);

  router.get('/store-owner/blog', ...storeOwnerGuards, PharmacyHubStoreBlogController.list);
  router.post('/store-owner/blog', ...storeOwnerGuards, PharmacyHubStoreBlogController.create);
  router.get('/store-owner/blog/:id', ...storeOwnerGuards, PharmacyHubStoreBlogController.detail);
  router.put('/store-owner/blog/:id', ...storeOwnerGuards, PharmacyHubStoreBlogController.update);
  router.patch('/store-owner/blog/:id/publish', ...storeOwnerGuards, PharmacyHubStoreBlogController.publish);
  router.patch('/store-owner/blog/:id/archive', ...storeOwnerGuards, PharmacyHubStoreBlogController.archive);
  router.delete('/store-owner/blog/:id', ...storeOwnerGuards, PharmacyHubStoreBlogController.remove);

  // ───────────────────────────────────────────────────────────────────────────
  // 매장 실행 자산 — QR (WO-PHARMACY-HUB-STORE-EXECUTION-ASSETS-V1 범위 A)
  //
  //   원장은 공통 store_qr_codes / store_qr_scan_events 다 — 신규 테이블 0 / migration 0.
  //   저장·검증·집계 계약은 공통 services/store/store-qr.service.ts 를 그대로 호출한다
  //   (KPA·GlycoPharm·K-Cosmetics 와 같은 함수 — 새 QR 엔진 0).
  //
  //   공통 `/pharmacy/qr/*` 를 마운트하지 않는 이유는 content/library 와 같다:
  //   createRequireStoreOwner(=resolveStoreAccess) 가 service scope 없이
  //   organization_members 를 정렬 없는 LIMIT 1 로 골라 PH enrollment 조직과 어긋날 수 있다.
  //
  //   연결 대상은 **매장 소유 자료만** 통과한다 (자료함 · 매장 콘텐츠 · 매장 경영활용 제품).
  //   `/store-owner/products` 의 B2B 공급 offer 를 실행 자산 SSOT 로 쓰지 않는다.
  // ───────────────────────────────────────────────────────────────────────────
  router.get('/store-owner/qr', ...storeOwnerGuards, PharmacyHubStoreQrController.list);
  // 정적 세그먼트 `sources` 는 `/:id/...` 보다 먼저 등록해야 :id 로 포획되지 않는다.
  router.get('/store-owner/qr/sources', ...storeOwnerGuards, PharmacyHubStoreQrController.sources);
  router.post('/store-owner/qr', ...storeOwnerGuards, PharmacyHubStoreQrController.create);
  router.get('/store-owner/qr/:id/analytics', ...storeOwnerGuards, PharmacyHubStoreQrController.analytics);
  router.get('/store-owner/qr/:id/export', ...storeOwnerGuards, PharmacyHubStoreQrController.exportFile);
  router.put('/store-owner/qr/:id', ...storeOwnerGuards, PharmacyHubStoreQrController.update);
  router.delete('/store-owner/qr/:id', ...storeOwnerGuards, PharmacyHubStoreQrController.deactivate);

  /**
   * 공개 QR 랜딩 (인증 없음) — QR payload 가 https://pharmacyhub.co.kr/qr/{slug} 이므로
   * Pharmacy-Hub 도메인에서 스캔이 해석되어야 한다. 해석·스캔 기록은 위와 같은 공통 service 다.
   * 상태 변경이 없는 조회 전용 GET 이며, 매장 소유 공개 콘텐츠만 응답에 담긴다.
   */
  router.get('/qr/public/:slug', PharmacyHubStoreQrController.publicLanding);

  // ───────────────────────────────────────────────────────────────────────────
  // 매장 실행 자산 — POP (동일 WO 범위 B)
  //
  //   원장은 공통 store_pops 다 (author_role='store', service_key='pharmacy-hub').
  //   저장·검증 계약은 공통 services/store/store-pop.service.ts 를 그대로 호출한다.
  //
  //   공통 `/stores/:slug/pop/staff/*` 를 마운트하지 않는 이유:
  //   그 라우트는 매장을 URL slug 로 찾고 소유를 created_by_user_id 로 확인한다.
  //   PH 매장은 프로비저닝이 만든 조직이라 created_by 가 경영자와 일치한다는 보장이 없다.
  //
  //   PH 에는 아직 운영자 POP 원본이 없다 — 억지 HUB 를 만들지 않고 기존 구조가 이미
  //   허용하는 매장 직접 작성(WO-O4O-POP-SAVE-AS-CONTENT-V1)을 주 경로로 둔다.
  //   `/pop/hub` 는 같은 계약을 노출할 뿐이며 원본이 없으면 정상적으로 빈 목록이다.
  // ───────────────────────────────────────────────────────────────────────────
  router.get('/store-owner/pop', ...storeOwnerGuards, PharmacyHubStorePopController.list);
  // 정적 세그먼트 `hub` 는 `/:id` 보다 먼저 등록해야 :id 로 포획되지 않는다.
  router.get('/store-owner/pop/hub', ...storeOwnerGuards, PharmacyHubStorePopController.hubSources);
  router.post('/store-owner/pop', ...storeOwnerGuards, PharmacyHubStorePopController.create);
  router.post('/store-owner/pop/import', ...storeOwnerGuards, PharmacyHubStorePopController.importFromHub);
  router.get('/store-owner/pop/:id', ...storeOwnerGuards, PharmacyHubStorePopController.detail);
  router.put('/store-owner/pop/:id', ...storeOwnerGuards, PharmacyHubStorePopController.update);
  router.patch('/store-owner/pop/:id/publish', ...storeOwnerGuards, PharmacyHubStorePopController.publish);
  router.patch('/store-owner/pop/:id/archive', ...storeOwnerGuards, PharmacyHubStorePopController.archive);
  router.delete('/store-owner/pop/:id', ...storeOwnerGuards, PharmacyHubStorePopController.remove);

  // ───────────────────────────────────────────────────────────────────────────
  // 매장 실행 자산 — 디지털 사이니지 (동일 WO 범위 D)
  //
  //   canonical 구조 그대로: 재생 단위 = store_playlists(+items), 항목 실체 =
  //   o4o_asset_snapshots(매장 소유 사본). 공통 StorePlaylistRepository 를 그대로 호출한다.
  //   항목 추가는 AssetCopyService 를 거쳐 매장 소유 스냅샷을 만든다 — 원본 직접 수정·row 공유 0.
  //   signage_media 는 매장 소유(organizationId 일치)만 추가 대상이며, 신규 미디어 등록
  //   경로는 만들지 않는다(운영자·공급자 영역).
  // ───────────────────────────────────────────────────────────────────────────
  router.get('/store-owner/signage/playlists', ...storeOwnerGuards, PharmacyHubStoreSignageController.listPlaylists);
  router.post('/store-owner/signage/playlists', ...storeOwnerGuards, PharmacyHubStoreSignageController.createPlaylist);
  router.get('/store-owner/signage/sources', ...storeOwnerGuards, PharmacyHubStoreSignageController.sources);
  router.patch('/store-owner/signage/playlists/:id', ...storeOwnerGuards, PharmacyHubStoreSignageController.updatePlaylist);
  router.delete('/store-owner/signage/playlists/:id', ...storeOwnerGuards, PharmacyHubStoreSignageController.archivePlaylist);
  router.get('/store-owner/signage/playlists/:id/items', ...storeOwnerGuards, PharmacyHubStoreSignageController.listItems);
  router.post(
    '/store-owner/signage/playlists/:id/items/from-library',
    ...storeOwnerGuards,
    PharmacyHubStoreSignageController.addItemFromLibrary,
  );
  router.post(
    '/store-owner/signage/playlists/:id/items/from-media',
    ...storeOwnerGuards,
    PharmacyHubStoreSignageController.addItemFromMedia,
  );
  router.patch(
    '/store-owner/signage/playlists/:id/items/reorder',
    ...storeOwnerGuards,
    PharmacyHubStoreSignageController.reorderItems,
  );
  router.delete(
    '/store-owner/signage/playlists/:id/items/:itemId',
    ...storeOwnerGuards,
    PharmacyHubStoreSignageController.deleteItem,
  );

  // ───────────────────────────────────────────────────────────────────────────
  // 매장 실행 자산 — 상품 설명서 (동일 WO 범위 E, 조회 전용)
  //
  //   canonical = shared_product_descriptions (description_type='STORE', status='canonical').
  //   본 WO 는 설명서를 새로 만들거나 번역하지 않는다 — 설명서 write 0.
  //   유일한 write 는 상품 QR(product_landings) 멱등 발급이며 명시적 POST 에서만 일어난다.
  // ───────────────────────────────────────────────────────────────────────────
  router.get('/store-owner/manuals', ...storeOwnerGuards, PharmacyHubStoreManualController.list);
  router.get('/store-owner/manuals/:listingId', ...storeOwnerGuards, PharmacyHubStoreManualController.detail);
  router.post(
    '/store-owner/manuals/:listingId/qr',
    ...storeOwnerGuards,
    PharmacyHubStoreManualController.issueProductQr,
  );

  // ───────────────────────────────────────────────────────────────────────────
  // 약국 장바구니 · 주문 (WO-PHARMACY-HUB-B2B-CART-AND-BUYER-ORDER-V1, Phase 1)
  //
  //   저장은 canonical store_cart_items / checkout_orders 재사용 — 신규 테이블 0.
  //   경계: buyerId(=인증 사용자) + serviceKey='pharmacy-hub' (서버 고정).
  //
  //   공용 /api/v1/store/cart/:serviceKey/* 대신 여기에 두는 이유:
  //     공용 라우트는 인증만 요구하고 Pharmacy-Hub membership·역할을 확인하지 않는다.
  //
  //   Phase 2 에서 결제·공급자 전달이 연결되었다 (아래 결제 블록 참조).
  // ───────────────────────────────────────────────────────────────────────────
  router.get('/store-owner/cart', ...storeOwnerGuards, PharmacyHubCartController.list);
  router.post('/store-owner/cart/items', ...storeOwnerGuards, PharmacyHubCartController.add);
  router.patch('/store-owner/cart/items/:itemId', ...storeOwnerGuards, PharmacyHubCartController.update);
  router.delete('/store-owner/cart/items/:itemId', ...storeOwnerGuards, PharmacyHubCartController.remove);

  router.post('/store-owner/orders', ...storeOwnerGuards, PharmacyHubOrderController.create);
  router.get('/store-owner/orders', ...storeOwnerGuards, PharmacyHubOrderController.list);
  router.get('/store-owner/orders/:orderId', ...storeOwnerGuards, PharmacyHubOrderController.detail);

  // ───────────────────────────────────────────────────────────────────────────
  // 결제 · 취소 (WO-PHARMACY-HUB-PAYMENT-AND-SUPPLIER-FULFILLMENT-V1)
  //
  //   공급자가 여럿이어도 구매자는 **1회 결제**한다 (paymentGroupId).
  //   결제 완료 이벤트만이 주문을 paid 로 전이시키고 공급자에게 전달한다 —
  //   이 라우트들은 어떤 경우에도 결제 상태를 직접 조작하지 않는다.
  // ───────────────────────────────────────────────────────────────────────────
  router.post('/store-owner/payments/prepare', ...storeOwnerGuards, PharmacyHubPaymentController.prepare);
  router.post('/store-owner/payments/confirm', ...storeOwnerGuards, PharmacyHubPaymentController.confirm);
  // 결제 전 단건 취소
  router.post(
    '/store-owner/orders/:orderId/cancel',
    ...storeOwnerGuards,
    PharmacyHubPaymentController.cancelBeforePayment,
  );
  // 결제 후 전체 취소·환불 (공급자 접수 전 한정)
  router.post(
    '/store-owner/payments/:paymentGroupId/cancel',
    ...storeOwnerGuards,
    PharmacyHubPaymentController.cancelAfterPayment,
  );

  // ───────────────────────────────────────────────────────────────────────────
  // 공급자 주문 처리 (WO-PHARMACY-HUB-PAYMENT-AND-SUPPLIER-FULFILLMENT-V1)
  //
  //   자격은 상품 제공 설정과 동일한 3중 guard 를 재사용한다.
  //   조회·전이 모두 service_key='pharmacy-hub' + 본인 공급자 소유로 스코프된다 —
  //   Neture 주문은 이 경로에 절대 노출되지 않는다.
  // ───────────────────────────────────────────────────────────────────────────
  router.get('/supplier/orders', ...supplierProductGuards, PharmacyHubSupplierOrderController.list);
  router.get('/supplier/orders/:orderId', ...supplierProductGuards, PharmacyHubSupplierOrderController.detail);
  router.post('/supplier/orders/:orderId/accept', ...supplierProductGuards, PharmacyHubSupplierOrderController.accept);
  router.post('/supplier/orders/:orderId/ship', ...supplierProductGuards, PharmacyHubSupplierOrderController.ship);

  // ───────────────────────────────────────────────────────────────────────────
  // 운영자 fulfillment 복구 (결제됐지만 공급자에게 전달되지 않은 주문의 유일한 공식 복구 경로)
  // ───────────────────────────────────────────────────────────────────────────
  router.get(
    '/operator/fulfillment/stuck',
    ...operatorGuards,
    PharmacyHubOperatorFulfillmentController.listStuck,
  );
  router.post(
    '/operator/fulfillment/:orderId/recover',
    ...operatorGuards,
    PharmacyHubOperatorFulfillmentController.recover,
  );

  // ───────────────────────────────────────────────────────────────────────────
  // 매장 실행 자산 — 태블릿 · Screen Set (WO-PHARMACY-HUB-STORE-TABLET-SERVICE-SCOPED-INTEGRATION-V1)
  //
  //   W9(실행 자산)에서 병행 세션 충돌로 HOLD 했던 축이다. 충돌이 해소돼 여기서 마감한다.
  //
  //   **공통 라우터를 그대로 재사용한다** — 태블릿/Screen Set 모델을 새로 만들지 않는다.
  //   `createStoreTabletRoutes` 의 40여 엔드포인트는 전부 같은 seam(`withStoreAuth`)을 통과해
  //   organizationId 하나만 주입받으므로, 조직 해석기만 PH enrollment 기준으로 갈아 끼우면
  //   전 라우트가 서비스 스코프로 동작한다 (로직 복제 0 · 신규 테이블 0 · migration 0).
  //
  //   기본 마운트(`/api/v1/store`)는 무변경이다 — 옵션 미지정 시 기존 해석기를 그대로 쓴다.
  //
  //   주입값:
  //     resolveOrganizationId      PH active enrollment 기준 (클라이언트 organizationId 미신뢰)
  //     qrServiceKey               screen_set QR 공개 URL 을 pharmacyhub.co.kr 로 발급
  //     operatorTemplateServiceKey PH 운영자 Screen Set 원본 축. 아직 원본이 없어 HUB 는
  //                                정상적으로 빈 목록이다 — 다른 서비스 원본을 끌어오지 않는다.
  //
  //   인증은 아래 storeOwnerGuards 가 담당한다(공통 라우터는 주입 경로에서 인증을 하지 않는다).
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * 바코드 상품 등록은 Pharmacy-Hub 에서 열지 않는다.
   * 매장 제품 등록 축은 W7 (`/store-owner/handled-products` · `/store-owner/local-products`)이
   * 이미 SSOT 다 — 태블릿 라우터를 통해 두 번째 write 경로가 생기지 않도록 명시적으로 막는다.
   * (공통 라우터보다 **먼저** 등록해야 가려진다.)
   */
  router.all('/store-owner/products/register-by-barcode', ...storeOwnerGuards, (_req, res) =>
    res.status(404).json({
      success: false,
      error: '매장 제품 등록은 "매장 제품" 메뉴에서 진행해 주세요.',
      code: 'NOT_AVAILABLE_IN_PHARMACY_HUB',
    }),
  );

  router.use(
    '/store-owner',
    ...storeOwnerGuards,
    createStoreTabletRoutes(AppDataSource, {
      resolveOrganizationId: resolvePharmacyHubOrganizationForRoute,
      qrServiceKey: SERVICE_KEY,
      operatorTemplateServiceKey: SERVICE_KEY,
    }),
  );

  return router;
}
