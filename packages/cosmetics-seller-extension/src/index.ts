/**
 * Cosmetics Seller Extension
 *
 * 화장품 판매원 확장 기능 패키지
 *
 * 주요 기능:
 * - Display Management (진열 관리)
 * - Sample Management (샘플 관리)
 * - Inventory Management (재고 관리)
 * - Consultation Log (상담 로그)
 * - KPI Tracking (성과 지표)
 */

import { Router } from 'express';
import type { DataSource } from 'typeorm';

// Manifest
export { cosmeticsSellerExtensionManifest, cosmeticsSellerExtensionManifest as manifest } from './manifest';
export { cosmeticsSellerExtensionManifest as default } from './manifest';

// Backend
export * from './backend';

// Frontend
export * from './frontend';

// Shortcodes
export { shortcodes } from './shortcodes';

// Lifecycle
export * from './lifecycle';

/**
 * Create Express routes for Cosmetics Seller Extension
 */
export function createRoutes(dataSource: DataSource): Router {
  const router = Router();

  // TODO: Implement actual routes
  router.get('/health', (_req, res) => {
    res.json({ status: 'ok', app: 'cosmetics-seller-extension' });
  });

  return router;
}
