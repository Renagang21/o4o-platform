/**
 * PartnerOps Backend Entry Point
 *
 * Partner-Core 기반 Express routes factory for Module Loader integration
 *
 * @package @o4o/partnerops
 */

import { Router, Request, Response, NextFunction } from 'express';
import { DataSource } from 'typeorm';
import {
  Partner,
  PartnerLink,
  PartnerClick,
  PartnerConversion,
  PartnerCommission,
  PartnerSettlementBatch,
  PartnerService,
} from '@o4o/partner-core';

// Services
import {
  createDashboardService,
  createProfileService,
  createRoutineService,
  createLinkService,
  createConversionService,
  createSettlementService,
} from '../services/index.js';
import type { PartnerRoutineEntity } from '../services/RoutineService.js';

// Controllers
import {
  DashboardController,
  ProfileController,
  RoutinesController,
  LinksController,
  ConversionsController,
  SettlementController,
} from '../controllers/index.js';

export interface PartnerOpsRouterOptions {
  dataSource: DataSource;
}

/**
 * Create Express routes for PartnerOps
 *
 * Used by Module Loader to integrate app routes
 */
export function createRoutes(options: PartnerOpsRouterOptions): Router {
  const router = Router();
  const { dataSource } = options;

  // Get Partner-Core repositories
  const partnerRepository = dataSource.getRepository(Partner);
  const linkRepository = dataSource.getRepository(PartnerLink);
  const clickRepository = dataSource.getRepository(PartnerClick);
  const conversionRepository = dataSource.getRepository(PartnerConversion);
  const commissionRepository = dataSource.getRepository(PartnerCommission);
  const settlementBatchRepository = dataSource.getRepository(PartnerSettlementBatch);

  // PartnerOps 전용 (Routine - Partner-Core 미포함)
  // Note: PartnerRoutine entity가 Partner-Core에 없으므로 별도 처리 필요
  // 임시로 더미 repository 사용 (향후 실제 entity 추가 필요)
  const routineRepository = dataSource.getRepository('PartnerRoutine') as any;

  // Initialize services using factory functions
  const dashboardService = createDashboardService(partnerRepository, {
    link: linkRepository,
    click: clickRepository,
    conversion: conversionRepository,
    commission: commissionRepository,
    settlement: settlementBatchRepository,
  });

  const profileService = createProfileService(partnerRepository);

  const routineService = createRoutineService(routineRepository, partnerRepository);

  const linkService = createLinkService(linkRepository, partnerRepository);

  const conversionService = createConversionService(
    conversionRepository,
    clickRepository,
    linkRepository,
    partnerRepository
  );

  const settlementService = createSettlementService(
    settlementBatchRepository,
    commissionRepository,
    partnerRepository
  );

  // Initialize controllers
  const dashboardController = new DashboardController(dashboardService);
  const profileController = new ProfileController(profileService);
  const routinesController = new RoutinesController(routineService);
  const linksController = new LinksController(linkService);
  const conversionsController = new ConversionsController(conversionService);
  const settlementController = new SettlementController(settlementService);

  // Partner-Core 기반 PartnerService for middleware
  const partnerService = new PartnerService(partnerRepository);

  // Middleware to extract partner ID from user
  const extractPartnerId = async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).user?.id;

    if (userId) {
      try {
        const partner = await partnerService.findByUserId(userId);
        (req as any).partnerId = partner?.id;
      } catch (error) {
        console.error('Error extracting partner ID:', error);
      }
    }
    next();
  };

  // Apply middleware
  router.use(extractPartnerId);

  // Dashboard routes
  router.get('/dashboard/summary', (req, res) => dashboardController.getSummary(req, res));
  router.get('/dashboard/stats', (req, res) => dashboardController.getStatsByPeriod(req, res));

  // Profile routes
  router.get('/profile', (req, res) => profileController.getProfile(req, res));
  router.put('/profile', (req, res) => profileController.updateProfile(req, res));
  router.post('/profile/apply', (req, res) => profileController.applyAsPartner(req, res));
  router.get('/profile/level', (req, res) => profileController.getLevelInfo(req, res));

  // Routines routes
  router.get('/routines', (req, res) => routinesController.list(req, res));
  router.get('/routines/:id', (req, res) => routinesController.getById(req, res));
  router.post('/routines', (req, res) => routinesController.create(req, res));
  router.put('/routines/:id', (req, res) => routinesController.update(req, res));
  router.delete('/routines/:id', (req, res) => routinesController.delete(req, res));
  router.post('/routines/:id/publish', (req, res) => routinesController.publish(req, res));
  router.post('/routines/:id/archive', (req, res) => routinesController.archive(req, res));

  // Links routes
  router.get('/links', (req, res) => linksController.list(req, res));
  router.get('/links/summary', (req, res) => linksController.getSummary(req, res));
  router.post('/links', (req, res) => linksController.create(req, res));
  router.get('/links/:id/stats', (req, res) => linksController.getStats(req, res));
  router.delete('/links/:id', (req, res) => linksController.delete(req, res));

  // Conversions routes
  router.get('/conversions', (req, res) => conversionsController.list(req, res));
  router.get('/conversions/summary', (req, res) => conversionsController.getSummary(req, res));
  router.get('/conversions/funnel', (req, res) => conversionsController.getFunnel(req, res));
  router.get('/conversions/:id', (req, res) => conversionsController.getById(req, res));

  // Settlement routes
  router.get('/settlement/summary', (req, res) => settlementController.getSummary(req, res));
  router.get('/settlement/batches', (req, res) => settlementController.getBatches(req, res));
  router.get('/settlement/batches/:id', (req, res) => settlementController.getBatchById(req, res));

  return router;
}

// Re-export for module loader
export * from '../services/index.js';
export * from '../controllers/index.js';
export * from '../dto/index.js';

export default { createRoutes };
