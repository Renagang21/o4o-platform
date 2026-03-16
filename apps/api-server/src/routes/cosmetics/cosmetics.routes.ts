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
import { createStoreAnalyticsController } from '../o4o-store/controllers/store-analytics.controller.js';
import { createStoreContentController } from '../o4o-store/controllers/store-content.controller.js';
import { createStorePlaylistController } from '../o4o-store/controllers/store-playlist.controller.js';
import { createStoreLibraryController } from '../o4o-store/controllers/store-library.controller.js';
import { createStoreQrLandingController } from '../o4o-store/controllers/store-qr-landing.controller.js';
import { createStorePopController } from '../o4o-store/controllers/store-pop.controller.js';
import { createProductMarketingController } from '../o4o-store/controllers/product-marketing.controller.js';
import { createAssetSnapshotController } from '../o4o-store/controllers/asset-snapshot.controller.js';
import { createStoreAssetControlController } from '../o4o-store/controllers/store-asset-control.controller.js';
import { createPublishedAssetsController } from '../o4o-store/controllers/published-assets.controller.js';
// WO-KCOSMETICS-COMMUNITY-HUB-IMPLEMENTATION-V1
import { createCosmeticsCommunityHubController } from './controllers/cosmetics-community-hub.controller.js';

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
  router.use('/orders', orderController); // H2-0: 주문 엔드포인트
  router.use('/payments', paymentController); // Payment EventHub 연결
  router.use('/stores', storeController); // WO-KCOS-STORES-PHASE1-V1: 매장 관리

  // ============================================================================
  // Store HUB Controllers (WO-O4O-COSMETICS-STORE-HUB-ADOPTION-V1)
  // ============================================================================

  // Store Hub — Dashboard overview, channels, KPI, live signals
  router.use('/store-hub', createStoreHubController(dataSource, coreRequireAuth as any));

  // Channel Product Management — 채널별 상품 진열 관리
  router.use('/store-hub/channel-products', createStoreChannelProductsController(dataSource, coreRequireAuth as any));

  // Asset Snapshot
  router.use('/assets', createAssetSnapshotController(dataSource, coreRequireAuth as any));

  // Store Asset Control
  router.use('/store-assets', createStoreAssetControlController(dataSource, coreRequireAuth as any));

  // Store Content — 콘텐츠 오버라이드
  router.use('/store-contents', createStoreContentController(dataSource, coreRequireAuth as any));

  // Store Playlist — 사이니지 플레이리스트
  router.use('/store-playlists', createStorePlaylistController(dataSource, coreRequireAuth as any));

  // Store Library (internal: /pharmacy/library/*)
  router.use('/', createStoreLibraryController(dataSource, coreRequireAuth as any));

  // Store QR Landing (internal: /qr/public/*, /pharmacy/qr/*)
  router.use('/', createStoreQrLandingController(dataSource, coreRequireAuth as any));

  // Store POP (internal: /pharmacy/pop/*)
  router.use('/', createStorePopController(dataSource, coreRequireAuth as any));

  // Store Analytics (internal: /pharmacy/analytics/*)
  router.use('/', createStoreAnalyticsController(dataSource, coreRequireAuth as any));

  // Product Marketing Graph (internal: /pharmacy/products/*/marketing)
  router.use('/', createProductMarketingController(dataSource, coreRequireAuth as any));

  // Published Assets
  router.use('/published-assets', createPublishedAssetsController(dataSource));

  // Community Hub — ads, sponsors (WO-KCOSMETICS-COMMUNITY-HUB-IMPLEMENTATION-V1)
  router.use('/', createCosmeticsCommunityHubController(dataSource, coreRequireAuth as any, requireCosmeticsScope as any));

  return router;
}

export default createCosmeticsRoutes;
