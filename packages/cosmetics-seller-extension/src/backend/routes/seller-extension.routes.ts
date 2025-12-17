/**
 * Cosmetics Seller Extension Routes
 *
 * 판매원 확장 기능 API 라우트 정의
 */

import { Router } from 'express';
import type { Repository } from 'typeorm';

// Entities
import { SellerDisplay } from '../entities/seller-display.entity.js';
import { SellerSample } from '../entities/seller-sample.entity.js';
import { SellerInventory } from '../entities/seller-inventory.entity.js';
import { SellerConsultationLog } from '../entities/seller-consultation-log.entity.js';
import { SellerKPI } from '../entities/seller-kpi.entity.js';

// Services
import { DisplayService } from '../services/display.service.js';
import { SampleService } from '../services/sample.service.js';
import { InventoryService } from '../services/inventory.service.js';
import { ConsultationLogService } from '../services/consultation-log.service.js';
import { KPIService } from '../services/kpi.service.js';

// Controllers
import { DisplayController } from '../controllers/display.controller.js';
import { SampleController } from '../controllers/sample.controller.js';
import { InventoryController } from '../controllers/inventory.controller.js';
import { ConsultationController } from '../controllers/consultation.controller.js';
import { KPIController } from '../controllers/kpi.controller.js';

export interface SellerExtensionRoutesDeps {
  displayRepository: Repository<SellerDisplay>;
  sampleRepository: Repository<SellerSample>;
  inventoryRepository: Repository<SellerInventory>;
  consultationRepository: Repository<SellerConsultationLog>;
  kpiRepository: Repository<SellerKPI>;
}

export function createSellerExtensionRoutes(deps: SellerExtensionRoutesDeps): Router {
  const router = Router();

  // Initialize Services
  const displayService = new DisplayService(deps.displayRepository);
  const sampleService = new SampleService(deps.sampleRepository);
  const inventoryService = new InventoryService(deps.inventoryRepository);
  const consultationService = new ConsultationLogService(deps.consultationRepository);
  const kpiService = new KPIService(deps.kpiRepository, consultationService);

  // Initialize Controllers
  const displayController = new DisplayController(displayService);
  const sampleController = new SampleController(sampleService);
  const inventoryController = new InventoryController(inventoryService);
  const consultationController = new ConsultationController(consultationService);
  const kpiController = new KPIController(kpiService);

  // ===================
  // Display Routes
  // ===================
  router.post('/display', (req, res) => displayController.create(req, res));
  router.get('/display/:id', (req, res) => displayController.findById(req, res));
  router.get('/display/seller/:sellerId', (req, res) => displayController.findBySellerId(req, res));
  router.put('/display/:id', (req, res) => displayController.update(req, res));
  router.get('/display/seller/:sellerId/stats', (req, res) => displayController.getStats(req, res));
  router.delete('/display/:id', (req, res) => displayController.delete(req, res));

  // ===================
  // Sample Routes
  // ===================
  router.post('/sample', (req, res) => sampleController.create(req, res));
  router.get('/sample/:id', (req, res) => sampleController.findById(req, res));
  router.get('/sample/seller/:sellerId', (req, res) => sampleController.findBySellerId(req, res));
  router.post('/sample/:id/refill', (req, res) => sampleController.refillSample(req, res));
  router.post('/sample/:id/use', (req, res) => sampleController.useSample(req, res));
  router.get('/sample/seller/:sellerId/low-stock', (req, res) => sampleController.getLowStock(req, res));
  router.get('/sample/seller/:sellerId/stats', (req, res) => sampleController.getStats(req, res));
  router.delete('/sample/:id', (req, res) => sampleController.delete(req, res));

  // ===================
  // Inventory Routes
  // ===================
  router.post('/inventory', (req, res) => inventoryController.create(req, res));
  router.get('/inventory/:id', (req, res) => inventoryController.findById(req, res));
  router.get('/inventory/seller/:sellerId', (req, res) => inventoryController.findBySellerId(req, res));
  router.post('/inventory/:id/adjust', (req, res) => inventoryController.adjustStock(req, res));
  router.get('/inventory/seller/:sellerId/low-stock', (req, res) => inventoryController.getLowStock(req, res));
  router.get('/inventory/seller/:sellerId/stats', (req, res) => inventoryController.getStats(req, res));
  router.post('/inventory/seller/:sellerId/bulk-restock', (req, res) => inventoryController.bulkRestock(req, res));
  router.delete('/inventory/:id', (req, res) => inventoryController.delete(req, res));

  // ===================
  // Consultation Routes
  // ===================
  router.post('/consultation', (req, res) => consultationController.create(req, res));
  router.get('/consultation/:id', (req, res) => consultationController.findById(req, res));
  router.get('/consultation/seller/:sellerId', (req, res) => consultationController.findBySellerId(req, res));
  router.get('/consultation/session/:sessionId', (req, res) => consultationController.findByWorkflowSession(req, res));
  router.put('/consultation/:id', (req, res) => consultationController.update(req, res));
  router.post('/consultation/:id/complete', (req, res) => consultationController.complete(req, res));
  router.get('/consultation/seller/:sellerId/stats', (req, res) => consultationController.getStats(req, res));
  router.get('/consultation/seller/:sellerId/recent', (req, res) => consultationController.getRecent(req, res));
  router.delete('/consultation/:id', (req, res) => consultationController.delete(req, res));

  // ===================
  // KPI Routes
  // ===================
  router.post('/kpi', (req, res) => kpiController.create(req, res));
  router.get('/kpi/:id', (req, res) => kpiController.findById(req, res));
  router.get('/kpi/seller/:sellerId', (req, res) => kpiController.findBySellerId(req, res));
  router.get('/kpi/seller/:sellerId/summary', (req, res) => kpiController.getSummary(req, res));
  router.post('/kpi/seller/:sellerId/compute/daily', (req, res) => kpiController.computeDaily(req, res));
  router.post('/kpi/seller/:sellerId/compute/weekly', (req, res) => kpiController.computeWeekly(req, res));
  router.post('/kpi/seller/:sellerId/compute/monthly', (req, res) => kpiController.computeMonthly(req, res));
  router.delete('/kpi/:id', (req, res) => kpiController.delete(req, res));

  return router;
}

export default createSellerExtensionRoutes;
