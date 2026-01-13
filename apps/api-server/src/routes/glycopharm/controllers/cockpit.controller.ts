/**
 * Glycopharm Cockpit Controller
 *
 * Pharmacy Dashboard 2.0 - Cockpit API endpoints
 * Provides pharmacy status, today's actions, franchise services, and content workspace
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import { GlycopharmPharmacy } from '../entities/glycopharm-pharmacy.entity.js';
import { GlycopharmApplication } from '../entities/glycopharm-application.entity.js';
// GlycopharmOrder - REMOVED (Phase 4-A: Legacy Order System Deprecation)
import type { AuthRequest } from '../../../types/auth.js';

type AuthMiddleware = RequestHandler;
type ScopeMiddleware = (scope: string) => RequestHandler;

// Response types matching frontend definitions
interface OrderChannelStatus {
  web: boolean;
  kiosk: 'none' | 'requested' | 'approved' | 'rejected';
  tablet: 'none' | 'requested' | 'approved' | 'rejected';
}

interface PharmacyStatus {
  pharmacyName: string;
  storeSlug?: string;
  storeStatus: 'pending' | 'preparing' | 'active' | 'suspended';
  applicationStatus: 'none' | 'draft' | 'submitted' | 'reviewing' | 'supplementing' | 'approved' | 'rejected';
  legalInfoStatus: 'complete' | 'incomplete' | 'needs_update';
  legalInfoIssues?: string[];
  orderChannelStatus?: OrderChannelStatus;
}

interface TodayActions {
  todayOrders: number;
  pendingOrders: number;
  pendingReceiveOrders: number;
  operatorNotices: number;
  applicationAlerts: number;
}

interface FranchiseServices {
  signage: {
    enabled: boolean;
    activeContents: number;
    lastUpdated?: string;
  };
  marketTrial: {
    enabled: boolean;
    activeTrials: number;
  };
  forum: {
    enabled: boolean;
    ownedForums: number;
    joinedForums: number;
  };
}

interface ContentWorkspace {
  savedContents: number;
  recentContents: Array<{
    id: string;
    title: string;
    type: 'video' | 'document' | 'link';
    source: string;
    savedAt: string;
  }>;
}

export function createCockpitController(
  dataSource: DataSource,
  requireAuth: AuthMiddleware,
  requireScope: ScopeMiddleware
): Router {
  const router = Router();

  /**
   * GET /pharmacy/cockpit/status
   * Get pharmacy status information for dashboard
   */
  router.get(
    '/status',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const authReq = req as AuthRequest;
        const userId = authReq.user?.id;

        if (!userId) {
          res.status(401).json({
            error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          });
          return;
        }

        // Find pharmacy owned by user (created_by_user_id)
        const pharmacyRepo = dataSource.getRepository(GlycopharmPharmacy);
        const pharmacy = await pharmacyRepo.findOne({
          where: { created_by_user_id: userId },
        });

        // Find application if exists
        const applicationRepo = dataSource.getRepository(GlycopharmApplication);
        const application = await applicationRepo.findOne({
          where: { userId },
          order: { createdAt: 'DESC' },
        });

        // Determine status values
        let storeStatus: PharmacyStatus['storeStatus'] = 'pending';
        let applicationStatus: PharmacyStatus['applicationStatus'] = 'none';
        let legalInfoStatus: PharmacyStatus['legalInfoStatus'] = 'incomplete';
        const legalInfoIssues: string[] = [];

        if (pharmacy) {
          // Map pharmacy status
          switch (pharmacy.status) {
            case 'active':
              storeStatus = 'active';
              break;
            case 'inactive':
              storeStatus = 'preparing';
              break;
            case 'suspended':
              storeStatus = 'suspended';
              break;
            default:
              storeStatus = 'preparing';
          }

          // Check legal info completeness based on business_number
          if (pharmacy.business_number) {
            legalInfoStatus = 'complete';
          } else {
            legalInfoStatus = 'incomplete';
            legalInfoIssues.push('사업자등록번호 미등록');
          }
        }

        if (application) {
          applicationStatus = application.status as PharmacyStatus['applicationStatus'];
        }

        const response: PharmacyStatus = {
          pharmacyName: pharmacy?.name || '미등록 약국',
          storeSlug: pharmacy?.code,
          storeStatus,
          applicationStatus,
          legalInfoStatus,
          legalInfoIssues: legalInfoIssues.length > 0 ? legalInfoIssues : undefined,
          orderChannelStatus: {
            web: storeStatus === 'active',
            kiosk: 'none',
            tablet: 'none',
          },
        };

        res.json({ success: true, data: response });
      } catch (error: any) {
        console.error('Failed to get pharmacy status:', error);
        res.status(500).json({
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    }
  );

  /**
   * GET /pharmacy/cockpit/today-actions
   * Get today's operational actions count
   */
  router.get(
    '/today-actions',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const authReq = req as AuthRequest;
        const userId = authReq.user?.id;

        if (!userId) {
          res.status(401).json({
            error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          });
          return;
        }

        // Find pharmacy owned by user
        const pharmacyRepo = dataSource.getRepository(GlycopharmPharmacy);
        const pharmacy = await pharmacyRepo.findOne({
          where: { created_by_user_id: userId },
        });

        if (!pharmacy) {
          // Return empty stats if no pharmacy
          const response: TodayActions = {
            todayOrders: 0,
            pendingOrders: 0,
            pendingReceiveOrders: 0,
            operatorNotices: 0,
            applicationAlerts: 0,
          };
          res.json({ success: true, data: response });
          return;
        }

        // Phase 4-A: Legacy Order System removed
        // Order counts will be available via E-commerce Core after integration
        const todayOrders = 0;
        const pendingOrders = 0;
        const pendingReceiveOrders = 0;

        // Check for application alerts
        const applicationRepo = dataSource.getRepository(GlycopharmApplication);
        const applicationAlerts = await applicationRepo
          .createQueryBuilder('app')
          .where('app.userId = :userId', { userId })
          .andWhere('app.status IN (:...statuses)', { statuses: ['supplementing', 'rejected'] })
          .getCount();

        const response: TodayActions = {
          todayOrders,
          pendingOrders,
          pendingReceiveOrders,
          operatorNotices: 0, // Placeholder - would need a notices table
          applicationAlerts,
        };

        res.json({ success: true, data: response });
      } catch (error: any) {
        console.error('Failed to get today actions:', error);
        res.status(500).json({
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    }
  );

  /**
   * GET /pharmacy/cockpit/franchise-services
   * Get franchise services utilization status
   */
  router.get(
    '/franchise-services',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const authReq = req as AuthRequest;
        const userId = authReq.user?.id;

        if (!userId) {
          res.status(401).json({
            error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          });
          return;
        }

        // Find pharmacy owned by user
        const pharmacyRepo = dataSource.getRepository(GlycopharmPharmacy);
        const pharmacy = await pharmacyRepo.findOne({
          where: { created_by_user_id: userId },
        });

        // Default response - services not enabled if no pharmacy
        const response: FranchiseServices = {
          signage: {
            enabled: false,
            activeContents: 0,
            lastUpdated: undefined,
          },
          marketTrial: {
            enabled: false,
            activeTrials: 0,
          },
          forum: {
            enabled: false,
            ownedForums: 0,
            joinedForums: 0,
          },
        };

        if (pharmacy && pharmacy.status === 'active') {
          // Check enabled services from pharmacy's enabled_services field
          const enabledServices = pharmacy.enabled_services || [];

          // Check if signage is enabled (digital_signage service type)
          response.signage.enabled = enabledServices.includes('digital_signage');

          // Forum is enabled by default for active pharmacies
          response.forum.enabled = true;
        }

        res.json({ success: true, data: response });
      } catch (error: any) {
        console.error('Failed to get franchise services:', error);
        res.status(500).json({
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    }
  );

  /**
   * GET /pharmacy/cockpit/content-workspace
   * Get saved contents and recent content activities
   */
  router.get(
    '/content-workspace',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const authReq = req as AuthRequest;
        const userId = authReq.user?.id;

        if (!userId) {
          res.status(401).json({
            error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          });
          return;
        }

        // Content workspace is a placeholder - would need a saved_contents table
        // For now, return empty workspace
        const response: ContentWorkspace = {
          savedContents: 0,
          recentContents: [],
        };

        res.json({ success: true, data: response });
      } catch (error: any) {
        console.error('Failed to get content workspace:', error);
        res.status(500).json({
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    }
  );

  return router;
}
