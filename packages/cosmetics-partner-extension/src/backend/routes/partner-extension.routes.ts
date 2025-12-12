/**
 * Cosmetics Partner Extension Routes
 *
 * 파트너 확장 기능 API 라우트 정의
 */

import { Router } from 'express';
import type { Repository } from 'typeorm';

// Entities
import { PartnerProfile } from '../entities/partner-profile.entity';
import { PartnerLink } from '../entities/partner-link.entity';
import { PartnerRoutine } from '../entities/partner-routine.entity';
import { PartnerEarnings } from '../entities/partner-earnings.entity';

// Services
import { PartnerProfileService } from '../services/partner-profile.service';
import { PartnerLinkService } from '../services/partner-link.service';
import { PartnerRoutineService } from '../services/partner-routine.service';
import { PartnerEarningsService } from '../services/partner-earnings.service';

// Controllers
import { PartnerProfileController } from '../controllers/partner-profile.controller';
import { PartnerLinkController } from '../controllers/partner-link.controller';
import { PartnerRoutineController } from '../controllers/partner-routine.controller';
import { PartnerEarningsController } from '../controllers/partner-earnings.controller';

export interface PartnerExtensionRoutesDeps {
  profileRepository: Repository<PartnerProfile>;
  linkRepository: Repository<PartnerLink>;
  routineRepository: Repository<PartnerRoutine>;
  earningsRepository: Repository<PartnerEarnings>;
}

export function createPartnerExtensionRoutes(deps: PartnerExtensionRoutesDeps): Router {
  const router = Router();

  // Initialize Services
  const profileService = new PartnerProfileService(deps.profileRepository);
  const linkService = new PartnerLinkService(deps.linkRepository);
  const routineService = new PartnerRoutineService(deps.routineRepository);
  const earningsService = new PartnerEarningsService(deps.earningsRepository);

  // Initialize Controllers
  const profileController = new PartnerProfileController(profileService);
  const linkController = new PartnerLinkController(linkService);
  const routineController = new PartnerRoutineController(routineService);
  const earningsController = new PartnerEarningsController(earningsService);

  // ===================
  // Profile Routes
  // ===================
  router.post('/profile', (req, res) => profileController.create(req, res));
  router.get('/profile/:id', (req, res) => profileController.findById(req, res));
  router.get('/profile/user/:userId', (req, res) => profileController.findByUserId(req, res));
  router.get('/profile/code/:code', (req, res) => profileController.findByReferralCode(req, res));
  router.put('/profile/:id', (req, res) => profileController.update(req, res));
  router.put('/profile/:id/status', (req, res) => profileController.updateStatus(req, res));
  router.get('/profile/top/earners', (req, res) => profileController.getTopEarners(req, res));
  router.delete('/profile/:id', (req, res) => profileController.delete(req, res));

  // ===================
  // Link Routes
  // ===================
  router.post('/link', (req, res) => linkController.create(req, res));
  router.get('/link/:id', (req, res) => linkController.findById(req, res));
  router.get('/link/slug/:slug', (req, res) => linkController.findBySlug(req, res));
  router.get('/link/partner/:partnerId', (req, res) => linkController.findByPartnerId(req, res));
  router.put('/link/:id', (req, res) => linkController.update(req, res));
  router.post('/link/:id/click', (req, res) => linkController.trackClick(req, res));
  router.post('/link/:id/conversion', (req, res) => linkController.trackConversion(req, res));
  router.get('/link/partner/:partnerId/stats', (req, res) => linkController.getStats(req, res));
  router.get('/link/partner/:partnerId/top', (req, res) => linkController.getTopPerforming(req, res));
  router.delete('/link/:id', (req, res) => linkController.delete(req, res));

  // ===================
  // Routine Routes
  // ===================
  router.post('/routine', (req, res) => routineController.create(req, res));
  router.get('/routine/:id', (req, res) => routineController.findById(req, res));
  router.get('/routine/partner/:partnerId', (req, res) => routineController.findByPartnerId(req, res));
  router.get('/routine/public/all', (req, res) => routineController.findPublic(req, res));
  router.put('/routine/:id', (req, res) => routineController.update(req, res));
  router.post('/routine/:id/publish', (req, res) => routineController.publish(req, res));
  router.post('/routine/:id/unpublish', (req, res) => routineController.unpublish(req, res));
  router.post('/routine/:id/view', (req, res) => routineController.incrementView(req, res));
  router.post('/routine/:id/like', (req, res) => routineController.like(req, res));
  router.post('/routine/:id/unlike', (req, res) => routineController.unlike(req, res));
  router.get('/routine/partner/:partnerId/stats', (req, res) => routineController.getStats(req, res));
  router.get('/routine/trending/all', (req, res) => routineController.getTrending(req, res));
  router.delete('/routine/:id', (req, res) => routineController.delete(req, res));

  // ===================
  // Earnings Routes
  // ===================
  router.post('/earnings', (req, res) => earningsController.create(req, res));
  router.get('/earnings/:id', (req, res) => earningsController.findById(req, res));
  router.get('/earnings/partner/:partnerId', (req, res) => earningsController.findByPartnerId(req, res));
  router.get('/earnings/filter/all', (req, res) => earningsController.findByFilter(req, res));
  router.put('/earnings/:id', (req, res) => earningsController.update(req, res));
  router.post('/earnings/:id/approve', (req, res) => earningsController.approve(req, res));
  router.post('/earnings/partner/:partnerId/withdraw', (req, res) => earningsController.requestWithdrawal(req, res));
  router.get('/earnings/partner/:partnerId/summary', (req, res) => earningsController.getSummary(req, res));
  router.get('/earnings/pending/all', (req, res) => earningsController.getPendingApprovals(req, res));
  router.delete('/earnings/:id', (req, res) => earningsController.delete(req, res));

  return router;
}

export default createPartnerExtensionRoutes;
