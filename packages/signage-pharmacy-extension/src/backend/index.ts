/**
 * Pharmacy Signage Extension Backend
 *
 * Exports backend services, controllers, and routes.
 */

import { Router } from 'express';
import { PharmacySignageService } from './services/pharmacy-signage.service.js';
import { createPharmacySignageController } from './controllers/pharmacy-signage.controller.js';

// Re-export all
export * from './services/index.js';
export * from './controllers/index.js';
export * from './dto/index.js';

// Route factory
export interface CreateRoutesOptions {
  apiBaseUrl: string;
  organizationId: string;
}

export function createRoutes(options: CreateRoutesOptions): Router {
  const router = Router();

  const service = new PharmacySignageService({
    apiBaseUrl: options.apiBaseUrl,
    organizationId: options.organizationId,
  });

  router.use('/', createPharmacySignageController(service));

  return router;
}
