/**
 * GlucoseView Routes
 *
 * Phase C-1: GlucoseView API Implementation
 * Phase C-2: Customer Management
 * Phase C-3: Pharmacist Membership System
 * Route factory for GlucoseView API endpoints
 */

import { Router, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import { createGlucoseViewController } from './controllers/glucoseview.controller.js';
import { createCustomerController } from './controllers/customer.controller.js';
import { createBranchController } from './controllers/branch.controller.js';
import { createPharmacistController } from './controllers/pharmacist.controller.js';
import { createGlucoseViewApplicationController } from './controllers/application.controller.js';
import { createGlucoseViewPharmacyController } from './controllers/pharmacy.controller.js';
import { requireAuth as coreRequireAuth } from '../../middleware/auth.middleware.js';
import { GlucoseViewPharmacist } from './entities/index.js';

/**
 * Scope verification middleware factory for GlucoseView
 */
function requireGlucoseViewScope(scope: string): RequestHandler {
  return (req, res, next) => {
    const user = (req as any).user;

    // Allow super_admin to bypass scope checks
    if (user?.roles?.includes('super_admin') || user?.role === 'super_admin') {
      return next();
    }

    // Check for admin role
    if (user?.roles?.includes('admin') || user?.role === 'admin') {
      return next();
    }

    // Check for specific scope
    const userScopes = user?.scopes || [];
    if (userScopes.includes(scope) || userScopes.includes('glucoseview:admin')) {
      return next();
    }

    res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: `Missing required scope: ${scope}`,
      },
    });
  };
}

/**
 * GlucoseView Admin middleware factory
 * Checks if user is a GlucoseView admin (pharmacist with admin role)
 */
function createRequireGlucoseViewAdmin(dataSource: DataSource): RequestHandler {
  return async (req, res, next) => {
    const user = (req as any).user;

    if (!user?.id) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: '인증이 필요합니다.',
        },
      });
      return;
    }

    // Allow super_admin to bypass
    if (user?.roles?.includes('super_admin') || user?.role === 'super_admin') {
      return next();
    }

    // Check GlucoseView pharmacist admin role
    try {
      const pharmacistRepo = dataSource.getRepository(GlucoseViewPharmacist);
      const pharmacist = await pharmacistRepo.findOne({
        where: { user_id: user.id },
      });

      if (pharmacist?.role === 'admin' && pharmacist?.approval_status === 'approved') {
        return next();
      }

      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: '관리자 권한이 필요합니다.',
        },
      });
    } catch (error) {
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: '권한 확인 중 오류가 발생했습니다.',
        },
      });
    }
  };
}

/**
 * Create GlucoseView routes
 *
 * @param dataSource - TypeORM DataSource
 * @returns Express Router with all GlucoseView routes mounted
 */
export function createGlucoseViewRoutes(dataSource: DataSource): Router {
  const router = Router();

  // Create admin middleware
  const requireGlucoseViewAdmin = createRequireGlucoseViewAdmin(dataSource);

  // Create controller with middleware
  const glucoseviewController = createGlucoseViewController(
    dataSource,
    coreRequireAuth as any,
    requireGlucoseViewScope
  );

  // Customer controller (Phase C-2)
  const customerController = createCustomerController(
    dataSource,
    coreRequireAuth as any
  );

  // Branch controller (Phase C-3) - 공개 API
  const branchController = createBranchController(dataSource);

  // Pharmacist controller (Phase C-3)
  const pharmacistController = createPharmacistController(
    dataSource,
    coreRequireAuth as any,
    requireGlucoseViewAdmin
  );

  // Application controller (Phase C-4)
  const applicationController = createGlucoseViewApplicationController(
    dataSource,
    coreRequireAuth as any
  );

  // Pharmacy controller (Phase C-4)
  const pharmacyController = createGlucoseViewPharmacyController(
    dataSource,
    coreRequireAuth as any
  );

  // Mount routes
  router.use('/', glucoseviewController);
  router.use('/customers', customerController);
  router.use('/', branchController); // /branches, /chapters
  router.use('/pharmacists', pharmacistController);
  router.use('/applications', applicationController);
  router.use('/pharmacies', pharmacyController);

  return router;
}
