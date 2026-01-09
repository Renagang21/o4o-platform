/**
 * Glycopharm Operator Dashboard Controller
 *
 * WO-GLYCOPHARM-DASHBOARD-P1-A: Real database queries for operator dashboard
 * - Platform-wide statistics for operators/admins
 * - Uses existing entities only (no new schema)
 * - Returns empty state for unavailable data
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import { GlycopharmPharmacy } from '../entities/glycopharm-pharmacy.entity.js';
import { GlycopharmApplication } from '../entities/glycopharm-application.entity.js';
import { GlycopharmOrder } from '../entities/glycopharm-order.entity.js';
import { GlycopharmProduct } from '../entities/glycopharm-product.entity.js';
import { CmsContent } from '@o4o-apps/cms-core';
import type { AuthRequest } from '../../../types/auth.js';

type AuthMiddleware = RequestHandler;

// Response interfaces matching frontend expectations
interface ServiceStatus {
  activePharmacies: number;
  approvedStores: number; // Same as active pharmacies (no separate store entity)
  warnings: number; // Suspended pharmacies
  lastUpdated: string;
}

interface StoreStatus {
  pendingApprovals: number; // Applications with status 'submitted'
  supplementRequests: number; // Applications with status 'supplementing'
  activeStores: number;
  inactiveStores: number;
}

interface ChannelStatus {
  web: { active: number; pending: number; inactive: number };
  kiosk: { active: number; pending: number; inactive: number };
  tablet: { active: number; pending: number; inactive: number };
}

interface ContentStatus {
  hero: { total: number; active: number };
  featured: { total: number; operatorPicked: number };
  eventNotice: { total: number; active: number };
}

interface TrialStatus {
  activeTrials: number;
  connectedPharmacies: number;
  pendingConnections: number;
}

interface ForumStatus {
  open: number;
  readonly: number;
  closed: number;
  totalPosts: number;
}

interface OperatorDashboardResponse {
  serviceStatus: ServiceStatus;
  storeStatus: StoreStatus;
  channelStatus: ChannelStatus;
  contentStatus: ContentStatus;
  trialStatus: TrialStatus;
  forumStatus: ForumStatus;
  productStats: {
    total: number;
    active: number;
    draft: number;
  };
  orderStats: {
    totalOrders: number;
    paidOrders: number;
    totalRevenue: number;
  };
}

/**
 * Check if user has operator/admin role
 */
function isOperatorOrAdmin(roles: string[] = []): boolean {
  return (
    roles.includes('operator') ||
    roles.includes('admin') ||
    roles.includes('administrator') ||
    roles.includes('super_admin')
  );
}

export function createOperatorController(
  dataSource: DataSource,
  requireAuth: AuthMiddleware
): Router {
  const router = Router();

  /**
   * GET /operator/dashboard
   * Get platform-wide operator dashboard statistics
   */
  router.get(
    '/dashboard',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const authReq = req as AuthRequest;
        const userRoles = authReq.user?.roles || [];

        // Check operator/admin permission
        if (!isOperatorOrAdmin(userRoles)) {
          res.status(403).json({
            error: { code: 'FORBIDDEN', message: 'Operator or administrator role required' },
          });
          return;
        }

        // Get repositories
        const pharmacyRepo = dataSource.getRepository(GlycopharmPharmacy);
        const applicationRepo = dataSource.getRepository(GlycopharmApplication);
        const orderRepo = dataSource.getRepository(GlycopharmOrder);
        const productRepo = dataSource.getRepository(GlycopharmProduct);

        // === Service Status ===
        const [activePharmacies, suspendedPharmacies, totalPharmacies] = await Promise.all([
          pharmacyRepo.count({ where: { status: 'active' } }),
          pharmacyRepo.count({ where: { status: 'suspended' } }),
          pharmacyRepo.count(),
        ]);

        const serviceStatus: ServiceStatus = {
          activePharmacies,
          approvedStores: activePharmacies, // Same as active (no separate store)
          warnings: suspendedPharmacies,
          lastUpdated: new Date().toISOString(),
        };

        // === Store Status ===
        // Note: 'supplementing' status does not exist in GlycopharmApplicationStatus
        // Valid statuses are: 'submitted' | 'approved' | 'rejected'
        const [pendingApprovals, inactivePharmacies] = await Promise.all([
          applicationRepo.count({ where: { status: 'submitted' } }),
          pharmacyRepo.count({ where: { status: 'inactive' } }),
        ]);
        const supplementRequests = 0; // No supplementing status in current schema

        const storeStatus: StoreStatus = {
          pendingApprovals,
          supplementRequests,
          activeStores: activePharmacies,
          inactiveStores: inactivePharmacies,
        };

        // === Channel Status (Empty - no entity) ===
        const channelStatus: ChannelStatus = {
          web: { active: activePharmacies, pending: 0, inactive: 0 },
          kiosk: { active: 0, pending: 0, inactive: 0 },
          tablet: { active: 0, pending: 0, inactive: 0 },
        };

        // === Content Status (WO-P2-IMPLEMENT-CONTENT: Real CMS data) ===
        const contentRepo = dataSource.getRepository(CmsContent);
        const serviceKey = 'glycopharm';

        const [
          heroTotal,
          heroActive,
          featuredTotal,
          featuredOperatorPicked,
          noticeTotal,
          noticeActive,
          eventTotal,
          eventActive,
        ] = await Promise.all([
          contentRepo.count({ where: { serviceKey, type: 'hero' } }),
          contentRepo.count({ where: { serviceKey, type: 'hero', status: 'published' } }),
          contentRepo.count({ where: { serviceKey, type: 'featured' } }),
          contentRepo.count({ where: { serviceKey, type: 'featured', isOperatorPicked: true } }),
          contentRepo.count({ where: { serviceKey, type: 'notice' } }),
          contentRepo.count({ where: { serviceKey, type: 'notice', status: 'published' } }),
          contentRepo.count({ where: { serviceKey, type: 'event' } }),
          contentRepo.count({ where: { serviceKey, type: 'event', status: 'published' } }),
        ]);

        const contentStatus: ContentStatus = {
          hero: { total: heroTotal, active: heroActive },
          featured: { total: featuredTotal, operatorPicked: featuredOperatorPicked },
          eventNotice: { total: noticeTotal + eventTotal, active: noticeActive + eventActive },
        };

        // === Trial Status (Empty - no entity) ===
        const trialStatus: TrialStatus = {
          activeTrials: 0,
          connectedPharmacies: 0,
          pendingConnections: 0,
        };

        // === Forum Status (Empty - no glycopharm-specific forum entity) ===
        const forumStatus: ForumStatus = {
          open: 0,
          readonly: 0,
          closed: 0,
          totalPosts: 0,
        };

        // === Product Stats ===
        const [totalProducts, activeProducts, draftProducts] = await Promise.all([
          productRepo.count(),
          productRepo.count({ where: { status: 'active' } }),
          productRepo.count({ where: { status: 'draft' } }),
        ]);

        // === Order Stats ===
        const [totalOrders, paidOrders] = await Promise.all([
          orderRepo.count(),
          orderRepo.count({ where: { status: 'PAID' } }),
        ]);

        // Get total revenue from paid orders
        const revenueResult = await orderRepo
          .createQueryBuilder('order')
          .select('COALESCE(SUM(order.total_amount), 0)', 'totalRevenue')
          .where('order.status = :status', { status: 'PAID' })
          .getRawOne();

        const response: OperatorDashboardResponse = {
          serviceStatus,
          storeStatus,
          channelStatus,
          contentStatus,
          trialStatus,
          forumStatus,
          productStats: {
            total: totalProducts,
            active: activeProducts,
            draft: draftProducts,
          },
          orderStats: {
            totalOrders,
            paidOrders,
            totalRevenue: Number(revenueResult?.totalRevenue || 0),
          },
        };

        res.json({ success: true, data: response });
      } catch (error: any) {
        console.error('Failed to get operator dashboard:', error);
        res.status(500).json({
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    }
  );

  /**
   * GET /operator/recent-orders
   * Get recent orders for operator dashboard
   */
  router.get(
    '/recent-orders',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const authReq = req as AuthRequest;
        const userRoles = authReq.user?.roles || [];

        if (!isOperatorOrAdmin(userRoles)) {
          res.status(403).json({
            error: { code: 'FORBIDDEN', message: 'Operator or administrator role required' },
          });
          return;
        }

        const limit = parseInt(req.query.limit as string) || 10;
        const orderRepo = dataSource.getRepository(GlycopharmOrder);

        const recentOrders = await orderRepo.find({
          order: { created_at: 'DESC' },
          take: limit,
          relations: ['pharmacy'],
        });

        res.json({
          success: true,
          data: recentOrders.map((order) => ({
            id: order.id,
            pharmacyId: order.pharmacy_id,
            pharmacyName: order.pharmacy?.name || 'Unknown',
            status: order.status,
            totalAmount: order.total_amount,
            customerName: order.customer_name,
            createdAt: order.created_at,
          })),
        });
      } catch (error: any) {
        console.error('Failed to get recent orders:', error);
        res.status(500).json({
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    }
  );

  /**
   * GET /operator/pending-applications
   * Get pending applications for operator review
   */
  router.get(
    '/pending-applications',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const authReq = req as AuthRequest;
        const userRoles = authReq.user?.roles || [];

        if (!isOperatorOrAdmin(userRoles)) {
          res.status(403).json({
            error: { code: 'FORBIDDEN', message: 'Operator or administrator role required' },
          });
          return;
        }

        const limit = parseInt(req.query.limit as string) || 10;
        const applicationRepo = dataSource.getRepository(GlycopharmApplication);

        // Only 'submitted' applications are pending (no 'supplementing' status exists)
        const pendingApplications = await applicationRepo.find({
          where: { status: 'submitted' },
          order: { submittedAt: 'DESC' },
          take: limit,
        });

        res.json({
          success: true,
          data: pendingApplications.map((app) => ({
            id: app.id,
            organizationName: app.organizationName,
            organizationType: app.organizationType,
            status: app.status,
            serviceTypes: app.serviceTypes,
            submittedAt: app.submittedAt,
          })),
        });
      } catch (error: any) {
        console.error('Failed to get pending applications:', error);
        res.status(500).json({
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    }
  );

  return router;
}
