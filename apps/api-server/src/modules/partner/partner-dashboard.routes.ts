/**
 * Partner Dashboard API v1 Routes
 *
 * WO-PARTNER-DASHBOARD-API-BE-IMPLEMENTATION-V1
 *
 * All routes:
 * - Require authentication
 * - Require partner role
 * - Use partner context guard
 *
 * Prefix: /api/v1/partner/*
 */

import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { partnerContextGuard } from './guards/partner-context.guard.js';
import { PartnerDashboardController } from './partner.controller.js';

const router: Router = Router();

// Apply guards to all routes
// 1. authenticate - ensures user is logged in
// 2. partnerContextGuard - ensures user has partner role and sets context
router.use(authenticate, partnerContextGuard);

/**
 * Overview API
 */
router.get('/overview', PartnerDashboardController.getOverview);

/**
 * Targets API (Read Only)
 */
router.get('/targets', PartnerDashboardController.getTargets);

/**
 * Content API
 */
router.get('/content', PartnerDashboardController.getContents);
router.post('/content', PartnerDashboardController.createContent);
router.patch('/content/:id', PartnerDashboardController.updateContent);

/**
 * Events API
 */
router.get('/events', PartnerDashboardController.getEvents);
router.post('/events', PartnerDashboardController.createEvent);
router.patch('/events/:id', PartnerDashboardController.updateEvent);

/**
 * Status API
 */
router.get('/status', PartnerDashboardController.getStatus);

export default router;
