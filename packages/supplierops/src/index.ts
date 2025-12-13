/**
 * SupplierOps
 *
 * 범용 공급자 운영 앱 (Universal Supplier Operations App)
 *
 * Phase 9-B: Core 정렬 완료
 * - ProductType, OfferStatus, OrderRelayStatus, SettlementType enum 사용
 * - productType 기반 필터링 전 계층 지원
 * - PHARMACEUTICAL 제품 타입 차단
 * - before/after hooks 전체 구현
 *
 * @package @o4o/supplierops
 * @version 1.0.0
 */

import { Router } from 'express';
import type { DataSource } from 'typeorm';

// Manifest
export { supplieropsManifest, supplieropsManifest as manifest } from './manifest.js';
export { supplieropsManifest as default } from './manifest.js';

// Extension (Phase 2)
export { supplierOpsExtension } from './extension.js';

// DTOs
export * from './dto/index.js';

// Services
export * from './services/index.js';

// Controllers
export * from './controllers/index.js';

// Lifecycle
export * from './lifecycle/index.js';

// Hooks/Events
export * from './hooks/index.js';

// Service registry
import * as Services from './services/index.js';
export const services = Services;

// Controller registry
import * as Controllers from './controllers/index.js';
export const controllers = Controllers;

/**
 * Create Express routes for SupplierOps
 */
export function createRoutes(dataSource: DataSource): Router {
  const router = Router();

  // TODO: Implement actual routes
  router.get('/health', (_req, res) => {
    res.json({ status: 'ok', app: 'supplierops' });
  });

  return router;
}
