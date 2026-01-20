/**
 * Signage Extensions - Main Entry Point
 *
 * WO-SIGNAGE-PHASE3-DEV-FOUNDATION
 *
 * Phase 3 Extension 라우터 등록 진입점
 * 각 Extension 라우터를 /ext/{extension} 경로로 등록합니다.
 */

import { Router } from 'express';
import type { DataSource } from 'typeorm';
import { extensionRegistry } from './common/index.js';

// ============================================================================
// EXTENSION ROUTER FACTORY
// ============================================================================

/**
 * Extension 라우터 Factory
 *
 * 활성화된 Extension들의 라우터를 생성하고 등록합니다.
 * 경로: /api/signage/:serviceKey/ext/{extension}/...
 *
 * @param dataSource TypeORM DataSource
 * @returns Express Router
 */
export function createExtensionRouters(dataSource: DataSource): Router {
  const router = Router({ mergeParams: true });

  // Pharmacy Extension (P1)
  if (extensionRegistry.isEnabled('pharmacy')) {
    // TODO: Phase 3 Sprint 3-2에서 구현
    // const pharmacyRouter = createPharmacyRouter(dataSource);
    // router.use('/pharmacy', pharmacyRouter);
  }

  // Cosmetics Extension (P2)
  if (extensionRegistry.isEnabled('cosmetics')) {
    // TODO: Phase 3 Sprint 3-3에서 구현
    // const cosmeticsRouter = createCosmeticsRouter(dataSource);
    // router.use('/cosmetics', cosmeticsRouter);
  }

  // Seller Extension (P3)
  if (extensionRegistry.isEnabled('seller')) {
    // TODO: Phase 3 Sprint 3-5에서 구현
    // const sellerRouter = createSellerRouter(dataSource);
    // router.use('/seller', sellerRouter);
  }

  // Tourist Extension (P4 - Deferred)
  if (extensionRegistry.isEnabled('tourist')) {
    // TODO: Phase 3 Sprint 3-6에서 구현 (optional)
    // const touristRouter = createTouristRouter(dataSource);
    // router.use('/tourist', touristRouter);
  }

  // Extension Status Endpoint
  router.get('/status', (req, res) => {
    const configs = extensionRegistry.getAllConfigs();
    const enabled = extensionRegistry.getEnabledExtensions();
    const params = req.params as { serviceKey?: string };

    res.json({
      data: {
        extensions: configs,
        enabled,
      },
      meta: {
        serviceKey: params.serviceKey,
        timestamp: new Date().toISOString(),
      },
    });
  });

  return router;
}

// Re-export common modules for convenience
export * from './common/index.js';
