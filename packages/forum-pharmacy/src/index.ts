/**
 * Forum Pharmacy Extension App
 * WO-KPA-FORUM-PHARMACY-EXT-V1
 *
 * 핵심 원칙:
 * - forum-core 수정 금지
 * - 약사 서비스의 맥락/접근/책임만 부여
 * - 점수/랭킹/알고리즘 구현 금지
 *
 * 이 포럼 확장은 "더 많은 말을 하게 하는 도구"가 아니라
 * "말의 책임을 분명히 하는 도구"다.
 *
 * @package @o4o-apps/forum-pharmacy
 * @version 1.0.0
 */

import { Router } from 'express';
import type { DataSource } from 'typeorm';

// Manifest
export { forumPharmacyManifest, manifest, default as manifestDefault } from './manifest.js';

// Backend types
export * from './backend/types/index.js';

// Backend services
export * from './backend/services/index.js';

// Public UI components
export * from './public-ui/index.js';

// Lifecycle
export * from './lifecycle/index.js';

// Import route factory
import { createPharmacyRoutes } from './backend/routes/index.js';

/**
 * Routes factory compatible with Module Loader
 */
export function routes(dataSource?: DataSource): Router {
  const router = Router();

  router.get('/health', (_req, res) => {
    res.json({ status: 'ok', app: 'forum-pharmacy' });
  });

  // Mount pharmacy-specific routes
  if (dataSource) {
    try {
      const pharmacyRoutes = createPharmacyRoutes(dataSource);
      router.use('/', pharmacyRoutes);
    } catch (error) {
      console.error('[forum-pharmacy] Failed to initialize routes:', error);
    }
  }

  return router;
}

export const createRoutes = routes;
