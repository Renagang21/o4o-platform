/**
 * GlucoseView Pharmacy Controller
 *
 * Phase C-4: GlucoseView Application Workflow
 * Handles pharmacy-level operations for GlucoseView service
 */

import { Router, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import { GlucoseViewPharmacy } from '../entities/glucoseview-pharmacy.entity.js';
import { GlucoseViewApplication } from '../entities/glucoseview-application.entity.js';
import logger from '../../../utils/logger.js';

interface AuthRequest extends Request {
  user?: {
    userId?: string;
    id?: string;
    email?: string;
    name?: string;
    roles?: string[];
    scopes?: string[];
  };
}

/**
 * Create Pharmacy Controller
 */
export function createGlucoseViewPharmacyController(
  dataSource: DataSource,
  requireAuth: RequestHandler
): Router {
  const router = Router();

  /**
   * GET /api/v1/glucoseview/pharmacies/me
   * Get current user's GlucoseView pharmacy info (if approved)
   */
  router.get(
    '/me',
    requireAuth,
    (async (req, res) => {
      try {
        const user = (req as unknown as AuthRequest).user;
        const userId = user?.userId || user?.id;

        if (!userId) {
          res.status(401).json({
            error: 'Unauthorized',
            code: 'UNAUTHORIZED',
          });
          return;
        }

        const pharmacyRepo = dataSource.getRepository(GlucoseViewPharmacy);

        // Find pharmacy for this user
        const pharmacy = await pharmacyRepo.findOne({
          where: { userId },
        });

        if (!pharmacy) {
          // Check if there's an approved application but no pharmacy yet
          const applicationRepo = dataSource.getRepository(GlucoseViewApplication);
          const approvedApp = await applicationRepo.findOne({
            where: { userId, status: 'approved' },
          });

          if (approvedApp) {
            res.json({
              success: true,
              pharmacy: null,
              application: {
                id: approvedApp.id,
                status: approvedApp.status,
                pharmacyName: approvedApp.pharmacyName,
                serviceTypes: approvedApp.serviceTypes,
                decidedAt: approvedApp.decidedAt,
              },
              message: 'Application approved, pharmacy setup pending',
            });
            return;
          }

          // Check for pending application
          const pendingApp = await applicationRepo.findOne({
            where: { userId, status: 'submitted' },
          });

          if (pendingApp) {
            res.json({
              success: true,
              pharmacy: null,
              application: {
                id: pendingApp.id,
                status: pendingApp.status,
                pharmacyName: pendingApp.pharmacyName,
                serviceTypes: pendingApp.serviceTypes,
                submittedAt: pendingApp.submittedAt,
              },
              message: 'Application pending review',
            });
            return;
          }

          res.status(404).json({
            error: 'Not found',
            code: 'PHARMACY_NOT_FOUND',
            message: 'No GlucoseView pharmacy associated with your account',
          });
          return;
        }

        res.json({
          success: true,
          pharmacy: {
            id: pharmacy.id,
            name: pharmacy.name,
            businessNumber: pharmacy.businessNumber,
            status: pharmacy.status,
            enabledServices: pharmacy.enabledServices || [],
            glycopharmPharmacyId: pharmacy.glycopharmPharmacyId,
            createdAt: pharmacy.createdAt,
          },
        });
      } catch (error) {
        logger.error('[GlucoseView] Get my pharmacy error:', error);
        res.status(500).json({
          error: 'Internal server error',
          code: 'INTERNAL_SERVER_ERROR',
        });
      }
    }) as unknown as RequestHandler
  );

  return router;
}
