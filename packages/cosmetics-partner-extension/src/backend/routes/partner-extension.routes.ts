/**
 * Cosmetics Partner Extension Routes
 *
 * 파트너 확장 기능 API 라우트 정의
 *
 * Phase 10: Security hardening
 * - Partner authentication required for protected routes
 * - partnerId extracted from authenticated user, not URL params
 */

import { Router } from 'express';
import type { Repository, DataSource } from 'typeorm';

// Entities
import { PartnerProfile } from '../entities/partner-profile.entity.js';
import { PartnerLink } from '../entities/partner-link.entity.js';
import { PartnerRoutine } from '../entities/partner-routine.entity.js';
import { PartnerEarnings } from '../entities/partner-earnings.entity.js';

// Services
import { PartnerProfileService } from '../services/partner-profile.service.js';
import { PartnerLinkService } from '../services/partner-link.service.js';
import { PartnerRoutineService } from '../services/partner-routine.service.js';
import { PartnerEarningsService } from '../services/partner-earnings.service.js';
import { AIRoutineService } from '../services/ai-routine.service.js';
import { AIDescriptionService } from '../services/ai-description.service.js';
import { PartnerStorefrontService } from '../services/partner-storefront.service.js';
import { QRLandingService } from '../services/qr-landing.service.js';
import { SocialShareService } from '../services/social-share.service.js';
import { CampaignPublisherService } from '../services/campaign-publisher.service.js';

// Controllers
import { PartnerProfileController } from '../controllers/partner-profile.controller.js';
import { PartnerLinkController } from '../controllers/partner-link.controller.js';
import { PartnerRoutineController } from '../controllers/partner-routine.controller.js';
import { PartnerEarningsController } from '../controllers/partner-earnings.controller.js';
import { AIRoutineController } from '../controllers/ai-routine.controller.js';
import { AIDescriptionController } from '../controllers/ai-description.controller.js';
import { PartnerStorefrontController } from '../controllers/partner-storefront.controller.js';
import { QRLandingController } from '../controllers/qr-landing.controller.js';
import { SocialShareController } from '../controllers/social-share.controller.js';
import { CampaignPublisherController } from '../controllers/campaign-publisher.controller.js';

// Middleware (Phase 10)
import { createRequirePartnerAuth, type PartnerAuthenticatedRequest } from '../middleware/partner-auth.middleware.js';

export interface PartnerExtensionRoutesDeps {
  profileRepository: Repository<PartnerProfile>;
  linkRepository: Repository<PartnerLink>;
  routineRepository: Repository<PartnerRoutine>;
  earningsRepository: Repository<PartnerEarnings>;
  dataSource: DataSource;
}

export function createPartnerExtensionRoutes(deps: PartnerExtensionRoutesDeps): Router {
  const router = Router();

  // Initialize Services
  const profileService = new PartnerProfileService(deps.profileRepository);
  const linkService = new PartnerLinkService(deps.linkRepository);
  const routineService = new PartnerRoutineService(deps.routineRepository);
  const earningsService = new PartnerEarningsService(deps.earningsRepository);
  const aiRoutineService = new AIRoutineService(deps.dataSource);
  const aiDescriptionService = new AIDescriptionService(deps.dataSource);
  const storefrontService = new PartnerStorefrontService(deps.dataSource);
  const qrLandingService = new QRLandingService(deps.dataSource);
  const socialShareService = new SocialShareService(deps.dataSource);
  const campaignService = new CampaignPublisherService(deps.dataSource);

  // Initialize Controllers
  const profileController = new PartnerProfileController(profileService);
  const linkController = new PartnerLinkController(linkService);
  const routineController = new PartnerRoutineController(routineService);
  const earningsController = new PartnerEarningsController(earningsService);
  const aiRoutineController = new AIRoutineController(aiRoutineService);
  const aiDescriptionController = new AIDescriptionController(aiDescriptionService);
  const storefrontController = new PartnerStorefrontController(storefrontService);
  const qrLandingController = new QRLandingController(qrLandingService);
  const socialShareController = new SocialShareController(socialShareService);
  const campaignController = new CampaignPublisherController(campaignService);

  // Phase 10: Create authentication middleware
  const requirePartnerAuth = createRequirePartnerAuth(deps.profileRepository);

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
  // Earnings Routes (Phase 10: Security hardened)
  // ===================
  // Partner-authenticated routes: partnerId from req.partnerId, not URL
  router.get('/earnings/my', requirePartnerAuth, (req, res) =>
    earningsController.findByPartnerId(req as PartnerAuthenticatedRequest, res)
  );
  router.get('/earnings/my/summary', requirePartnerAuth, (req, res) =>
    earningsController.getSummary(req as PartnerAuthenticatedRequest, res)
  );
  router.get('/earnings/my/balance', requirePartnerAuth, (req, res) =>
    earningsController.getAvailableBalance(req as PartnerAuthenticatedRequest, res)
  );
  router.post('/earnings/my/withdraw', requirePartnerAuth, (req, res) =>
    earningsController.requestWithdrawal(req as PartnerAuthenticatedRequest, res)
  );

  // Individual earnings access (ownership verified in controller)
  router.get('/earnings/:id', requirePartnerAuth, (req, res) =>
    earningsController.findById(req as PartnerAuthenticatedRequest, res)
  );

  // Admin-only routes
  router.post('/earnings', requirePartnerAuth, (req, res) => earningsController.create(req, res));
  router.post('/earnings/record', requirePartnerAuth, (req, res) => earningsController.recordCommission(req, res));
  router.get('/earnings/filter/all', requirePartnerAuth, (req, res) => earningsController.findByFilter(req, res));
  router.put('/earnings/:id', requirePartnerAuth, (req, res) => earningsController.update(req, res));
  router.post('/earnings/:id/approve', requirePartnerAuth, (req, res) => earningsController.approve(req, res));
  router.post('/earnings/approve-batch', requirePartnerAuth, (req, res) => earningsController.approveBatch(req, res));
  router.get('/earnings/pending/all', requirePartnerAuth, (req, res) => earningsController.getPendingApprovals(req, res));
  router.delete('/earnings/:id', requirePartnerAuth, (req, res) => earningsController.delete(req, res));

  // Legacy routes (deprecated, kept for backward compatibility)
  // TODO: Remove after frontend migration
  router.get('/earnings/partner/:partnerId', requirePartnerAuth, (req, res) => earningsController.findByPartnerId(req, res));
  router.get('/earnings/partner/:partnerId/summary', requirePartnerAuth, (req, res) => earningsController.getSummary(req, res));
  router.post('/earnings/partner/:partnerId/withdraw', requirePartnerAuth, (req, res) => earningsController.requestWithdrawal(req, res));

  // ===================
  // AI Routes (Phase 6-F)
  // ===================
  router.post('/ai/routine', (req, res) => aiRoutineController.generateRoutine(req, res));
  router.get('/ai/routine/templates', (req, res) => aiRoutineController.getTemplates(req, res));
  router.post('/ai/description', (req, res) => aiDescriptionController.generateDescription(req, res));
  router.get('/ai/description/tones', (req, res) => aiDescriptionController.getTones(req, res));
  router.get('/ai/description/platforms', (req, res) => aiDescriptionController.getPlatforms(req, res));

  // ===================
  // Storefront Routes (Phase 6-F)
  // ===================
  router.get('/storefront/themes', (req, res) => storefrontController.getThemes(req, res));
  router.get('/storefront/layouts', (req, res) => storefrontController.getLayouts(req, res));
  router.get('/storefront/:slug', (req, res) => storefrontController.getBySlug(req, res));
  router.put('/storefront/:partnerId/config', (req, res) => storefrontController.updateConfig(req, res));
  router.get('/storefront/:partnerId/preview', (req, res) => storefrontController.getPreview(req, res));

  // ===================
  // QR/Landing Routes (Phase 6-F)
  // ===================
  router.post('/qr/generate', (req, res) => qrLandingController.generateQR(req, res));
  router.get('/qr/styles', (req, res) => qrLandingController.getStyles(req, res));
  router.get('/qr/sizes', (req, res) => qrLandingController.getSizes(req, res));
  router.post('/shortlink', (req, res) => qrLandingController.createShortLink(req, res));
  router.get('/landing/:slug', (req, res) => qrLandingController.getLandingPage(req, res));

  // ===================
  // Social Share Routes (Phase 6-F)
  // ===================
  router.post('/social/generate', (req, res) => socialShareController.generateContent(req, res));
  router.get('/social/platforms', (req, res) => socialShareController.getPlatforms(req, res));
  router.get('/social/:partnerId/analytics', (req, res) => socialShareController.getAnalytics(req, res));

  // ===================
  // Campaign Routes (Phase 6-F)
  // ===================
  router.get('/campaign/templates', (req, res) => campaignController.getTemplates(req, res));
  router.post('/campaign', (req, res) => campaignController.create(req, res));
  router.post('/campaign/from-template', (req, res) => campaignController.createFromTemplate(req, res));
  router.get('/campaign/partner/:partnerId', (req, res) => campaignController.getByPartner(req, res));
  router.get('/campaign/:id', (req, res) => campaignController.getById(req, res));
  router.put('/campaign/:id', (req, res) => campaignController.update(req, res));
  router.delete('/campaign/:id', (req, res) => campaignController.delete(req, res));
  router.post('/campaign/:id/publish', (req, res) => campaignController.publish(req, res));
  router.post('/campaign/:id/pause', (req, res) => campaignController.pause(req, res));
  router.post('/campaign/:id/generate-content', (req, res) => campaignController.generateContent(req, res));
  router.get('/campaign/:id/analytics', (req, res) => campaignController.getAnalytics(req, res));

  return router;
}

export default createPartnerExtensionRoutes;
