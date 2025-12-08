/**
 * PartnerOps Backend Entry Point
 *
 * Provides Express routes factory for Module Loader integration
 */

import { Router, Request, Response } from 'express';
import { DataSource } from 'typeorm';

// Services
import { DashboardService } from '../services/DashboardService';
import { ProfileService } from '../services/ProfileService';
import { RoutineService } from '../services/RoutineService';
import { LinkService } from '../services/LinkService';
import { ConversionService } from '../services/ConversionService';
import { SettlementService } from '../services/SettlementService';

// Controllers
import { DashboardController } from '../controllers/dashboard.controller';
import { ProfileController } from '../controllers/profile.controller';
import { RoutinesController } from '../controllers/routines.controller';
import { LinksController } from '../controllers/links.controller';
import { ConversionsController } from '../controllers/conversions.controller';
import { SettlementController } from '../controllers/settlement.controller';

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

  // Initialize services
  const dashboardService = new DashboardService(dataSource);
  const profileService = new ProfileService(dataSource);
  const routineService = new RoutineService(dataSource);
  const linkService = new LinkService(dataSource);
  const conversionService = new ConversionService(dataSource);
  const settlementService = new SettlementService(dataSource);

  // Initialize controllers
  const dashboardController = new DashboardController(dashboardService);
  const profileController = new ProfileController(profileService);
  const routinesController = new RoutinesController(routineService);
  const linksController = new LinksController(linkService);
  const conversionsController = new ConversionsController(conversionService);
  const settlementController = new SettlementController(settlementService);

  // Middleware to extract partner ID from user
  const extractPartnerId = async (req: Request, res: Response, next: Function) => {
    const userId = (req as any).user?.id;
    const tenantId = req.headers['x-tenant-id'] as string || 'default';

    if (userId) {
      const result = await dataSource.query(
        `SELECT id FROM partnerops_partners WHERE user_id = $1 AND tenant_id = $2`,
        [userId, tenantId]
      );
      (req as any).partnerId = result[0]?.id;
    }
    next();
  };

  // Apply middleware
  router.use(extractPartnerId);

  // Dashboard routes
  router.get('/dashboard/summary', (req, res) => dashboardController.getSummary(req, res));

  // Profile routes
  router.get('/profile', (req, res) => profileController.getProfile(req, res));
  router.put('/profile', (req, res) => profileController.updateProfile(req, res));
  router.post('/profile/apply', (req, res) => profileController.applyAsPartner(req, res));

  // Routines routes
  router.get('/routines', (req, res) => routinesController.list(req, res));
  router.get('/routines/:id', (req, res) => routinesController.getById(req, res));
  router.post('/routines', (req, res) => routinesController.create(req, res));
  router.put('/routines/:id', (req, res) => routinesController.update(req, res));
  router.delete('/routines/:id', (req, res) => routinesController.delete(req, res));

  // Links routes
  router.get('/links', (req, res) => linksController.list(req, res));
  router.post('/links', (req, res) => linksController.create(req, res));
  router.get('/links/:id/stats', (req, res) => linksController.getStats(req, res));
  router.delete('/links/:id', (req, res) => linksController.delete(req, res));

  // Conversions routes
  router.get('/conversions', (req, res) => conversionsController.list(req, res));
  router.get('/conversions/summary', (req, res) => conversionsController.getSummary(req, res));
  router.get('/conversions/funnel', (req, res) => conversionsController.getFunnel(req, res));

  // Settlement routes
  router.get('/settlement/summary', (req, res) => settlementController.getSummary(req, res));
  router.get('/settlement/batches', (req, res) => settlementController.getBatches(req, res));
  router.get('/settlement/transactions', (req, res) => settlementController.getTransactions(req, res));

  return router;
}

export default { createRoutes };
