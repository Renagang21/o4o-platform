/**
 * E-commerce Core Backend Module
 *
 * ModuleLoader에서 사용하는 백엔드 export
 */

import { Router } from 'express';
import { DataSource } from 'typeorm';
import {
  EcommerceOrder,
  EcommerceOrderItem,
  EcommercePayment,
} from '../entities/index.js';
import { EcommerceOrderService } from '../services/EcommerceOrderService.js';
import { EcommercePaymentService } from '../services/EcommercePaymentService.js';

/**
 * Entity 목록
 */
export const entities = [
  EcommerceOrder,
  EcommerceOrderItem,
  EcommercePayment,
];

/**
 * 서비스 클래스 목록
 */
export const services = [
  EcommerceOrderService,
  EcommercePaymentService,
];

/**
 * 라우트 생성 함수 (ModuleLoader용)
 */
export function createRoutes(dataSource: DataSource): Router {
  const router = Router();

  // TODO: Express 라우트 정의 (NestJS 환경에서는 Controller 사용)

  return router;
}

// Re-export
export * from '../entities/index.js';
export * from '../services/index.js';
export * from '../controllers/index.js';
