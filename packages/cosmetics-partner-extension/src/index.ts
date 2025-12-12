/**
 * Cosmetics Partner Extension
 *
 * 화장품 파트너/인플루언서 무재고 판매 확장 기능 패키지
 *
 * 주요 기능:
 * - Partner Profile (파트너 프로필)
 * - Partner Links (추천 링크)
 * - Partner Routines (루틴 기반 추천)
 * - Partner Earnings (수익 관리)
 */

import { Router } from 'express';
import type { DataSource } from 'typeorm';

// Manifest
export { cosmeticsPartnerExtensionManifest, cosmeticsPartnerExtensionManifest as manifest } from './manifest';
export { cosmeticsPartnerExtensionManifest as default } from './manifest';

// Backend
export * from './backend';

// Frontend
export * from './frontend';

// Shortcodes
export { shortcodes } from './shortcodes';

// Lifecycle
export * from './lifecycle';

/**
 * Create Express routes for Cosmetics Partner Extension
 */
export function createRoutes(dataSource: DataSource): Router {
  const router = Router();

  // Health check endpoint
  router.get('/health', (_req, res) => {
    res.json({ status: 'ok', app: 'cosmetics-partner-extension' });
  });

  return router;
}
