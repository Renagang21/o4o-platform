/**
 * Supplier Onboarding Routes
 *
 * REST API routes for supplier onboarding management.
 * Phase R11: Supplier Onboarding System
 */

import { Router } from 'express';
import { SupplierOnboardingController } from '../controllers/SupplierOnboardingController.js';
import { initSupplierOnboardingService } from '../services/SupplierOnboardingService.js';
import type { DataSource } from 'typeorm';

export function createOnboardingRoutes(dataSource: DataSource): Router {
  const router = Router();
  const service = initSupplierOnboardingService(dataSource);
  const controller = new SupplierOnboardingController(service);

  // Get supplier profile
  router.get('/profile', (req, res) => controller.getProfile(req, res));

  // Update supplier profile
  router.post('/profile', (req, res) => controller.updateProfile(req, res));

  // Get onboarding checklist
  router.get('/checklist', (req, res) => controller.getChecklist(req, res));

  // Mark onboarding as complete
  router.post('/complete', (req, res) => controller.markComplete(req, res));

  // Track dashboard view
  router.post('/track-dashboard', (req, res) => controller.trackDashboardView(req, res));

  // Reset onboarding (for testing)
  router.post('/reset', (req, res) => controller.resetOnboarding(req, res));

  // List all supplier profiles (admin)
  router.get('/profiles', (req, res) => controller.listProfiles(req, res));

  return router;
}
