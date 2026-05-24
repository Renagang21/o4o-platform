/**
 * Cosmetics Routes
 *
 * Phase 7-A-1: Cosmetics API Implementation
 * H2-0: Order Routes 추가
 * WO-O4O-COSMETICS-STORE-HUB-ADOPTION-V1: Store HUB 컨트롤러 마운트
 *
 * Main entry point for cosmetics API routes
 */

import { Router } from 'express';
import { DataSource } from 'typeorm';
import { createCosmeticsController } from './controllers/cosmetics.controller.js';
// WO-O4O-OPERATOR-API-ARCHITECTURE-UNIFICATION-V1 (Phase 3): Standard operator path
import { createCosmeticsOperatorDashboardController } from './controllers/operator-dashboard.controller.js';
import { createCosmeticsOrderController } from './controllers/cosmetics-order.controller.js';
import { createCosmeticsPaymentController } from './controllers/cosmetics-payment.controller.js';
import { createCosmeticsStoreController } from './controllers/cosmetics-store.controller.js';
import { requireAuth as coreRequireAuth } from '../../middleware/auth.middleware.js';
// WO-O4O-OPERATOR-API-ARCHITECTURE-UNIFICATION-V1: Centralized scope middleware
import { requireCosmeticsScope } from '../../middleware/cosmetics-scope.middleware.js';
// WO-O4O-COSMETICS-STORE-HUB-ADOPTION-V1: Store HUB controllers
import { createStoreHubController } from '../o4o-store/controllers/store-hub.controller.js';
import { createStoreChannelProductsController } from '../o4o-store/controllers/store-channel-products.controller.js';
import { createPharmacyProductsController } from '../o4o-store/controllers/pharmacy-products.controller.js';
import { createStoreAnalyticsController } from '../o4o-store/controllers/store-analytics.controller.js';
import { createStoreContentController } from '../o4o-store/controllers/store-content.controller.js';
import { createStorePlaylistController } from '../o4o-store/controllers/store-playlist.controller.js';
import { createStoreLibraryController } from '../o4o-store/controllers/store-library.controller.js';
import { createStoreQrLandingController } from '../o4o-store/controllers/store-qr-landing.controller.js';
import { createStorePopController } from '../o4o-store/controllers/store-pop.controller.js';
// WO-O4O-KCOS-STORE-EXECUTION-CANONICAL-ALIGNMENT-V1: Blog controller
import { createBlogController } from '../o4o-store/controllers/blog.controller.js';
// WO-O4O-OPERATOR-BLOG-PUBLISHING-WRITE-API-V1: 운영자 HUB 게시 write API
import { createOperatorBlogController } from '../o4o-store/controllers/operator-blog.controller.js';
import { createProductMarketingController } from '../o4o-store/controllers/product-marketing.controller.js';
import { createAssetSnapshotController } from '../o4o-store/controllers/asset-snapshot.controller.js';
import { createStoreAssetControlController } from '../o4o-store/controllers/store-asset-control.controller.js';
import { createPublishedAssetsController } from '../o4o-store/controllers/published-assets.controller.js';
import { createStoreSettingsController } from '../o4o-store/controllers/store-settings.controller.js'; // WO-STORE-COMMON-SETTINGS-FOUNDATION-V1
// WO-KCOSMETICS-COMMUNITY-HUB-IMPLEMENTATION-V1
import { createCosmeticsCommunityHubController } from './controllers/cosmetics-community-hub.controller.js';
// WO-KCOS-TOURIST-HUB-STATS-BACKEND-IMPL-V1
import { createCosmeticsTouristHubController } from './controllers/cosmetics-tourist-hub.controller.js';
// WO-O4O-EVENT-OFFER-KCOS-ADOPTION-V1
import { createCosmeticsEventOfferController } from './controllers/event-offer.controller.js';
// WO-O4O-KCOS-RESOURCES-BACKEND-V1: K-Cos Resource Layer (GP canonical mirror)
import { createCosmeticsContentsRouter, createCosmeticsOperatorResourcesRouter } from './controllers/resources.controller.js';
// WO-O4O-KCOS-COSMETICS-MEMBER-PROFILE-FOUNDATION-V1: profile classification (sub_role) Operator API
import { createCosmeticsMemberController } from './controllers/cosmetics-member.controller.js';
// WO-O4O-CONTENT-CANONICAL-CROSS-SERVICE-ALIGNMENT-V1
import { createNewsController } from '../o4o-store/controllers/news.controller.js';
import { authenticate, optionalAuth } from '../../middleware/auth.middleware.js';
// WO-O4O-OPERATOR-ACTION-LAYER-V1
import { createActionQueueRouter } from '../../common/action-queue/index.js';
import { cosmeticsActionConfig } from './action-definitions.js';

/**
 * Create cosmetics routes
 */
export function createCosmeticsRoutes(dataSource: DataSource): Router {
  const router = Router();

  // Create controller with auth middleware
  const cosmeticsController = createCosmeticsController(
    dataSource,
    coreRequireAuth as any,
    requireCosmeticsScope
  );

  // Create order controller (H2-0)
  const orderController = createCosmeticsOrderController(
    dataSource,
    coreRequireAuth as any,
    requireCosmeticsScope
  );

  // Create payment controller (WO-O4O-PAYMENT-EXTENSION-ROLL-OUT-V0.1)
  const paymentController = createCosmeticsPaymentController(
    dataSource,
    coreRequireAuth as any
  );

  // Create store controller (WO-KCOS-STORES-PHASE1-V1)
  const storeController = createCosmeticsStoreController(
    dataSource,
    coreRequireAuth as any,
    requireCosmeticsScope
  );

  // Mount controllers
  router.use('/', cosmeticsController);
  // WO-O4O-OPERATOR-API-ARCHITECTURE-UNIFICATION-V1 (Phase 3): /operator/dashboard
  router.use('/operator', createCosmeticsOperatorDashboardController(dataSource));
  // WO-O4O-OPERATOR-ACTION-LAYER-V1: Action Queue endpoints
  // WO-O4O-ACTION-SCOPE-GUARD-V1: execute endpoint admin-only scope guard
  router.use('/operator', coreRequireAuth as any, createActionQueueRouter(dataSource, cosmeticsActionConfig, requireCosmeticsScope('cosmetics:admin')));
  router.use('/orders', orderController); // H2-0: 주문 엔드포인트
  router.use('/payments', paymentController); // Payment EventHub 연결
  router.use('/stores', storeController); // WO-KCOS-STORES-PHASE1-V1: 매장 관리
  // WO-STORE-COMMON-SETTINGS-FOUNDATION-V1: unified settings + channel config
  router.use('/stores', createStoreSettingsController(dataSource, coreRequireAuth as any));

  // ============================================================================
  // Store HUB Controllers (WO-O4O-COSMETICS-STORE-HUB-ADOPTION-V1)
  // ============================================================================

  // Store Hub — Dashboard overview, channels, KPI, live signals
  // WO-O4O-STORE-GUARD-PHASE2C-CONFIG-AND-HUB-V1: serviceKey='cosmetics' 전달.
  router.use('/store-hub', createStoreHubController(dataSource, coreRequireAuth as any, 'cosmetics'));

  // Channel Product Management — 채널별 상품 진열 관리
  // WO-O4O-STORE-GUARD-PHASE2A-CHANNEL-AND-QR-V1: serviceKey='cosmetics' 전달.
  router.use('/store-hub/channel-products', createStoreChannelProductsController(dataSource, coreRequireAuth as any, 'cosmetics'));

  // B2B Supply Catalog — 공급자 상품 카탈로그 + 신청 (WO-O4O-HUB-TO-STORE-UX-BRIDGE-V1)
  // WO-GLYCOPHARM-STORE-GUARD-SERVICE-AWARE-FIX-V1: serviceKey='cosmetics' 전달 → cosmetics:store_owner 만 통과.
  router.use('/pharmacy/products', createPharmacyProductsController(dataSource, coreRequireAuth as any, 'cosmetics'));

  // Asset Snapshot
  router.use('/assets', createAssetSnapshotController(dataSource, coreRequireAuth as any));

  // Store Asset Control
  router.use('/store-assets', createStoreAssetControlController(dataSource, coreRequireAuth as any));

  // Store Content — 콘텐츠 오버라이드
  router.use('/store-contents', createStoreContentController(dataSource, coreRequireAuth as any));

  // Store Playlist — 사이니지 플레이리스트
  router.use('/store-playlists', createStorePlaylistController(dataSource, coreRequireAuth as any));

  // Store Library (internal: /pharmacy/library/*)
  // WO-O4O-STORE-GUARD-PHASE2B-LIBRARY-MARKETING-POP-V1: serviceKey='cosmetics' 전달.
  router.use('/', createStoreLibraryController(dataSource, coreRequireAuth as any, 'cosmetics'));

  // Store QR Landing (internal: /qr/public/*, /pharmacy/qr/*)
  // WO-O4O-STORE-GUARD-PHASE2A-CHANNEL-AND-QR-V1: serviceKey='cosmetics' 전달 (public route 는 무관).
  router.use('/', createStoreQrLandingController(dataSource, coreRequireAuth as any, 'cosmetics'));

  // Store POP (internal: /pharmacy/pop/*)
  // WO-O4O-STORE-GUARD-PHASE2B-LIBRARY-MARKETING-POP-V1: serviceKey='cosmetics' 전달.
  router.use('/', createStorePopController(dataSource, coreRequireAuth as any, 'cosmetics'));

  // Store Blog (internal: /stores/:slug/blog/*)
  // WO-O4O-KCOS-STORE-EXECUTION-CANONICAL-ALIGNMENT-V1: serviceKey='cosmetics' 전달.
  router.use('/', createBlogController(dataSource, coreRequireAuth as any, 'cosmetics'));

  // WO-O4O-OPERATOR-BLOG-PUBLISHING-WRITE-API-V1: 운영자 HUB 게시 write API
  // /api/v1/cosmetics/operator/blog/posts (운영자가 매장 HUB 에 게시하는 블로그)
  // 권한: cosmetics:operator / cosmetics:admin / platform:admin / platform:super_admin
  router.use(
    '/operator/blog',
    createOperatorBlogController(dataSource, coreRequireAuth as any, 'cosmetics'),
  );

  // Store Analytics (internal: /pharmacy/analytics/*)
  // WO-O4O-STORE-OWNER-BACKCOMPAT-CALLERS-MIGRATION-V1: serviceKey='cosmetics' 명시 (canonical)
  router.use('/', createStoreAnalyticsController(dataSource, coreRequireAuth as any, 'cosmetics'));

  // Product Marketing Graph (internal: /pharmacy/products/*/marketing)
  // WO-O4O-STORE-GUARD-PHASE2B-LIBRARY-MARKETING-POP-V1: serviceKey='cosmetics' 전달.
  router.use('/', createProductMarketingController(dataSource, coreRequireAuth as any, 'cosmetics'));

  // Published Assets
  router.use('/published-assets', createPublishedAssetsController(dataSource));

  // Community Hub — ads, sponsors (WO-KCOSMETICS-COMMUNITY-HUB-IMPLEMENTATION-V1)
  router.use('/', createCosmeticsCommunityHubController(dataSource, coreRequireAuth as any, requireCosmeticsScope as any));

  // Tourist Hub — stats (WO-KCOS-TOURIST-HUB-STATS-BACKEND-IMPL-V1)
  router.use('/tourist-hub', createCosmeticsTouristHubController(dataSource));

  // Event Offer (WO-O4O-EVENT-OFFER-KCOS-ADOPTION-V1)
  // 공통 EventOfferService에 K_COSMETICS_EVENT_OFFER service_key로 호출.
  // participate() 후처리(STORE_SERVICE_KEY_MAP)에 의해 'k-cosmetics' 매장 진열 자동 연결.
  router.use(
    '/event-offers',
    createCosmeticsEventOfferController(dataSource, authenticate, optionalAuth, requireCosmeticsScope),
  );

  // ============================================================================
  // Contents / Resources Routes
  // WO-O4O-KCOS-RESOURCES-BACKEND-V1 (GP glycopharm_contents canonical mirror)
  //
  // Public/Member:
  //   GET /api/v1/cosmetics/contents?sub_type=resource
  //
  // Operator:
  //   GET    /api/v1/cosmetics/operator/resources
  //   POST   /api/v1/cosmetics/operator/resources
  //   PATCH  /api/v1/cosmetics/operator/resources/:id/status
  //   DELETE /api/v1/cosmetics/operator/resources/:id
  // ============================================================================
  router.use('/contents', createCosmeticsContentsRouter(dataSource, optionalAuth as any));
  router.use(
    '/operator/resources',
    createCosmeticsOperatorResourcesRouter(dataSource, authenticate as any, requireCosmeticsScope),
  );

  // ============================================================================
  // Member Profile Classification — sub_role (store_owner / store_staff)
  // WO-O4O-KCOS-COSMETICS-MEMBER-PROFILE-FOUNDATION-V1
  //   GET   /api/v1/cosmetics/members/me
  //   GET   /api/v1/cosmetics/members              (operator)
  //   GET   /api/v1/cosmetics/members/:userId      (operator)
  //   PATCH /api/v1/cosmetics/members/:userId      (operator — subRole 설정)
  // ============================================================================
  router.use('/', createCosmeticsMemberController(dataSource, coreRequireAuth as any));

  // ============================================================================
  // News/Content Routes (CMS 공지/뉴스) — /api/v1/cosmetics/news/*
  // WO-O4O-CONTENT-CANONICAL-CROSS-SERVICE-ALIGNMENT-V1
  //
  // Public: GET /news, GET /news/:id
  // Operator: GET /news/admin/list, POST /news, PUT /news/:id,
  //           DELETE /news/:id, DELETE /news/:id/hard, batch ops
  // ============================================================================
  router.use('/news', createNewsController(
    dataSource,
    coreRequireAuth as any,
    optionalAuth as any,
    requireCosmeticsScope as any,
    'k-cosmetics',
    'cosmetics:operator',
  ));

  return router;
}

export default createCosmeticsRoutes;
