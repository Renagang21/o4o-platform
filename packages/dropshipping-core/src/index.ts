/**
 * Dropshipping-Core (S2S Engine)
 *
 * 산업 중립적 S2S(Supplier-to-Seller) 엔진
 *
 * ## Product 정보 소유 기준
 * - Product Master의 Source of Truth는 Supplier(공급자)에 있음
 * - Seller는 Offer를 선택하여 Listing(표현/노출)을 생성
 * - 이 구조는 모든 서비스(Cosmetics, Pharmaceutical, Yaksa 등)에 공통 적용
 *
 * ## Core 책임 범위
 * - Supplier/Seller 관계 관리
 * - Product Master → Offer → Listing 흐름
 * - Order Relay (주문 전달)
 * - Settlement/Commission (정산/수수료)
 *
 * ## Core가 하지 않는 것
 * - 비즈니스 정책 판단 (승인 조건, 자격 요건 등)
 * - 서비스별 특수 로직 (규제, 마케팅 등)
 * - 위 항목은 Extension 또는 서비스별 Core에서 처리
 *
 * @package @o4o/dropshipping-core
 * @version 1.0.0
 */

import { Router } from 'express';
import type { DataSource } from 'typeorm';

// Manifest
export { dropshippingCoreManifest, manifest, default as manifestDefault } from './manifest.js';

// Entities
export * from './entities/index.js';

// Services
export * from './services/index.js';

// Controllers
export * from './controllers/index.js';

// Lifecycle
export * from './lifecycle/index.js';

// Hooks/Events
export * from './hooks/index.js';

// Entity list for TypeORM
import * as Entities from './entities/index.js';
export const entities = [
  Entities.Supplier,
  Entities.Seller,
  Entities.ProductMaster,
  Entities.SupplierProductOffer,
  Entities.SellerListing,
  Entities.OrderRelay,
  Entities.SettlementBatch,
  Entities.CommissionRule,
  Entities.CommissionTransaction,
];

// Service registry
import * as Services from './services/index.js';
export const services = Services;

// Controller registry
import * as Controllers from './controllers/index.js';
export const controllers = Controllers;

/**
 * Routes factory compatible with Module Loader
 *
 * @param dataSource - TypeORM DataSource from API server
 */
export function routes(dataSource?: DataSource | any): Router {
  const router = Router();

  // TODO: Implement actual routes using controllers
  router.get('/health', (req, res) => {
    res.json({ status: 'ok', app: 'dropshipping-core' });
  });

  return router;
}

// Alias for manifest compatibility
export const createRoutes = routes;
