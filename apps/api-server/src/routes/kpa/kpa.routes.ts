import { executeManagedAi } from '../../services/ai-management/runtime-models.js';
import { isHomePresentationMetadata, ORDINARY_CMS_CONTENT_SQL } from '../cms-content/cms-reserved-presentation.js';
/**
 * KPA Routes
 * 약사회 SaaS API 라우트 설정
 *
 * WO-KPA-A-ADMIN-OPERATOR-REALIGNMENT-V1 Phase 2: Route Manifest
 *
 * API Namespace: /api/v1/kpa
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ ROUTE MANIFEST — Admin / Operator / Public 분류                      │
 * ├─────────────────────────────────────────────────────────────────────┤
 * │ ADMIN (kpa:admin scope required)                                    │
 * │  /organizations     - 조직 관리 (CRUD)                                │
 * ├─────────────────────────────────────────────────────────────────────┤
 * │ OPERATOR (kpa:operator scope required)                              │
 * │  /groupbuy-admin    - 공동구매 운영                                    │
 * │  /news (POST/PUT/DELETE) - 콘텐츠 CRUD                               │
 * │  /news/admin/list   - 콘텐츠 전체 목록                                 │
 * │  (소비처 0 mount 제거 — WO-O4O-PHARMACY-BUSINESS-INDEPENDENCE-V1 4-a)   │
 * ├─────────────────────────────────────────────────────────────────────┤
 * │ AUTHENTICATED (requireAuth only)                                    │
 * │  /pharmacy/products - 약국 상품 관리                                    │
 * │  /store-hub         - 스토어 허브                                      │
 * │  /assets            - 자산 스냅샷 (복사/조회)                           │
 * ├─────────────────────────────────────────────────────────────────────┤
 * │ PUBLIC (no auth / optionalAuth)                                     │
 * │  /news (GET)        - 공지사항/뉴스 조회                                │
 * │  /groupbuy (GET)    - 공동구매 조회 (placeholder)                       │
 * │  /health            - 헬스체크                                          │
 * └─────────────────────────────────────────────────────────────────────┘
 */

import { Router, RequestHandler, Request, Response } from 'express';
import { resolveCanonicalServiceKey } from '@o4o/security-core';
import { resolveCmsServiceKeys } from '../cms-content/cms-content-utils.js';
import { DataSource } from 'typeorm';
import { ContentQueryService } from '../../modules/content/index.js';
import { createOrganizationController } from './controllers/organization.controller.js';
// WO-O4O-KPA-APPLICATION-DEAD-FLOW-RETIREMENT-V1: KpaApplication(범용 신청) dead flow 폐기 —
//   회원 승인 canonical 경로(/members)만 유지. application.controller 삭제(소비처 0, 데이터 0).
import { createEventOfferOperatorController } from './controllers/event-offer-operator.controller.js';
// WO-O4O-KPA-CONTENT-BODY-SANITIZE-ON-WRITE-V1: content body 저장 전 backend sanitize (jsdom+DOMPurify).
// 기존 backend-safe sanitizer 재사용 (위치/명명 공통화는 후속 WO-O4O-BACKEND-SAFE-HTML-SANITIZER-COMMONIZATION-V1).
import { sanitizeDescriptionHtml } from '../../modules/neture/utils/sanitize-description-html.util.js';
import { createSupplierOffersController } from './controllers/supplier-offers.controller.js';
import { createJoinInquiryPublicRoutes } from './controllers/join-inquiry.controller.js';
// WO-O4O-KPA-ORGANIZATION-JOIN-DEAD-FLOW-RETIREMENT-V1:
//   조직 가입 요청(organization-join-requests) dead flow 은퇴 — 프로덕션 0건, 실제 create/검수 UI 부재.
//   회원 가입/역할 변경은 canonical 회원·조직 관리(PATCH /kpa/members/:id/status)로 일원화.
//   controller + route mount + reviewUrl 제거. 공유 OrganizationMemberService/emailService 모듈은 유지(call site만 제거).
// WO-O4O-KPA-OPERATOR-PHARMACY-SERVICE-REQUEST-LEGACY-REMOVE-V1:
//   약국 서비스 별도 신청(pharmacy-requests) 폐지 — 매장 운영 권한은 약국 경영자 회원 승인(Path B, member.controller)에서 자동 부여.
//   controller/route mount 제거. 이력 보존을 위해 KpaPharmacyRequest 엔티티/마이그레이션은 유지(별도 cleanup WO).
import { createStoreHubController } from '../o4o-store/controllers/store-hub.controller.js';
import { createPharmacyInfoController } from '../o4o-store/controllers/pharmacy-info.controller.js';
import { createPharmacyProductsController } from '../o4o-store/controllers/pharmacy-products.controller.js';
import { createOperatorProductApplicationsController } from './controllers/operator-product-applications.controller.js';
import { createAssetSnapshotController } from '../o4o-store/controllers/asset-snapshot.controller.js';
import { createStoreAssetControlController } from '../o4o-store/controllers/store-asset-control.controller.js';
// WO-O4O-KPA-CONTACT-FORM-WORKFLOW-V1 — 공개 접수만 유지
import { createContactRequestHandler } from './controllers/contact-request.controller.js';
import { createAdminForceAssetController } from './controllers/admin-force-asset.controller.js';
import { createPublishedAssetsController } from '../o4o-store/controllers/published-assets.controller.js';
import { createStoreContentController } from '../o4o-store/controllers/store-content.controller.js';
import { createStoreLibraryFeedController } from '../o4o-store/controllers/store-library-feed.controller.js';
import { createStoreExecutionAssetsController } from '../o4o-store/controllers/store-execution-assets.controller.js';
import { createStoreQrLandingController } from '../o4o-store/controllers/store-qr-landing.controller.js';
// WO-O4O-STORE-POP-V2-CANONICAL-REBUILD-KPA-PH-V1: 공통 POP V2 Core (KPA/PH 공용)
import { createStorePopV2Controller } from '../o4o-store/controllers/store-pop-v2.controller.js';
import { createStoreAnalyticsController } from '../o4o-store/controllers/store-analytics.controller.js';
import { createProductMarketingController } from '../o4o-store/controllers/product-marketing.controller.js';
import { createMultilingualProductContentController } from '../o4o-store/controllers/multilingual-product-content.controller.js'; // WO-O4O-MULTILINGUAL-PRODUCT-CONTENT-ENTITY-REGISTRY-AND-ROUTE-MOUNT-V1
import { createStorePlaylistController } from '../o4o-store/controllers/store-playlist.controller.js';
import { createStoreChannelProductsController } from '../o4o-store/controllers/store-channel-products.controller.js';
import { createStoreExternalSalesController } from '../o4o-store/controllers/store-external-sales.controller.js'; // WO-O4O-KPA-NAVER-ONLINE-SALES-CONNECTION-AND-PILOT-CLOSEOUT-V1
import { createKpaCheckoutController } from './controllers/kpa-checkout.controller.js'; // WO-O4O-KPA-CUSTOMER-COMMERCE-LOOP-V1
import { createKpaPaymentController } from './controllers/kpa-payment.controller.js'; // WO-O4O-KPA-CUSTOMER-COMMERCE-LOOP-V1
// WO-O4O-SUPPLIER-ORDER-PAYMENT-FULFILLMENT-SETTLEMENT-CANONICALIZATION-V1 §2-E: 매장→공급자 B2B 결제(소비자 commerce 경로와 별개)
import { createB2bPaymentController } from '../../services/payment/b2b/b2b-payment-controller.factory.js';
import { KPA_B2B_SERVICE_KEYS } from '../../services/payment/b2b/store-b2b-payment.constants.js';
import { createBlogController } from '../o4o-store/controllers/blog.controller.js';
// WO-O4O-OPERATOR-BLOG-PUBLISHING-WRITE-API-V1: 운영자 HUB 게시 write API
import { createOperatorBlogController } from '../o4o-store/controllers/operator-blog.controller.js';
import { createOperatorPopController } from '../o4o-store/controllers/operator-pop.controller.js';
import { createOperatorMultilingualContentController } from '../o4o-store/controllers/operator-multilingual-content.controller.js'; // WO-O4O-KPA-MULTILINGUAL-PRODUCT-CONTENT-HUB-FLOW-PILOT-V1
import { createStorePopStaffController } from '../o4o-store/controllers/pop.controller.js';
// WO-O4O-KPA-QR-CODE-VIDEO-CONTENT-V1: QR 전용 동영상 콘텐츠 controllers (POP 패턴 mirror)
import { createOperatorVideoController } from '../o4o-store/controllers/operator-video.controller.js';
import { createStoreVideoStaffController } from '../o4o-store/controllers/video.controller.js';
import { createOperatorQrController } from '../o4o-store/controllers/operator-qr.controller.js';
// WO-O4O-OPERATOR-SCREEN-SET-AUTHORING-FOUNDATION-V1: 운영자 Screen Set 원본 제작 API
import { createOperatorScreenSetController } from '../o4o-store/controllers/operator-screen-set.controller.js';
import { createSupplierScreenSetController } from '../o4o-store/controllers/supplier-screen-set.controller.js';
import { createStoreQrStaffController } from '../o4o-store/controllers/qr.controller.js';
// WO-O4O-ROUTES-REFACTOR-V1: Extracted controllers
import { createSupplierSignageMediaController } from './controllers/supplier-signage-media.controller.js';
import { createEventOfferController } from './controllers/event-offer.controller.js';
import { buildConfigResolver } from '../../utils/ai-config-resolver.js';
import {
  SUMMARIZE_SYSTEM_PROMPT, buildSummarizeUserPrompt,
  EXTRACT_SYSTEM_PROMPT, buildExtractUserPrompt,
  TAG_SYSTEM_PROMPT, buildTagUserPrompt,
} from './prompts/content-prompts.js';
import { CmsContent } from '@o4o-apps/cms-core';
import { KpaAuditLog } from './entities/kpa-audit-log.entity.js';
import { KpaMember } from './entities/kpa-member.entity.js';
import { OrganizationStore } from '../../modules/store-core/entities/organization-store.entity.js';
import { requireAuth as coreRequireAuth, authenticate, optionalAuth } from '../../middleware/auth.middleware.js';
import { asyncHandler } from '../../middleware/error-handler.js';
import { uploadSingleMiddleware } from '../../middleware/upload.middleware.js';
// WO-KPA-A-GUARD-STANDARDIZATION-FINAL-V1: legacy role utils removed
import { KPA_SCOPE_CONFIG } from '@o4o/security-core';
import { mapCmsStatus, mapCmsAuthorRole, mapCmsVisibilityScope, mapKpaContentProducer } from '@o4o/types';
// WO-O4O-COMMUNITY-CONTENT-RESOURCE-KPA-CORE-ADOPTION-CLOSURE-V1
import { createContentResourceCore } from '../common/content-resource/content-resource-core.js';
import { createKpaContentResourceConfig } from './controllers/kpa-content-resource.config.js';
import { createMembershipScopeGuard } from '../../common/middleware/membership-guard.middleware.js';
import { ActionLogService } from '@o4o/action-log-core';
// WO-O4O-LECTURE-INDEPENDENT-SERVICE-SEPARATION-V1 Phase 2:
//   KPA 는 더 이상 LMS runtime 을 소유하지 않는다. `/api/v1/kpa/lms/*` remount · LMS controller import ·
//   course-request → LMS course 생성 경로를 제거했다. 강의는 O4O 강의(lecture) 서비스(study.neture.co.kr) 가 담당한다.
import { createStoreLocalProductRoutes } from '../platform/store-local-product.routes.js';
import { createStoreTabletRoutes } from '../platform/store-tablet.routes.js';

/**
 * KPA Scope Guard — powered by @o4o/security-core
 *
 * Replaces inline implementation with shared security-core guard factory.
 * Behavior is identical: KPA roles only, no platform bypass, legacy detect+deny.
 */
const requireKpaScope = createMembershipScopeGuard(KPA_SCOPE_CONFIG);

/**
 * Create KPA routes
 */
export function createKpaRoutes(dataSource: DataSource): Router {
  const router = Router();
  const kpaActionLogService = new ActionLogService(dataSource);

  // APP-CONTENT Phase 2: shared content query service
  // WO-O4O-KPA-CODE-CLEANUP-V1: unified to 'kpa-society' (backward compat includes legacy 'kpa')
  // WO-O4O-CMS-SERVICEKEY-ALIAS-SSOT-RESIDUAL-CLOSURE-V1: alias 집합은 security-core 파생이다.
  const contentService = new ContentQueryService(dataSource, {
    serviceKeys: resolveCmsServiceKeys('kpa'),
    defaultTypes: ['notice', 'news'],
  });

  // ============================================================================
  // ADMIN ROUTES — requireKpaScope('kpa:admin') enforced in sub-controllers
  // WO-KPA-A-ADMIN-OPERATOR-REALIGNMENT-V1: Structure/Role/Policy → Admin only
  // ============================================================================
  router.use('/organizations', createOrganizationController(dataSource, coreRequireAuth as any, requireKpaScope));
  // WO-O4O-KPA-APPLICATION-DEAD-FLOW-RETIREMENT-V1: '/applications' 마운트 제거(dead flow).
  // WO-O4O-PHARMACY-BUSINESS-INDEPENDENCE-V1 단계 4-a 6항: 소비처 0 mount 제거(옛 KPA 운영자·관리자 화면 은퇴 D7).
  //   /members · /qualifications · /instructor · instructor-qualifications · forum-requests · community/*
  //   /operator(summary · actions · approvals · recruitment-exposure · contact-requests · ai · legal · audit-logs · resources)
  //   /supplier/content-submissions · /supplier/signage(campaign-requests · reports) · store/seller-recruitments
  //   /join-inquiries(admin, 공개 /api/v1/join 유지) · legal/documents · /me-context · /pharmacy/store
  //   /stores(template · layout · settings) · /forum · /credits · /home · /signage · /mypage

  // 공개 Contact Request — 기존 클라이언트 호환 계약(modules/contact-inquiry/public-contact-inquiry.controller.ts) 유지.
  // WO-O4O-KPA-CONTACT-FORM-WORKFLOW-V1
  router.post('/contact-requests', createContactRequestHandler(dataSource));

  // Admin Force Asset routes (WO-KPA-A-ASSET-CONTROL-EXTENSION-V2)
  router.use('/admin/force-assets', createAdminForceAssetController(dataSource, coreRequireAuth as any, requireKpaScope));

  // ============================================================================
  // OPERATOR ROUTES — requireKpaScope('kpa:operator') enforced
  // WO-KPA-A-ADMIN-OPERATOR-REALIGNMENT-V1: Operations/Content → Operator
  // ============================================================================

  // Product Application Management (WO-O4O-PRODUCT-APPROVAL-WORKFLOW-V1)
  router.use('/operator/product-applications', createOperatorProductApplicationsController(dataSource, coreRequireAuth as any, requireKpaScope, kpaActionLogService));

  // Groupbuy Operator routes (WO-KPA-GROUPBUY-OPERATOR-UI-V1)
  router.use('/groupbuy-admin', createEventOfferOperatorController(dataSource, coreRequireAuth as any));

  // Supplier Event Offer proposal routes (WO-EVENT-OFFER-SUPPLIER-PROPOSAL-PATH-V1)
  router.use('/supplier', createSupplierOffersController(dataSource, coreRequireAuth as any));

  // Supplier Signage Media Authoring (WO-O4O-NETURE-SUPPLIER-DIGITAL-SIGNAGE-AUTHORING-HUB-IMPORT-V1)
  // 공급자 직접 제작·게시(source='supplier', serviceKey='kpa-society') — 기존 HUB/asset-snapshot 조회·복사 경로 재사용
  router.use('/supplier/signage/media', createSupplierSignageMediaController(dataSource, coreRequireAuth as any));

  // WO-O4O-KPA-OPERATOR-PHARMACY-SERVICE-REQUEST-LEGACY-REMOVE-V1:
  //   '/pharmacy-requests' 라우트 폐지 (신청/승인/반려/알림 전량 제거).
  //   매장 운영 권한은 약국 경영자 회원 승인(Path B)에서 자동 부여된다.

  // ============================================================================
  // AUTHENTICATED USER ROUTES — requireAuth only (no admin/operator scope)
  // ============================================================================

  // Store Hub routes (WO-STORE-HUB-UNIFIED-RENDERING-PHASE1-V1)
  // WO-O4O-STORE-GUARD-PHASE2C-CONFIG-AND-HUB-V1: serviceKey='kpa' 전달.
  router.use('/store-hub', createStoreHubController(dataSource, coreRequireAuth as any, 'kpa'));

  // Channel Product Management (WO-CHANNEL-EXECUTION-CONSOLE-V1)
  // WO-O4O-STORE-GUARD-PHASE2A-CHANNEL-AND-QR-V1: serviceKey='kpa' 전달.
  router.use('/store-hub/channel-products', createStoreChannelProductsController(dataSource, coreRequireAuth as any, 'kpa'));

  // External Sales — 외부 판매 채널(네이버·쿠팡) 연동 상태 · 판매 조건 입력
  // WO-O4O-KPA-NAVER-ONLINE-SALES-CONNECTION-AND-PILOT-CLOSEOUT-V1
  //   KPA 한정 mount. K-Cosmetics 는 자체 storefront 정비 상태가 달라 이번 범위 밖.
  router.use('/store-hub/external-sales', createStoreExternalSalesController(dataSource, coreRequireAuth as any, 'kpa'));

  // Pharmacy Info routes (WO-KPA-PHARMACY-INFO-EDIT-FLOW-V1)
  // WO-O4O-STORE-OWNER-BACKCOMPAT-CALLERS-MIGRATION-V1: serviceKey='kpa' 명시 (canonical)
  router.use('/pharmacy', createPharmacyInfoController(dataSource, coreRequireAuth as any, 'kpa'));

  // Pharmacy Products routes (WO-PHARMACY-PRODUCT-LISTING-APPROVAL-PHASE1-V1)
  // serviceKey='kpa' 전달 → kpa:store_owner 만 통과.
  router.use('/pharmacy/products', createPharmacyProductsController(dataSource, coreRequireAuth as any, 'kpa'));

  // Store Local Products — 매장 자체 상품 (WO-O4O-STORE-LOCAL-PRODUCTS-SERVICE-SCOPED-ORGANIZATION-RESOLUTION-V1)
  //   서비스 중립 mount(`/api/v1/store/local-products`)는 다중 조직 사용자에게 타 서비스 조직을
  //   고를 수 있다. 같은 My Store 문맥의 handled-products 와 **같은 조직**을 해석하도록
  //   serviceKey='kpa' 를 명시한 canonical mount 를 제공한다.
  router.use('/store', createStoreLocalProductRoutes(dataSource, 'kpa'));

  // Store Tablet / Screen Set — 내 매장 태블릿·화면구성
  //   (WO-O4O-KPA-MY-STORE-RUNTIME-CONTRACT-QUALITY-CLOSURE-V1 축 B)
  //   서비스 중립 mount(`/api/v1/store/tablets`, `/screen-sets`, `/product-pool`)는
  //   store_owner 판정에 serviceKey 를 주지 않아 다중 서비스 사용자에게 타 서비스 조직이
  //   선택될 수 있었다. 같은 My Store 문맥의 local-products 와 **같은 조직**을 해석하도록
  //   serviceKey='kpa' 를 명시한 canonical mount 를 제공한다.
  //   서비스 중립 mount 는 그대로 두어 K-Cosmetics 동작은 불변이다.
  router.use('/store', createStoreTabletRoutes(dataSource, { storeOwnerServiceKey: 'kpa' }));

  // Asset Snapshot routes (WO-KPA-A-ASSET-COPY-ENGINE-PILOT-V1)
  router.use('/assets', createAssetSnapshotController(dataSource, coreRequireAuth as any));

  // Store Asset Control routes (WO-KPA-A-ASSET-CONTROL-EXTENSION-V1)
  router.use('/store-assets', createStoreAssetControlController(dataSource, coreRequireAuth as any));

  // Store Content routes (WO-KPA-A-CONTENT-OVERRIDE-EXTENSION-V1)
  router.use('/store-contents', createStoreContentController(dataSource, coreRequireAuth as any));

  // Store Library 통합 feed (WO-O4O-STORE-LIBRARY-DIRECT-CONTENT-UNIFIED-V1)
  // snapshot(cms+content) + direct contents UNION paginated feed
  router.use('/store-library', createStoreLibraryFeedController(dataSource, coreRequireAuth as any));

  // Store Playlist routes (WO-O4O-SIGNAGE-STORE-PLAYLIST-ENGINE-V1)
  router.use('/store-playlists', createStorePlaylistController(dataSource, coreRequireAuth as any, 'kpa-society', 'kpa'));

  // O4O-STORE: root-mounted controllers (internal prefix /pharmacy/*)
  // 컨트롤러 내부에 full path 정의됨. prefix 분리는 별도 WO에서 수행.
  // WO-KPA-B-STORE-CONTAMINATION-CLEANUP-V1 Phase 2: 문서화 완료

  // Store Execution Assets routes (WO-KPA-STORE-ASSET-STRUCTURE-REFACTOR-V1) — internal: /store/assets/*
  // WO-O4O-STORE-OWNER-BACKCOMPAT-CALLERS-MIGRATION-V1: serviceKey='kpa' 명시 (canonical)
  router.use('/', createStoreExecutionAssetsController(dataSource, coreRequireAuth as any, 'kpa'));

  // Store QR Landing routes (WO-O4O-QR-LANDING-PAGE-V1) — internal: /qr/public/*, /pharmacy/qr/*
  // WO-O4O-STORE-GUARD-PHASE2A-CHANNEL-AND-QR-V1: serviceKey='kpa' 전달 (public route /qr/public/:slug 는 무관).
  router.use('/', createStoreQrLandingController(dataSource, coreRequireAuth as any, 'kpa'));

  // WO-O4O-STORE-POP-V2-CANONICAL-REBUILD-KPA-PH-V1
  //   POP V2 (canonical Document 모델) — internal: /pharmacy/pop-v2/*
  //   PH 와 **같은 공통 Core factory** 를 mount 한다 (서비스별 본체 복제 없음).
  //   legacy 즉시 PDF(createStorePopController · POST /pharmacy/pop/generate) 는 WO-O4O-STORE-POP-LEGACY-INSTANT-PDF-RETIREMENT-FINAL-CLOSURE-V1 에서 제거 —
  //   과거 산출물(store_execution_assets usage_type='pop') row 는 보존.
  router.use('/pharmacy/pop-v2', createStorePopV2Controller(dataSource, coreRequireAuth as any, 'kpa'));

  // Store Analytics routes (WO-O4O-MARKETING-ANALYTICS-V1) — internal: /pharmacy/analytics/*
  // WO-O4O-STORE-OWNER-BACKCOMPAT-CALLERS-MIGRATION-V1: serviceKey='kpa' 명시 (canonical)
  router.use('/', createStoreAnalyticsController(dataSource, coreRequireAuth as any, 'kpa'));

  // Product Marketing Graph (WO-O4O-PRODUCT-MARKETING-GRAPH-V1) — internal: /pharmacy/products/*/marketing
  // WO-O4O-STORE-GUARD-PHASE2B-LIBRARY-MARKETING-POP-V1: serviceKey='kpa' 전달.
  router.use('/', createProductMarketingController(dataSource, coreRequireAuth as any, 'kpa'));

  // Multilingual Product Content (WO-O4O-MULTILINGUAL-PRODUCT-CONTENT-ENTITY-REGISTRY-AND-ROUTE-MOUNT-V1)
  // store-owner: /pharmacy/multilingual-product-contents/*
  router.use('/', createMultilingualProductContentController(dataSource, coreRequireAuth as any, 'kpa'));

  // ============================================================================
  // Store Channel Routes — WO-KPA-STORE-CHANNEL-INTEGRATION-V1
  // organizations 테이블 단일 참조 (Phase C 전환 완료)
  // Blog/Template 채널을 KPA 네임스페이스에서 제공
  // /api/v1/kpa/stores/:slug/blog|template
  // WO-O4O-STORE-TABLET-LEGACY-CLEANUP-V1: Removed legacy tablet controller
  // Tablet product/interest APIs use unified store-public routes (/api/v1/stores/:slug/tablet/*)
  // ============================================================================
  const kpaBlogController = createBlogController(dataSource, coreRequireAuth as any, 'kpa');
  router.use('/stores', kpaBlogController);

  // WO-O4O-KPA-STORE-HUB-POP-CONTENT-IMPORT-V1: 매장 POP staff CRUD + HUB import
  // /api/v1/kpa/stores/:slug/pop/staff/* (매장 owner가 자기 매장 store_pops 사본 관리)
  // (legacy createStorePopController 는 WO-O4O-STORE-POP-LEGACY-INSTANT-PDF-RETIREMENT-FINAL-CLOSURE-V1 에서 제거됨.)
  const kpaStorePopStaffController = createStorePopStaffController(
    dataSource,
    coreRequireAuth as any,
    'kpa',
  );
  router.use('/stores', kpaStorePopStaffController);

  // WO-O4O-KPA-QR-CODE-VIDEO-CONTENT-V1: 매장 동영상 staff (가져오기 import + 사본 관리)
  // /api/v1/kpa/stores/:slug/video/staff/* (매장 owner가 자기 매장 store_videos 사본 관리)
  const kpaStoreVideoStaffController = createStoreVideoStaffController(
    dataSource,
    coreRequireAuth as any,
    'kpa',
  );
  router.use('/stores', kpaStoreVideoStaffController);

  // WO-O4O-OPERATOR-BLOG-PUBLISHING-WRITE-API-V1: 운영자 HUB 게시 write API
  // /api/v1/kpa/operator/blog/posts (운영자가 매장 HUB 에 게시하는 블로그)
  // 권한: kpa:operator / kpa:admin / platform:super_admin
  const kpaOperatorBlogController = createOperatorBlogController(
    dataSource,
    coreRequireAuth as any,
    'kpa',
  );
  router.use('/operator/blog', kpaOperatorBlogController);

  // WO-O4O-KPA-POP-PUBLISHING-PHASE2-BACKEND-V1: 운영자 HUB POP write API
  // /api/v1/kpa/operator/pop/posts (운영자가 매장 HUB 에 게시하는 POP)
  // 권한: kpa:operator / kpa:admin / platform:super_admin
  const kpaOperatorPopController = createOperatorPopController(
    dataSource,
    coreRequireAuth as any,
    'kpa',
  );
  router.use('/operator/pop', kpaOperatorPopController);

  // WO-O4O-KPA-QR-CODE-VIDEO-CONTENT-V1: 운영자 HUB 동영상 write API (QR 전용)
  // /api/v1/kpa/operator/video/posts (운영자가 매장 HUB 에 게시하는 외부 동영상 URL)
  // 권한: kpa:operator / kpa:admin / platform:super_admin
  const kpaOperatorVideoController = createOperatorVideoController(
    dataSource,
    coreRequireAuth as any,
    'kpa',
  );
  router.use('/operator/video', kpaOperatorVideoController);

  // WO-O4O-KPA-MULTILINGUAL-PRODUCT-CONTENT-HUB-FLOW-PILOT-V1: 운영자 HUB 다국어 상품 콘텐츠 write API
  // /api/v1/kpa/operator/multilingual-product-contents/groups (운영자 원본 — 매장이 가져가면 사본 생성)
  // 권한: kpa:operator / kpa:admin / platform:super_admin
  router.use(
    '/operator/multilingual-product-contents',
    createOperatorMultilingualContentController(dataSource, coreRequireAuth as any, 'kpa'),
  );

  // WO-O4O-KPA-OPERATOR-QR-PUBLISHING-PHASE2-BACKEND-V1: 운영자 HUB QR template write API
  // /api/v1/kpa/operator/qr/templates (운영자가 매장 HUB 에 게시하는 QR 청사진 — 실제 QR 아님)
  // 권한: kpa:operator / kpa:admin / platform:super_admin
  // 매장 가져가기 시 기존 store_qr_codes 에 매장 사본 INSERT (Phase 3-B 후속).
  const kpaOperatorQrController = createOperatorQrController(
    dataSource,
    coreRequireAuth as any,
    'kpa',
  );
  router.use('/operator/qr', kpaOperatorQrController);

  // WO-O4O-OPERATOR-SCREEN-SET-AUTHORING-FOUNDATION-V1: 운영자 Screen Set 원본 제작 API
  // /api/v1/kpa/operator/screen-sets (운영자가 매장 배포용 화면 세트 원본을 제작 — operator_template)
  // 권한: kpa:operator / kpa:admin / platform:super_admin
  // 매장 API(/store/screen-sets)와 별도 라우터. origin='operator' AND service_key='kpa' 격리.
  // 차단: 매장·코너 적용 / current 지정 / 공개 타블렛 URL / Screen Set QR / 매장 콘텐츠 조회.
  const kpaOperatorScreenSetController = createOperatorScreenSetController(
    dataSource,
    coreRequireAuth as any,
    'kpa',
  );
  router.use('/operator/screen-sets', kpaOperatorScreenSetController);

  // WO-O4O-SUPPLIER-SCREEN-SET-BACKEND-HUB-COPY-V2B: 공급자 Screen Set 원본 제작·HUB 게시 API
  // /api/v1/kpa/supplier/screen-sets (공급자가 매장 배포용 화면 세트 원본을 제작 — origin='supplier')
  // 권한: 로그인 사용자가 ACTIVE neture_suppliers 구성원(canonical: organization_members owner). 자기 원본만 접근.
  // 매장/운영자 API 와 별도 라우터. origin='supplier' AND supplier_id AND service_key='kpa' 격리.
  // 차단: 매장·코너 적용 / current 지정 / 공개 타블렛 URL / Screen Set QR / 매장 콘텐츠 조회.
  const kpaSupplierScreenSetController = createSupplierScreenSetController(
    dataSource,
    coreRequireAuth as any,
    'kpa',
  );
  router.use('/supplier/screen-sets', kpaSupplierScreenSetController);

  // WO-O4O-KPA-STORE-HUB-QR-CONTENT-IMPORT-V1: 운영자 QR 템플릿 → 매장 사본 변환 INSERT
  // /api/v1/kpa/stores/:slug/qr/staff/import (매장 owner 가 자기 매장 store_qr_codes 사본 생성)
  // 기존 store-qr-landing controller (/pharmacy/qr/*) 와는 별도 — 변환 전용.
  const kpaStoreQrStaffController = createStoreQrStaffController(
    dataSource,
    coreRequireAuth as any,
    'kpa',
  );
  router.use('/stores', kpaStoreQrStaffController);

  // ============================================================================
  // Membership Query — /api/v1/kpa/me/membership
  // WO-KPA-BRANCH-SCOPE-VALIDATION-V1: User's KPA membership info for branch scope validation
  // @deprecated WO-KPA-B-SERVICE-CONTEXT-UNIFICATION-V1: /auth/me의 kpaMembership 필드로 대체됨
  //   프론트 호출 제거 완료. API는 외부 호환성을 위해 유지.
  // ============================================================================
  router.get('/me/membership', authenticate, asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
      return;
    }

    const memberRepo = dataSource.getRepository(KpaMember);
    const member = await memberRepo.findOne({ where: { user_id: userId } });

    if (!member) {
      res.json({ success: true, data: null });
      return;
    }

    const orgRepo = dataSource.getRepository(OrganizationStore);
    const org = await orgRepo.findOne({ where: { id: member.organization_id } });

    res.json({
      success: true,
      data: {
        userId,
        organizationId: member.organization_id,
        organizationType: org?.type || null,
        organizationName: org?.name || null,
        parentId: org?.parentId || null,
        role: member.role,
        status: member.status,
      },
    });
  }));

  // ============================================================================
  // PUBLIC / MIXED ROUTES — optionalAuth or mixed auth levels
  // ============================================================================

  // Published Assets routes — public storefront/signage/promotion rendering
  // WO-KPA-A-ASSET-RENDER-FILTER-INTEGRATION-V1
  router.use('/published-assets', createPublishedAssetsController(dataSource));

  // ============================================================================
  // News Routes - /api/v1/kpa/news/*
  // WO-KPA-HOME-PHASE1-V1: Connected to cms_contents (was placeholder)
  // Phase 3A: 추천/조회수/페이지네이션 추가
  // ============================================================================
  const newsRouter = Router();

  // APP-CONTENT Phase 3A: ContentQueryService + 추천 enrichment
  newsRouter.get('/', optionalAuth, asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    const result = await contentService.listPublishedWithRecommendations({
      type: req.query.type as string,
      sort: (req.query.sort as string) as any || 'latest',
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 12,
      userId,
    });
    res.json({ success: true, ...result });
  }));

  // Static routes must be defined before dynamic :id route
  newsRouter.get('/gallery', optionalAuth, (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 12;
    res.json({
      success: true,
      data: [],
      pagination: { page, limit, total: 0, totalPages: 0 },
      message: 'Gallery API - Integration pending'
    });
  });

  // APP-CONTENT Phase 3A: 상세 조회 + 추천 정보
  newsRouter.get('/:id', optionalAuth, asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    const content = await contentService.getByIdWithRecommendations(req.params.id, userId);
    if (!content) {
      res.status(404).json({ success: false, error: { message: 'News not found' } });
      return;
    }
    res.json({ success: true, data: content });
  }));

  // Phase 3A: 추천 토글 (POST = 추천/취소 토글)
  newsRouter.post('/:id/recommend', authenticate, asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
      return;
    }
    const result = await contentService.toggleRecommendation(req.params.id, userId);
    res.json({ success: true, data: result });
  }));

  // Phase 3A: 조회수 증가 (public)
  newsRouter.post('/:id/view', asyncHandler(async (req: Request, res: Response) => {
    await contentService.incrementViewCount(req.params.id);
    res.json({ success: true });
  }));

  // ─── WO-KPA-A-CONTENT-CMS-PHASE1-V1: Operator CRUD ──────────────────
  const contentRepo = dataSource.getRepository(CmsContent);
  const auditRepo = dataSource.getRepository(KpaAuditLog);
  // WO-O4O-KPA-CODE-CLEANUP-V1: unified to 'kpa-society'
  // WO-O4O-CMS-SERVICEKEY-ALIAS-SSOT-RESIDUAL-CLOSURE-V1:
  //   두 값을 손으로 적지 않는다. 여기서 다루는 건 `cms_contents` 원장 축이므로
  //   CMS read/mutation 이 쓰는 것과 **같은** security-core 파생(`resolveCmsServiceKeys`)을
  //   재사용한다. 로컬 `['kpa-society','kpa']` 배열은 SSOT 를 두 벌로 만든다.
  //   (기존 주석은 "for reads" 였지만 실제로는 아래 PUT/DELETE/batch mutation 도
  //    같은 집합으로 대상 row 를 찾는다 — legacy row 수정 호환이 이 집합에 달려 있다.)
  const KPA_SERVICE_KEY = resolveCanonicalServiceKey('kpa');
  const KPA_SERVICE_KEYS = resolveCmsServiceKeys('kpa');
  const ALLOWED_TYPES = ['notice', 'news', 'event'];

  // WO-KPA-A-OPERATOR-AUDIT-LOG-PHASE1-V1: helper
  async function writeAuditLog(
    user: any,
    actionType: string,
    targetType: string,
    targetId: string,
    metadata: Record<string, unknown> = {},
  ) {
    try {
      const log = auditRepo.create({
        operator_id: user?.id,
        operator_role: (user?.roles || []).find((r: string) => r.startsWith('kpa:')) || 'unknown',
        action_type: actionType,
        target_type: targetType,
        target_id: targetId,
        metadata,
      });
      await auditRepo.save(log);
    } catch (e) {
      console.error('[KPA AuditLog] Failed to write:', e);
    }
  }

  // GET /news/admin/list — operator용 전체 목록 (draft/published/archived 포함)
  newsRouter.get('/admin/list', authenticate, requireKpaScope('kpa:operator'), asyncHandler(async (req: Request, res: Response) => {
    const type = req.query.type as string;
    const status = req.query.status as string;
    const search = req.query.search as string | undefined;
    const picked = req.query.picked as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    const qb = contentRepo.createQueryBuilder('c')
      .where('c.serviceKey IN (:...sks)', { sks: KPA_SERVICE_KEYS })
      .andWhere(`c.${ORDINARY_CMS_CONTENT_SQL}`);

    if (type && ALLOWED_TYPES.includes(type)) {
      qb.andWhere('c.type = :type', { type });
    } else {
      qb.andWhere('c.type IN (:...types)', { types: ALLOWED_TYPES });
    }
    if (status && ['draft', 'published', 'archived'].includes(status)) {
      qb.andWhere('c.status = :status', { status });
    }
    if (search && search.trim()) {
      qb.andWhere('c.title ILIKE :search', { search: `%${search.trim()}%` });
    }
    if (picked === 'true') {
      qb.andWhere('c.isOperatorPicked = true');
    }

    qb.orderBy('c.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    // ContentMeta (WO-CONTENT-META-API-ENRICHMENT-V1)
    const enrichedData = data.map((item: any) => ({
      ...item,
      producer: mapCmsAuthorRole((item.authorRole as any) ?? 'service_admin'),
      producerRef: item.createdBy ?? '',
      visibility: mapCmsVisibilityScope((item.visibilityScope as any) ?? 'service'),
      serviceKey: 'kpa-society' as const,
      contentType: 'cms_block' as const,
      metaStatus: mapCmsStatus(item.status ?? 'draft'),
    }));
    res.json({ success: true, data: enrichedData, total, page, limit, totalPages: Math.ceil(total / limit) });
  }));

  // POST /news — 새 콘텐츠 생성
  newsRouter.post('/', authenticate, requireKpaScope('kpa:operator'), asyncHandler(async (req: Request, res: Response) => {
    const { title, content, type, status: reqStatus, summary, isOperatorPicked, isPinned, expiresAt } = req.body;
    if (!title || !type) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'title and type are required' } });
      return;
    }
    if (!ALLOWED_TYPES.includes(type)) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: `type must be one of: ${ALLOWED_TYPES.join(', ')}` } });
      return;
    }
    const validStatus = reqStatus === 'published' ? 'published' : 'draft';
    const userId = (req as any).user?.id;

    const entity = contentRepo.create({
      serviceKey: KPA_SERVICE_KEY,
      type,
      title,
      summary: summary || null,
      body: content || null,
      status: validStatus,
      publishedAt: validStatus === 'published' ? new Date() : null,
      createdBy: userId,
      isOperatorPicked: isOperatorPicked === true,
      isPinned: isPinned === true,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    });

    const saved = await contentRepo.save(entity);
    await writeAuditLog((req as any).user, 'CONTENT_CREATED', 'content', saved.id, { type, title, status: validStatus });
    res.status(201).json({ success: true, data: saved });
  }));

  // PUT /news/:id — 콘텐츠 수정
  newsRouter.put('/:id', authenticate, requireKpaScope('kpa:operator'), asyncHandler(async (req: Request, res: Response) => {
    const existing = await contentRepo.createQueryBuilder('c')
      .where('c.id = :id', { id: req.params.id })
      .andWhere('c.serviceKey IN (:...sks)', { sks: KPA_SERVICE_KEYS })
      .andWhere(`c.${ORDINARY_CMS_CONTENT_SQL}`)
      .getOne();
    if (!existing || isHomePresentationMetadata(existing.metadata)) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Content not found' } });
      return;
    }

    const { title, content, type, status: reqStatus, summary, isOperatorPicked } = req.body;
    if (title !== undefined) existing.title = title;
    if (summary !== undefined) existing.summary = summary;
    if (content !== undefined) existing.body = content;
    if (type !== undefined && ALLOWED_TYPES.includes(type)) existing.type = type;
    if (isOperatorPicked !== undefined) existing.isOperatorPicked = isOperatorPicked === true;
    if (req.body.isPinned !== undefined) existing.isPinned = req.body.isPinned === true;
    if (req.body.expiresAt !== undefined) {
      existing.expiresAt = req.body.expiresAt ? new Date(req.body.expiresAt) : null;
    }
    if (reqStatus !== undefined && ['draft', 'published', 'archived'].includes(reqStatus)) {
      if (reqStatus === 'published' && existing.status !== 'published') {
        existing.publishedAt = new Date();
      }
      existing.status = reqStatus;
    }

    const updated = await contentRepo.save(existing);
    await writeAuditLog((req as any).user, 'CONTENT_UPDATED', 'content', updated.id, { title: updated.title, status: updated.status });
    res.json({ success: true, data: updated });
  }));

  // DELETE /news/:id/hard — Hard delete (physical removal, archived items only, operator only)
  newsRouter.delete('/:id/hard', authenticate, requireKpaScope('kpa:operator'), asyncHandler(async (req: Request, res: Response) => {
    const existing = await contentRepo.createQueryBuilder('c')
      .where('c.id = :id', { id: req.params.id })
      .andWhere('c.serviceKey IN (:...sks)', { sks: KPA_SERVICE_KEYS })
      .andWhere(`c.${ORDINARY_CMS_CONTENT_SQL}`)
      .getOne();
    if (!existing || isHomePresentationMetadata(existing.metadata)) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Content not found' } });
      return;
    }
    if (existing.status !== 'archived') {
      res.status(400).json({ success: false, error: { code: 'NOT_ARCHIVED', message: '보관 상태의 콘텐츠만 완전 삭제할 수 있습니다.' } });
      return;
    }
    const title = existing.title;
    await contentRepo.delete({ id: existing.id });
    await writeAuditLog((req as any).user, 'CONTENT_HARD_DELETED', 'content', existing.id, { title });
    res.json({ success: true, data: { deleted: true, id: existing.id } });
  }));

  // DELETE /news/:id — Soft delete (status → archived)
  newsRouter.delete('/:id', authenticate, requireKpaScope('kpa:operator'), asyncHandler(async (req: Request, res: Response) => {
    const existing = await contentRepo.createQueryBuilder('c')
      .where('c.id = :id', { id: req.params.id })
      .andWhere('c.serviceKey IN (:...sks)', { sks: KPA_SERVICE_KEYS })
      .andWhere(`c.${ORDINARY_CMS_CONTENT_SQL}`)
      .getOne();
    if (!existing || isHomePresentationMetadata(existing.metadata)) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Content not found' } });
      return;
    }

    existing.status = 'archived';
    const updated = await contentRepo.save(existing);
    await writeAuditLog((req as any).user, 'CONTENT_DELETED', 'content', updated.id, { title: updated.title });
    res.json({ success: true, data: updated });
  }));

  // ─── V3 Batch Endpoints — WO-O4O-TABLE-STANDARD-V3-EXPANSION ───

  /** POST /news/batch-publish — 일괄 발행 (draft → published) */
  newsRouter.post('/batch-publish', authenticate, requireKpaScope('kpa:operator'), asyncHandler(async (req: Request, res: Response) => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ success: false, error: 'ids array is required' });
      return;
    }
    if (ids.length > 50) {
      res.status(400).json({ success: false, error: 'Maximum 50 items per batch' });
      return;
    }

    const results: Array<{ id: string; status: 'success' | 'skipped' | 'failed'; error?: string }> = [];
    for (const id of ids) {
      try {
        const item = await contentRepo.createQueryBuilder('c')
          .where('c.id = :id', { id })
          .andWhere('c.serviceKey IN (:...sks)', { sks: KPA_SERVICE_KEYS })
          .andWhere(`c.${ORDINARY_CMS_CONTENT_SQL}`)
          .getOne();
        if (!item || isHomePresentationMetadata(item.metadata)) { results.push({ id, status: 'failed', error: 'Not found' }); continue; }
        if (item.status !== 'draft') { results.push({ id, status: 'skipped', error: 'Not in draft status' }); continue; }
        item.status = 'published';
        item.publishedAt = new Date();
        await contentRepo.save(item);
        await writeAuditLog((req as any).user, 'CONTENT_BATCH_PUBLISHED', 'content', id, { title: item.title });
        results.push({ id, status: 'success' });
      } catch (err: any) {
        results.push({ id, status: 'failed', error: err.message || 'Unknown error' });
      }
    }
    res.json({ success: true, data: { results } });
  }));

  /** POST /news/batch-archive — 일괄 보관 (any → archived) */
  newsRouter.post('/batch-archive', authenticate, requireKpaScope('kpa:operator'), asyncHandler(async (req: Request, res: Response) => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ success: false, error: 'ids array is required' });
      return;
    }
    if (ids.length > 50) {
      res.status(400).json({ success: false, error: 'Maximum 50 items per batch' });
      return;
    }

    const results: Array<{ id: string; status: 'success' | 'skipped' | 'failed'; error?: string }> = [];
    for (const id of ids) {
      try {
        const item = await contentRepo.createQueryBuilder('c')
          .where('c.id = :id', { id })
          .andWhere('c.serviceKey IN (:...sks)', { sks: KPA_SERVICE_KEYS })
          .andWhere(`c.${ORDINARY_CMS_CONTENT_SQL}`)
          .getOne();
        if (!item || isHomePresentationMetadata(item.metadata)) { results.push({ id, status: 'failed', error: 'Not found' }); continue; }
        if (item.status === 'archived') { results.push({ id, status: 'skipped', error: 'Already archived' }); continue; }
        item.status = 'archived';
        await contentRepo.save(item);
        await writeAuditLog((req as any).user, 'CONTENT_BATCH_ARCHIVED', 'content', id, { title: item.title });
        results.push({ id, status: 'success' });
      } catch (err: any) {
        results.push({ id, status: 'failed', error: err.message || 'Unknown error' });
      }
    }
    res.json({ success: true, data: { results } });
  }));

  /** POST /news/batch-hard-delete — 일괄 완전 삭제 (archived only) */
  newsRouter.post('/batch-hard-delete', authenticate, requireKpaScope('kpa:operator'), asyncHandler(async (req: Request, res: Response) => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ success: false, error: 'ids array is required' });
      return;
    }
    if (ids.length > 50) {
      res.status(400).json({ success: false, error: 'Maximum 50 items per batch' });
      return;
    }

    const results: Array<{ id: string; status: 'success' | 'skipped' | 'failed'; error?: string }> = [];
    for (const id of ids) {
      try {
        const item = await contentRepo.createQueryBuilder('c')
          .where('c.id = :id', { id })
          .andWhere('c.serviceKey IN (:...sks)', { sks: KPA_SERVICE_KEYS })
          .andWhere(`c.${ORDINARY_CMS_CONTENT_SQL}`)
          .getOne();
        if (!item || isHomePresentationMetadata(item.metadata)) { results.push({ id, status: 'failed', error: 'Not found' }); continue; }
        if (item.status !== 'archived') { results.push({ id, status: 'skipped', error: 'Only archived items can be hard deleted' }); continue; }
        const title = item.title;
        await contentRepo.delete({ id });
        await writeAuditLog((req as any).user, 'CONTENT_BATCH_HARD_DELETED', 'content', id, { title });
        results.push({ id, status: 'success' });
      } catch (err: any) {
        results.push({ id, status: 'failed', error: err.message || 'Unknown error' });
      }
    }
    res.json({ success: true, data: { results } });
  }));

  router.use('/news', newsRouter);

  // ============================================================================
  // HUB Notices - /api/v1/kpa/notices
  // WO-O4O-HUB-NOTICE-SYSTEM-V1
  //
  // 매장 HUB 상단 공지 조회 전용 엔드포인트.
  // published + 기간 내 + 최대 3개, isPinned DESC → createdAt DESC 정렬.
  // 기존 /news 엔드포인트에 영향 없음.
  // ============================================================================
  router.get('/notices', optionalAuth, asyncHandler(async (req: Request, res: Response) => {
    const now = new Date();
    const rows = await contentRepo.createQueryBuilder('c')
      .where('c.serviceKey IN (:...sks)', { sks: KPA_SERVICE_KEYS })
      .andWhere(`c.${ORDINARY_CMS_CONTENT_SQL}`)
      .andWhere('c.type = :type', { type: 'notice' })
      .andWhere('c.status = :status', { status: 'published' })
      .andWhere('(c.publishedAt IS NULL OR c.publishedAt <= :now)', { now })
      .andWhere('(c.expiresAt IS NULL OR c.expiresAt > :now)', { now })
      .orderBy('c.isPinned', 'DESC')
      .addOrderBy('c.createdAt', 'DESC')
      .take(3)
      .getMany();

    res.json({
      success: true,
      data: rows.map((c: any) => ({
        id: c.id,
        title: c.title,
        summary: c.summary,
        isPinned: c.isPinned,
        publishedAt: c.publishedAt,
        expiresAt: c.expiresAt,
      })),
    });
  }));

  // ============================================================================
  // WO-O4O-COMMUNITY-CONTENT-RESOURCE-KPA-CORE-ADOPTION-CLOSURE-V1
  //   콘텐츠/자료실 공통 Core. 물리 테이블(kpa_contents)은 그대로 두고 handler 로직만 공유한다.
  //   detail / create / update / recommend / AI 3종은 KPA 고유라 라우터에 그대로 남는다.
  // ============================================================================
  const kpaContentCore = createContentResourceCore(
    dataSource,
    createKpaContentResourceConfig({ mapCmsStatus, audit: writeAuditLog }),
  );

  // ============================================================================
  // CONTENT HUB ROUTES — WO-O4O-KPA-CONTENT-HUB-FOUNDATION-V1
  // WO-KPA-CONTENT-HUB-FOUNDATION-V1: 커뮤니티 콘텐츠 허브 확장
  // ============================================================================
  {
    const contentRouter = Router();

    // Helper: check if user has kpa:operator or higher scope
    const isKpaOperatorOrAdmin = (user: any): boolean => {
      if (!user?.roles) return false;
      return user.roles.some((r: string) =>
        r === 'kpa:operator' || r === 'kpa:admin' || r === 'platform:super_admin'
      );
    };

    // GET /contents — 목록 (optionalAuth: 공개 접근)
    // WO-KPA-CONTENT-HUB-FOUNDATION-V1: content_type, sub_type, sort 필터 추가
    // WO-O4O-COMMUNITY-CONTENT-RESOURCE-KPA-CORE-ADOPTION-CLOSURE-V1: 공통 Core 채택
    contentRouter.get('/', optionalAuth as any, asyncHandler(kpaContentCore.list));

    // POST /contents — 등록 (인증된 사용자)
    // WO-KPA-CONTENT-HUB-FOUNDATION-V1: 일반 사용자도 콘텐츠 생성 가능
    contentRouter.post('/', authenticate, asyncHandler(async (req: Request, res: Response) => {
      const user = (req as any).user;
      const userId = user?.id;
      const { title, summary, blocks, tags, category, thumbnail_url, source_type, source_url, source_file_name, status: reqStatus, body, content_type, sub_type, usage_type: reqUsageType, reusable_policy: reqReusablePolicy } = req.body;

      if (!title?.trim()) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'title은 필수입니다' } });
        return;
      }

      // O4O Tag Policy V1 — sanitize + 최소 1개 필수
      const sanitizeContentTags = (t: unknown): string[] => {
        if (!Array.isArray(t)) return [];
        return [...new Set<string>(
          t.map((v: any) => String(v).trim().replace(/^#/, ''))
            .filter(Boolean).filter((v: string) => v.length <= 30)
        )];
      };
      const sanitizedTags = sanitizeContentTags(tags);
      if (sanitizedTags.length === 0) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: '태그를 1개 이상 입력해주세요' } });
        return;
      }

      // WO-O4O-KPA-CONTENT-STATUS-SEMANTICS-AUDIT-V1: 'ready' 추가.
      //   content-meta SSOT 상 kpa_contents.status = draft|ready('발행 가능/검토 완료').
      //   기존엔 'ready'(운영자 '완료')가 누락돼 draft 로 silently coercion 되던 버그를 수정한다.
      //   published/private 는 backward-compat 유지(제거 시 기존 행 영향).
      // WO-O4O-CONTENT-SAVE-MEANS-READY-GLOBAL-STANDARD-V1:
      //   "저장 = 즉시 사용 가능" 표준. status 미지정/무효 시 기본값을 'draft' → 'ready' 로 변경.
      //   draft 는 클라이언트가 명시적으로 'draft' 를 보냈을 때만 만들어진다.
      const validStatuses = ['draft', 'ready', 'published', 'private'];
      const status = validStatuses.includes(reqStatus) ? reqStatus : 'ready';
      const validContentTypes = ['participation', 'information'];
      const cType = validContentTypes.includes(content_type) ? content_type : 'information';

      // WO-O4O-KPA-RESOURCES-USAGE-TYPE-V1: usage_type 결정
      const VALID_USAGE_TYPES = ['READ', 'LINK', 'DOWNLOAD', 'COPY'];
      const derivedUsageType = (() => {
        if (reqUsageType && VALID_USAGE_TYPES.includes(reqUsageType)) return reqUsageType;
        if (source_type === 'external') return 'LINK';
        if (source_type === 'upload') return 'DOWNLOAD';
        return 'READ';
      })();

      // 보정 1: COPY 타입은 blocks 또는 body 중 최소 1개 필수
      if (derivedUsageType === 'COPY') {
        const hasBlocks = Array.isArray(blocks) && blocks.length > 0;
        const hasBody = typeof body === 'string' && body.trim().length > 0;
        if (!hasBlocks && !hasBody) {
          res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'COPY 타입은 본문(blocks 또는 body)이 필요합니다' } });
          return;
        }
      }

      // WO-O4O-CMS-CONTENT-REUSABLE-POLICY-ALIGN-V1: reusable_policy 처리
      const VALID_REUSABLE_POLICIES = ['restricted', 'platform'];
      const reusablePolicy = VALID_REUSABLE_POLICIES.includes(reqReusablePolicy)
        ? reqReusablePolicy
        : 'platform';

      const [saved] = await dataSource.query(
        `INSERT INTO kpa_contents (title, summary, blocks, tags, category, thumbnail_url, source_type, source_url, source_file_name, status, created_by, body, content_type, sub_type, author_name, usage_type, reusable_policy)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
         RETURNING *`,
        [
          title.trim(),
          summary || null,
          JSON.stringify(Array.isArray(blocks) ? blocks : []),
          JSON.stringify(sanitizedTags),
          category || null,
          thumbnail_url || null,
          source_type || 'manual',
          source_url || null,
          source_file_name || null,
          status,
          userId,
          sanitizeDescriptionHtml(body) || null,
          cType,
          sub_type || null,
          user?.name || null,
          derivedUsageType,
          reusablePolicy,
        ]
      );
      await writeAuditLog(user, 'CONTENT_CREATED', 'kpa_content', saved.id, { title: saved.title });
      res.status(201).json({ success: true, data: saved });
    }));

    // GET /contents/:id — 상세
    // WO-KPA-CONTENT-HUB-FOUNDATION-V1: isRecommendedByMe 포함
    contentRouter.get('/:id', optionalAuth as any, asyncHandler(async (req: Request, res: Response) => {
      const userId = (req as any).user?.id;
      const [content] = await dataSource.query(
        `SELECT * FROM kpa_contents WHERE id = $1 AND is_deleted = false LIMIT 1`,
        [req.params.id]
      );
      if (!content) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '콘텐츠를 찾을 수 없습니다' } });
        return;
      }

      // WO-O4O-KPA-CONTENT-ACCESS-AND-COPY-POLICY-FINAL-ALIGNMENT-V1:
      //   상세가 id + is_deleted 만 검사해 **draft/private 콘텐츠도 ID 만 알면 조회**됐다.
      //   목록(GET /contents)의 기존 접근 정책과 정렬한다 — 공개 범위를 넓히지 않는다.
      //     비로그인   : published 만
      //     로그인     : published · ready · 본인 소유(draft/private 포함)
      //     운영자/관리자: 기존 관리 범위(전체)
      //   ready 는 매장 HUB 콘텐츠 허브(status='ready')와 제작 자료 선택 흐름
      //   (SelectContentsForProductionModal → getContentHubItem)이 소비하므로 로그인 사용자에게 허용한다.
      //   존재 여부 노출을 피하려고 403 이 아니라 기존 404 형식을 그대로 쓴다.
      const isOperatorOrAdmin = isKpaOperatorOrAdmin((req as any).user);
      const isOwner = !!userId && content.created_by === userId;
      const viewableStatuses = userId ? ['published', 'ready'] : ['published'];
      if (!isOperatorOrAdmin && !isOwner && !viewableStatuses.includes(content.status)) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '콘텐츠를 찾을 수 없습니다' } });
        return;
      }

      // Check recommendation status for logged-in user
      let isRecommendedByMe = false;
      if (userId) {
        const rec = await dataSource.query(
          `SELECT id FROM kpa_content_recommendations WHERE content_id = $1 AND user_id = $2 LIMIT 1`,
          [content.id, userId]
        ).catch(() => []);
        isRecommendedByMe = rec.length > 0;
      }

      res.json({
        success: true,
        data: {
          ...content,
          isRecommendedByMe,
          // ContentMeta (WO-CONTENT-META-API-ENRICHMENT-V1)
          // WO-O4O-CONTENT-BOUNDARY-ALIGNMENT-V1: kpa_contents = 회원 작성 원장 → 'community'
          producer: mapKpaContentProducer(),
          producerRef: content.created_by ?? '',
          visibility: 'service' as const,
          serviceKey: 'kpa-society' as const,
          contentType: 'document' as const,
          metaStatus: mapCmsStatus(content.status === 'published' ? 'pending' : (content.status ?? 'draft')),
        },
      });
    }));

    // PATCH /contents/:id — 수정 (본인 또는 운영자)
    // WO-KPA-CONTENT-HUB-FOUNDATION-V1: 작성자 본인 또는 kpa:operator 수정 가능
    contentRouter.patch('/:id', authenticate, asyncHandler(async (req: Request, res: Response) => {
      const user = (req as any).user;
      const userId = user?.id;
      const [existing] = await dataSource.query(
        `SELECT * FROM kpa_contents WHERE id = $1 AND is_deleted = false LIMIT 1`,
        [req.params.id]
      );
      if (!existing) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '콘텐츠를 찾을 수 없습니다' } });
        return;
      }

      const isOwner = existing.created_by === userId;
      const isOperator = isKpaOperatorOrAdmin(user);
      if (!isOwner && !isOperator) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: '수정 권한이 없습니다' } });
        return;
      }

      const { title, summary, blocks, tags, category, thumbnail_url, source_type, source_url, source_file_name, status: reqStatus, body, content_type, sub_type, usage_type: reqUsageType, reusable_policy: reqReusablePolicy } = req.body;

      // WO-O4O-KPA-RESOURCES-USAGE-TYPE-V1: COPY 보정 — 수정 시에도 blocks/body 필수
      if (reqUsageType === 'COPY') {
        const newBlocks = blocks !== undefined ? blocks : existing.blocks;
        const newBody = body !== undefined ? body : existing.body;
        const hasBlocks = Array.isArray(newBlocks) && newBlocks.length > 0;
        const hasBody = typeof newBody === 'string' && newBody.trim().length > 0;
        if (!hasBlocks && !hasBody) {
          res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'COPY 타입은 본문(blocks 또는 body)이 필요합니다' } });
          return;
        }
      }

      const sets: string[] = [`updated_at = NOW()`];
      const params: any[] = [];
      let idx = 1;

      if (title !== undefined) { sets.push(`title = $${idx++}`); params.push(title.trim()); }
      if (summary !== undefined) { sets.push(`summary = $${idx++}`); params.push(summary || null); }
      if (blocks !== undefined) { sets.push(`blocks = $${idx++}`); params.push(JSON.stringify(Array.isArray(blocks) ? blocks : existing.blocks)); }
      if (tags !== undefined) {
        const sanitizeTags = (t: unknown): string[] => {
          if (!Array.isArray(t)) return [];
          return [...new Set<string>(
            t.map((v: any) => String(v).trim().replace(/^#/, ''))
              .filter(Boolean).filter((v: string) => v.length <= 30)
          )];
        };
        const sanitized = sanitizeTags(tags);
        if (sanitized.length === 0) {
          res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: '태그를 1개 이상 입력해주세요' } });
          return;
        }
        sets.push(`tags = $${idx++}`); params.push(JSON.stringify(sanitized));
      }
      if (category !== undefined) { sets.push(`category = $${idx++}`); params.push(category || null); }
      if (thumbnail_url !== undefined) { sets.push(`thumbnail_url = $${idx++}`); params.push(thumbnail_url || null); }
      if (source_type !== undefined) { sets.push(`source_type = $${idx++}`); params.push(source_type); }
      if (source_url !== undefined) { sets.push(`source_url = $${idx++}`); params.push(source_url || null); }
      if (source_file_name !== undefined) { sets.push(`source_file_name = $${idx++}`); params.push(source_file_name || null); }
      if (reqStatus !== undefined) {
        // WO-O4O-KPA-CONTENT-STATUS-SEMANTICS-AUDIT-V1: 'ready' 추가.
      //   content-meta SSOT 상 kpa_contents.status = draft|ready('발행 가능/검토 완료').
      //   기존엔 'ready'(운영자 '완료')가 누락돼 draft 로 silently coercion 되던 버그를 수정한다.
      //   published/private 는 backward-compat 유지(제거 시 기존 행 영향).
      const validStatuses = ['draft', 'ready', 'published', 'private'];
        sets.push(`status = $${idx++}`);
        params.push(validStatuses.includes(reqStatus) ? reqStatus : existing.status);
      }
      if (body !== undefined) { sets.push(`body = $${idx++}`); params.push(sanitizeDescriptionHtml(body) || null); }
      if (content_type !== undefined) {
        const validTypes = ['participation', 'information'];
        sets.push(`content_type = $${idx++}`);
        params.push(validTypes.includes(content_type) ? content_type : existing.content_type);
      }
      if (sub_type !== undefined) { sets.push(`sub_type = $${idx++}`); params.push(sub_type || null); }
      if (reqUsageType !== undefined) {
        const VALID_USAGE_TYPES = ['READ', 'LINK', 'DOWNLOAD', 'COPY'];
        sets.push(`usage_type = $${idx++}`);
        params.push(VALID_USAGE_TYPES.includes(reqUsageType) ? reqUsageType : existing.usage_type);
      }
      // WO-O4O-CMS-CONTENT-REUSABLE-POLICY-ALIGN-V1: reusable_policy 변경 처리
      if (reqReusablePolicy !== undefined) {
        const VALID_REUSABLE_POLICIES = ['restricted', 'platform'];
        sets.push(`reusable_policy = $${idx++}`);
        params.push(VALID_REUSABLE_POLICIES.includes(reqReusablePolicy) ? reqReusablePolicy : existing.reusable_policy);
      }

      params.push(existing.id);
      const [updated] = await dataSource.query(
        `UPDATE kpa_contents SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
        params
      );
      await writeAuditLog(user, 'CONTENT_UPDATED', 'kpa_content', updated.id, { title: updated.title });
      res.json({ success: true, data: updated });
    }));

    // DELETE /contents/:id — soft delete (본인 또는 운영자)
    // WO-KPA-CONTENT-HUB-FOUNDATION-V1: 작성자 본인 또는 kpa:operator 삭제 가능
    // WO-O4O-COMMUNITY-CONTENT-RESOURCE-KPA-CORE-ADOPTION-CLOSURE-V1: 공통 Core 채택
    contentRouter.delete('/:id', authenticate, asyncHandler(kpaContentCore.remove));

    // ── Recommend toggle (WO-KPA-CONTENT-HUB-FOUNDATION-V1) ─────────────────
    contentRouter.post('/:id/recommend', authenticate, asyncHandler(async (req: Request, res: Response) => {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
        return;
      }

      const [content] = await dataSource.query(
        `SELECT id FROM kpa_contents WHERE id = $1 AND is_deleted = false LIMIT 1`,
        [req.params.id]
      );
      if (!content) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '콘텐츠를 찾을 수 없습니다' } });
        return;
      }

      const existing = await dataSource.query(
        `SELECT id FROM kpa_content_recommendations WHERE content_id = $1 AND user_id = $2`,
        [content.id, userId]
      );

      let isRecommendedByMe: boolean;
      if (existing.length > 0) {
        await dataSource.query(
          `DELETE FROM kpa_content_recommendations WHERE content_id = $1 AND user_id = $2`,
          [content.id, userId]
        );
        await dataSource.query(
          `UPDATE kpa_contents SET like_count = GREATEST(0, like_count - 1) WHERE id = $1`,
          [content.id]
        );
        isRecommendedByMe = false;
      } else {
        await dataSource.query(
          `INSERT INTO kpa_content_recommendations (content_id, user_id) VALUES ($1, $2)`,
          [content.id, userId]
        );
        await dataSource.query(
          `UPDATE kpa_contents SET like_count = like_count + 1 WHERE id = $1`,
          [content.id]
        );
        isRecommendedByMe = true;
      }

      const [{ count }] = await dataSource.query(
        `SELECT COUNT(*)::int as count FROM kpa_content_recommendations WHERE content_id = $1`,
        [content.id]
      );

      res.json({ success: true, data: { recommendCount: count, isRecommendedByMe } });
    }));

    // ── View count (WO-KPA-CONTENT-HUB-FOUNDATION-V1) ────────────────────
    // WO-O4O-COMMUNITY-CONTENT-RESOURCE-KPA-CORE-ADOPTION-CLOSURE-V1: 공통 Core 채택
    contentRouter.post('/:id/view', optionalAuth as any, asyncHandler(kpaContentCore.incrementView));

    // ── AI endpoints (WO-O4O-STORE-CONTENT-USAGE-RECOMPOSE-V1: stubs → execute()) ──

    // POST /contents/:id/ai/summarize
    contentRouter.post('/:id/ai/summarize', authenticate, requireKpaScope('kpa:operator') as any, asyncHandler(async (req: Request, res: Response) => {
      const [content] = await dataSource.query(
        `SELECT * FROM kpa_contents WHERE id = $1 AND is_deleted = false LIMIT 1`,
        [req.params.id]
      );
      if (!content) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '콘텐츠를 찾을 수 없습니다' } });
        return;
      }
      try {
        const result = await executeManagedAi(dataSource, 'kpa.content-summary', {
          systemPrompt: SUMMARIZE_SYSTEM_PROMPT,
          userPrompt: buildSummarizeUserPrompt(content.title, content.blocks),
          config: buildConfigResolver(dataSource, 'store'),
          meta: { service: 'kpa', callerName: 'KpaContentSummarize' },
        });
        const parsed = JSON.parse(result.content);
        const summary = parsed.summary || content.title;
        await dataSource.query(`UPDATE kpa_contents SET summary = $1, updated_at = NOW() WHERE id = $2`, [summary, content.id]);
        res.json({ success: true, data: { summary } });
      } catch (e: any) {
        console.error('[KPA AI Summarize] Failed:', e.message);
        // Fallback to simple extraction
        const textContent = (content.blocks as any[])
          .filter((b: any) => b.type === 'text' && b.content)
          .map((b: any) => b.content)
          .join(' ')
          .slice(0, 200);
        const summary = textContent || content.title;
        await dataSource.query(`UPDATE kpa_contents SET summary = $1, updated_at = NOW() WHERE id = $2`, [summary, content.id]);
        res.json({ success: true, data: { summary } });
      }
    }));

    // POST /contents/:id/ai/extract
    contentRouter.post('/:id/ai/extract', authenticate, requireKpaScope('kpa:operator') as any, asyncHandler(async (req: Request, res: Response) => {
      const [content] = await dataSource.query(
        `SELECT * FROM kpa_contents WHERE id = $1 AND is_deleted = false LIMIT 1`,
        [req.params.id]
      );
      if (!content) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '콘텐츠를 찾을 수 없습니다' } });
        return;
      }
      try {
        const result = await executeManagedAi(dataSource, 'kpa.content-extraction', {
          systemPrompt: EXTRACT_SYSTEM_PROMPT,
          userPrompt: buildExtractUserPrompt(content.title, content.blocks),
          config: buildConfigResolver(dataSource, 'store'),
          meta: { service: 'kpa', callerName: 'KpaContentExtract' },
        });
        const parsed = JSON.parse(result.content);
        const keyPoints = Array.isArray(parsed.keyPoints) ? parsed.keyPoints.slice(0, 5) : [];
        res.json({ success: true, data: { keyPoints } });
      } catch (e: any) {
        console.error('[KPA AI Extract] Failed:', e.message);
        // Fallback to list items
        const keyPoints = (content.blocks as any[])
          .filter((b: any) => b.type === 'list' && Array.isArray(b.items))
          .flatMap((b: any) => b.items)
          .slice(0, 5);
        res.json({ success: true, data: { keyPoints } });
      }
    }));

    // POST /contents/:id/ai/tag
    contentRouter.post('/:id/ai/tag', authenticate, requireKpaScope('kpa:operator') as any, asyncHandler(async (req: Request, res: Response) => {
      const [content] = await dataSource.query(
        `SELECT * FROM kpa_contents WHERE id = $1 AND is_deleted = false LIMIT 1`,
        [req.params.id]
      );
      if (!content) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '콘텐츠를 찾을 수 없습니다' } });
        return;
      }
      try {
        const result = await executeManagedAi(dataSource, 'kpa.content-tags', {
          systemPrompt: TAG_SYSTEM_PROMPT,
          userPrompt: buildTagUserPrompt(content.title, content.blocks, content.category),
          config: buildConfigResolver(dataSource, 'store'),
          meta: { service: 'kpa', callerName: 'KpaContentTag' },
        });
        const parsed = JSON.parse(result.content);
        const suggestedTags = Array.isArray(parsed.suggestedTags)
          ? [...new Set(parsed.suggestedTags)].slice(0, 8)
          : [];
        res.json({ success: true, data: { suggestedTags } });
      } catch (e: any) {
        console.error('[KPA AI Tag] Failed:', e.message);
        // Fallback to category + existing tags
        const existingTags: string[] = Array.isArray(content.tags) ? content.tags : [];
        const suggestedTags = content.category ? [content.category, ...existingTags] : existingTags;
        res.json({ success: true, data: { suggestedTags: [...new Set(suggestedTags)].slice(0, 8) } });
      }
    }));

    router.use('/contents', contentRouter);
  }

  // Groupbuy Routes (WO-O4O-ROUTES-REFACTOR-V1)
  router.use('/groupbuy', createEventOfferController(dataSource, authenticate as any, optionalAuth as any, requireKpaScope));

  // ============================================================================
  // Checkout Routes — WO-O4O-KPA-CUSTOMER-COMMERCE-LOOP-V1
  // POST /api/v1/kpa/checkout — 주문 생성
  // GET  /api/v1/kpa/checkout/orders — 내 주문 목록
  // GET  /api/v1/kpa/checkout/orders/:orderId — 주문 상세
  // ============================================================================
  const kpaCheckoutController = createKpaCheckoutController(dataSource, coreRequireAuth as any);
  router.use('/checkout', kpaCheckoutController);

  // ============================================================================
  // Payment Routes — WO-O4O-KPA-CUSTOMER-COMMERCE-LOOP-V1
  // POST /api/v1/kpa/payments/prepare — 결제 준비
  // POST /api/v1/kpa/payments/confirm — 결제 확인
  // GET  /api/v1/kpa/payments/order/:orderId — 결제 정보
  // ============================================================================
  const kpaPaymentController = createKpaPaymentController(dataSource, coreRequireAuth as any);
  router.use('/payments', kpaPaymentController);

  // ============================================================================
  // WO-O4O-SUPPLIER-ORDER-PAYMENT-FULFILLMENT-SETTLEMENT-CANONICALIZATION-V1 §2-E
  // 매장 → 공급자 B2B 결제 (승인축 B2B + Event Offer 특가)
  //   POST /api/v1/kpa/b2b/payments/prepare
  //   POST /api/v1/kpa/b2b/payments/confirm
  //   GET  /api/v1/kpa/b2b/payments/order/:orderId
  //
  // 위 `/payments` (소비자 → 매장 판매)는 410 Gone 으로 **그대로 유지**한다.
  // 이 경로는 성격이 다른 축(B2B)이므로 별도 namespace 를 쓴다 —
  // 소비자→매장 commerce 를 복구하는 것이 아니다.
  // ============================================================================
  router.use(
    '/b2b/payments',
    createB2bPaymentController(dataSource, coreRequireAuth as any, {
      logLabel: 'KPA B2B Payment',
      allowedServiceKeys: KPA_B2B_SERVICE_KEYS,
    }),
  );

  // Health check endpoint
  router.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'kpa', timestamp: new Date().toISOString() });
  });

  return router;
}

/**
 * Create public join inquiry routes
 * Mounted at /api/v1/join (no auth required)
 */
export function createKpaJoinPublicRoutes(dataSource: DataSource): Router {
  return createJoinInquiryPublicRoutes(dataSource);
}
