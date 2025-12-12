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
  const linkController = new PartnerLinkController(linkService, profileService);
  const routineController = new PartnerRoutineController(routineService, profileService);
  const earningsController = new PartnerEarningsController(earningsService, profileService);

  // ===================
  // Profile Routes
  // ===================
  router.post('/profile', (req, res) => profileController.create(req, res));
  router.get('/profile/me', (req, res) => profileController.getMyProfile(req, res));
  router.get('/profile/:id', (req, res) => profileController.findById(req, res));
  router.get('/profile/code/:referralCode', (req, res) => profileController.findByReferralCode(req, res));
  router.put('/profile', (req, res) => profileController.updateMyProfile(req, res));
  router.get('/profiles', (req, res) => profileController.findAll(req, res));
  router.put('/profile/:id/status', (req, res) => profileController.updateStatus(req, res));
  router.delete('/profile/:id', (req, res) => profileController.delete(req, res));

  // ===================
  // Link Routes
  // ===================
  router.post('/links', (req, res) => linkController.create(req, res));
  router.get('/links', (req, res) => linkController.getMyLinks(req, res));
  router.get('/links/stats', (req, res) => linkController.getMyStats(req, res));
  router.get('/links/:id', (req, res) => linkController.findById(req, res));
  router.get('/links/slug/:slug', (req, res) => linkController.findBySlug(req, res));
  router.put('/links/:id', (req, res) => linkController.update(req, res));
  router.post('/links/:id/click', (req, res) => linkController.trackClick(req, res));
  router.post('/links/:id/convert', (req, res) => linkController.recordConversion(req, res));
  router.delete('/links/:id', (req, res) => linkController.delete(req, res));

  // ===================
  // Routine Routes
  // ===================
  router.post('/routines', (req, res) => routineController.create(req, res));
  router.get('/routines', (req, res) => routineController.getMyRoutines(req, res));
  router.get('/routines/public', (req, res) => routineController.getPublicRoutines(req, res));
  router.get('/routines/stats', (req, res) => routineController.getMyStats(req, res));
  router.get('/routines/:id', (req, res) => routineController.findById(req, res));
  router.put('/routines/:id', (req, res) => routineController.update(req, res));
  router.post('/routines/:id/publish', (req, res) => routineController.publish(req, res));
  router.post('/routines/:id/unpublish', (req, res) => routineController.unpublish(req, res));
  router.post('/routines/:id/like', (req, res) => routineController.like(req, res));
  router.post('/routines/:id/save', (req, res) => routineController.save(req, res));
  router.delete('/routines/:id', (req, res) => routineController.delete(req, res));

  // ===================
  // Earnings Routes
  // ===================
  router.get('/earnings', (req, res) => earningsController.getMyEarnings(req, res));
  router.get('/earnings/summary', (req, res) => earningsController.getMySummary(req, res));
  router.get('/earnings/monthly', (req, res) => earningsController.getMonthlyStats(req, res));
  router.post('/earnings/log-conversion', (req, res) => earningsController.logConversion(req, res));
  router.post('/earnings/:id/make-available', (req, res) => earningsController.makeAvailable(req, res));
  router.post('/earnings/make-available-batch', (req, res) => earningsController.makeAvailableBatch(req, res));
  router.post('/earnings/withdraw', (req, res) => earningsController.requestWithdrawal(req, res));
  router.post('/earnings/:id/cancel', (req, res) => earningsController.cancel(req, res));

  return router;
}

export default createPartnerExtensionRoutes;
