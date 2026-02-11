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
import { GlycopharmCustomerRequest } from '../entities/customer-request.entity.js';
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
  pendingRequests: number; // Phase 1: Common Request
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
            pendingRequests: 0,
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

        // Count pending customer requests (Phase 1: Common Request)
        const customerRequestRepo = dataSource.getRepository(GlycopharmCustomerRequest);
        const pendingRequests = await customerRequestRepo.count({
          where: {
            pharmacyId: pharmacy.id,
            status: 'pending',
          },
        });

        const response: TodayActions = {
          todayOrders,
          pendingOrders,
          pendingReceiveOrders,
          pendingRequests,
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

  /**
   * GET /pharmacy/cockpit/store-main
   * Store main page data (summary + catalog by product policy)
   * WO-STORE-MAIN-PAGE-PHASE1-V1 + PHASE2-A
   *
   * Phase 2-A changes:
   * - Approval status on REQUEST_REQUIRED items (approved → readyToUse, pending/rejected → expandable)
   * - LIMITED conditions attached to LIMITED items
   * - Accurate summary counts based on approval state
   */
  router.get(
    '/store-main',
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

        // Count active services
        const enabledServices = pharmacy?.enabled_services || [];
        const activeServices = enabledServices.length;

        // Count active channels (web is always 1 if active)
        let activeChannels = 0;
        if (pharmacy?.status === 'active') {
          activeChannels = 1; // web always on
        }

        // Count pending applications (accurate count for summary)
        const applicationRepo = dataSource.getRepository(GlycopharmApplication);
        const pendingApprovals = await applicationRepo
          .createQueryBuilder('app')
          .where('app.userId = :userId', { userId })
          .andWhere('app.status = :status', { status: 'submitted' })
          .getCount();

        // Get latest application to determine approval state for REQUEST_REQUIRED items
        const latestApplication = await applicationRepo.findOne({
          where: { userId },
          order: { createdAt: 'DESC' },
        });
        const appStatus = latestApplication?.status || 'none';
        const rejectionReason = latestApplication?.rejectionReason || undefined;

        // Phase 2-A: Determine approval status for REQUEST_REQUIRED items
        type ApprovalStatus = 'none' | 'pending' | 'approved' | 'rejected';
        let requestApproval: ApprovalStatus = 'none';
        if (appStatus === 'submitted') requestApproval = 'pending';
        else if (appStatus === 'approved') requestApproval = 'approved';
        else if (appStatus === 'rejected') requestApproval = 'rejected';

        // Base catalog items with approval status
        const openItems = [
          { id: 'cat-001', name: '혈당측정지 (일반)', categoryName: '당뇨 소모품', policy: 'OPEN', price: 15000, status: 'available', approvalStatus: 'none' as ApprovalStatus },
          { id: 'cat-002', name: '인슐린 주사바늘', categoryName: '당뇨 소모품', policy: 'OPEN', price: 12000, status: 'available', approvalStatus: 'none' as ApprovalStatus },
          { id: 'cat-003', name: '건강기능식품 A', categoryName: '건강기능식품', policy: 'OPEN', price: 35000, status: 'available', approvalStatus: 'none' as ApprovalStatus },
        ];

        const displayItems = [
          { id: 'cat-004', name: '브랜드 홍보 키트', categoryName: '홍보물', policy: 'DISPLAY_ONLY', status: 'display_only', approvalStatus: 'none' as ApprovalStatus },
          { id: 'cat-005', name: '신제품 샘플 세트', categoryName: '샘플', policy: 'DISPLAY_ONLY', status: 'display_only', approvalStatus: 'none' as ApprovalStatus },
        ];

        const requestItems = [
          {
            id: 'cat-006', name: '처방연계 혈당관리 프로그램', categoryName: '처방 연계',
            policy: 'REQUEST_REQUIRED', price: 89000,
            status: requestApproval === 'approved' ? 'available' : 'request_needed',
            approvalStatus: requestApproval,
            ...(requestApproval === 'rejected' && rejectionReason ? { rejectionReason } : {}),
          },
          {
            id: 'cat-007', name: 'B2B 전용 도매 상품', categoryName: 'B2B',
            policy: 'REQUEST_REQUIRED', price: 250000,
            status: requestApproval === 'approved' ? 'available' : 'request_needed',
            approvalStatus: requestApproval,
            ...(requestApproval === 'rejected' && rejectionReason ? { rejectionReason } : {}),
          },
        ];

        const limitedItems = [
          {
            id: 'cat-008', name: '신규 런칭 프로모션 세트', categoryName: '프로모션',
            policy: 'LIMITED', price: 49000, status: 'limited',
            approvalStatus: 'none' as ApprovalStatus,
            limitedConditions: [
              { type: 'period', label: '기간 제한', description: '2026년 3월 31일까지 판매' },
              { type: 'quantity', label: '수량 제한', description: '약국당 최대 50세트' },
            ],
          },
        ];

        // Phase 2-A: Route items based on approval status
        // approved REQUEST_REQUIRED → readyToUse
        // pending/rejected/none REQUEST_REQUIRED → expandable
        const approvedRequestItems = requestItems.filter((i) => i.approvalStatus === 'approved');
        const pendingRequestItems = requestItems.filter((i) => i.approvalStatus !== 'approved');

        const readyToUse = [...openItems, ...displayItems, ...approvedRequestItems];
        const expandable = [...pendingRequestItems, ...limitedItems];

        // Accurate counts: orderable = OPEN items + approved REQUEST_REQUIRED
        const orderableProducts = openItems.length + approvedRequestItems.length;

        res.json({
          success: true,
          data: {
            summary: {
              activeServices,
              orderableProducts,
              pendingApprovals,
              activeChannels,
            },
            readyToUse,
            expandable,
          },
        });
      } catch (error: any) {
        console.error('Failed to get store main data:', error);
        res.status(500).json({
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    }
  );

  return router;
}
