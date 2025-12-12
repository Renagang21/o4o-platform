/**
 * Dropshipping Cosmetics Extension
 *
 * Phase 9-C: Core v2 정렬
 * - ProductType.COSMETICS 기반 확장
 * - before/after hooks 패턴 사용
 * - Core Validation Hook 시스템 통합
 *
 * Main entry point for the cosmetics extension package
 *
 * @package @o4o-apps/dropshipping-cosmetics
 * @version 1.0.0
 */

import { Router } from 'express';
import type { DataSource } from 'typeorm';

// Manifest
export { cosmeticsExtensionManifest, manifest, default as manifestDefault } from './manifest.js';
export * from './types.js';
export * as lifecycle from './lifecycle/index.js';

// Extension (Phase 9-C: Core v2 hooks)
export { cosmeticsExtension } from './extension.js';
export type {
  CosmeticsProductMetadata,
} from './extension.js';

// DTOs (Phase 9-C)
export * from './backend/dto/index.js';

/**
 * Routes factory compatible with Module Loader
 */
export function routes(dataSource?: DataSource | any): Router {
  const router = Router();

  router.get('/health', (req, res) => {
    res.json({ status: 'ok', app: 'dropshipping-cosmetics' });
  });

  return router;
}

export const createRoutes = routes;
