/**
 * Cosmetics Partner Extension Backend
 *
 * 화장품 파트너 확장 기능 백엔드 모듈
 * - Phase 6-D: Commission Policy System 추가
 */

import { Router } from 'express';
import { DataSource } from 'typeorm';
import { createPartnerExtensionRoutes } from './routes/partner-extension.routes.js';

// Entities
export * from './entities/index.js';

// Import entities for Module Loader
import { PartnerProfile } from './entities/partner-profile.entity.js';
import { PartnerLink } from './entities/partner-link.entity.js';
import { PartnerRoutine } from './entities/partner-routine.entity.js';
import { PartnerEarnings } from './entities/partner-earnings.entity.js';
import { CommissionPolicy } from './entities/commission-policy.entity.js';

// Services
export * from './services/index.js';

// Controllers
export * from './controllers/index.js';

// Routes
export * from './routes/index.js';

/**
 * Routes factory compatible with Module Loader
 *
 * Returns a configured router for cosmetics-partner endpoints
 *
 * @param dataSource - TypeORM DataSource from API server
 */
export function routes(dataSource?: DataSource | any): Router {
  if (!dataSource) {
    throw new Error('DataSource is required for cosmetics-partner-extension routes');
  }

  // Get repositories from dataSource
  const profileRepository = dataSource.getRepository(PartnerProfile);
  const linkRepository = dataSource.getRepository(PartnerLink);
  const routineRepository = dataSource.getRepository(PartnerRoutine);
  const earningsRepository = dataSource.getRepository(PartnerEarnings);

  // CommissionPolicy repository (Phase 6-D)
  let policyRepository;
  try {
    policyRepository = dataSource.getRepository(CommissionPolicy);
  } catch (error) {
    console.warn('[cosmetics-partner-extension] CommissionPolicy entity not registered, commission features disabled');
  }

  // Create routes with dependencies
  return createPartnerExtensionRoutes({
    profileRepository,
    linkRepository,
    routineRepository,
    earningsRepository,
    dataSource,
  });
}

// Alias for createRoutes pattern
export const createRoutes = routes;

/**
 * Entity list for TypeORM registration
 */
export const entities = [
  PartnerProfile,
  PartnerLink,
  PartnerRoutine,
  PartnerEarnings,
  CommissionPolicy,
];

/**
 * Services registry
 */
export const services = {};
