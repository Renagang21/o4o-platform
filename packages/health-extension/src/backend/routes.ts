/**
 * Health Extension Routes
 *
 * API 라우트 정의
 *
 * @package @o4o/health-extension
 */

import { Router } from 'express';
import { DataSource } from 'typeorm';
import { HealthProductController } from './controllers/HealthProductController.js';
import { HealthOfferController } from './controllers/HealthOfferController.js';
import { HealthOrderController } from './controllers/HealthOrderController.js';
import { HealthSettlementController } from './controllers/HealthSettlementController.js';

export function createRoutes(dataSource: DataSource): Router {
  const router = Router();

  // Initialize controllers
  const productController = new HealthProductController(dataSource);
  const offerController = new HealthOfferController(dataSource);
  const orderController = new HealthOrderController(dataSource);
  const settlementController = new HealthSettlementController(dataSource);

  // ===== Product Routes =====
  router.get('/products', (req, res) => productController.getProductList(req, res));
  router.get('/products/expiring', (req, res) => productController.getExpiringProducts(req, res));
  router.get('/products/:id', (req, res) => productController.getProductDetail(req, res));
  router.get('/products/:id/validate', (req, res) => productController.validateProduct(req, res));

  // ===== Offer Routes =====
  router.get('/offers', (req, res) => offerController.getOfferList(req, res));
  router.get('/offers/expiring', (req, res) => offerController.getExpiringOffers(req, res));
  router.get('/offers/:id', (req, res) => offerController.getOfferDetail(req, res));
  router.post('/offers', (req, res) => offerController.createOffer(req, res));
  router.patch('/offers/:id/status', (req, res) => offerController.updateOfferStatus(req, res));

  // ===== Order Routes =====
  router.get('/orders', (req, res) => orderController.getOrderList(req, res));
  router.get('/orders/:id', (req, res) => orderController.getOrderDetail(req, res));
  router.post('/orders', (req, res) => orderController.createOrder(req, res));
  router.patch('/orders/:id/status', (req, res) => orderController.updateOrderStatus(req, res));
  router.get('/orders/seller/:sellerId/summary', (req, res) =>
    orderController.getSellerOrderSummary(req, res),
  );

  // ===== Settlement Routes =====
  router.get('/settlements', (req, res) => settlementController.getSettlementList(req, res));
  router.get('/settlements/:id', (req, res) => settlementController.getSettlementDetail(req, res));
  router.post('/settlements', (req, res) => settlementController.createSettlement(req, res));
  router.post('/settlements/:id/process', (req, res) =>
    settlementController.processSettlement(req, res),
  );
  router.get('/settlements/seller/:sellerId/summary', (req, res) =>
    settlementController.getSellerSettlementSummary(req, res),
  );
  router.get('/settlements/supplier/:supplierId/summary', (req, res) =>
    settlementController.getSupplierSettlementSummary(req, res),
  );

  return router;
}

export default createRoutes;
