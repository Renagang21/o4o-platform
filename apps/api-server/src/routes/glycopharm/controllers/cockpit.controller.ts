/**
 * Glycopharm Cockpit Controller
 *
 * Pharmacy Dashboard 2.0 - Cockpit API endpoints
 * Provides pharmacy status, today's actions, franchise services, content workspace,
 * store KPI summary, and AI insights.
 *
 * WO-O4O-STORE-TEMPLATE-V1_2-GLYCOPHARM-MIGRATION:
 * - store-kpi and store-insights endpoints via @o4o/store-core engines
 * - today-actions uses real ecommerce_orders data via adapter
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import { OrganizationStore } from '../../kpa/entities/organization-store.entity.js';
import { GlycopharmPharmacyExtension } from '../entities/glycopharm-pharmacy-extension.entity.js';
import { GlycopharmApplication } from '../entities/glycopharm-application.entity.js';
import { GlycopharmCustomerRequest } from '../entities/customer-request.entity.js';
import { StoreSummaryEngine, StoreInsightsEngine, DEFAULT_INSIGHT_RULES } from '@o4o/store-core';
import { GlycopharmStoreDataAdapter } from '../services/glycopharm-store-data.adapter.js';
import { runAIInsight } from '@o4o/ai-core';
import type { ActionLogService } from '@o4o/action-log-core';
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
  requireScope: ScopeMiddleware,
  actionLogService?: ActionLogService,
): Router {
  const router = Router();
  const storeAdapter = new GlycopharmStoreDataAdapter(dataSource);
  const summaryEngine = new StoreSummaryEngine(storeAdapter);
  const insightsEngine = new StoreInsightsEngine(DEFAULT_INSIGHT_RULES);

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
        const pharmacyRepo = dataSource.getRepository(OrganizationStore);
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
          // Map isActive boolean to status
          storeStatus = pharmacy.isActive ? 'active' : 'preparing';

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
        const pharmacyRepo = dataSource.getRepository(OrganizationStore);
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

        // WO-O4O-STORE-TEMPLATE-V1_2: Real order data via store-core adapter
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayStats = await storeAdapter.getOrderStats(pharmacy.id, todayStart);
        const todayOrders = todayStats.count;
        const pendingOrders = 0;  // TODO: pending status filter when order flow is active
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
        const pharmacyRepo = dataSource.getRepository(OrganizationStore);
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

        if (pharmacy && pharmacy.isActive) {
          // Check enabled services from extension table
          const extRepo = dataSource.getRepository(GlycopharmPharmacyExtension);
          const extension = await extRepo.findOne({ where: { organization_id: pharmacy.id } });
          const enabledServices = extension?.enabled_services || [];

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

  // ==========================================================================
  // Store KPI & Insights (WO-O4O-STORE-TEMPLATE-V1_2-GLYCOPHARM-MIGRATION)
  // ==========================================================================

  /**
   * GET /pharmacy/cockpit/store-kpi
   * Store KPI summary via @o4o/store-core SummaryEngine
   */
  router.get(
    '/store-kpi',
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

        const pharmacyRepo = dataSource.getRepository(OrganizationStore);
        const pharmacy = await pharmacyRepo.findOne({
          where: { created_by_user_id: userId },
        });

        if (!pharmacy) {
          res.status(404).json({
            error: { code: 'PHARMACY_NOT_FOUND', message: '등록된 약국이 없습니다' },
          });
          return;
        }

        const summary = await summaryEngine.getSummary(pharmacy.id);
        res.json({ success: true, data: summary });
      } catch (error: any) {
        console.error('Failed to get store KPI:', error);
        res.status(500).json({
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    }
  );

  /**
   * GET /pharmacy/cockpit/store-insights
   * Store AI insights via @o4o/store-core InsightsEngine
   */
  router.get(
    '/store-insights',
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

        const pharmacyRepo = dataSource.getRepository(OrganizationStore);
        const pharmacy = await pharmacyRepo.findOne({
          where: { created_by_user_id: userId },
        });

        if (!pharmacy) {
          res.status(404).json({
            error: { code: 'PHARMACY_NOT_FOUND', message: '등록된 약국이 없습니다' },
          });
          return;
        }

        const [summary, lastMonthRevenue] = await Promise.all([
          summaryEngine.getSummary(pharmacy.id),
          summaryEngine.getLastMonthRevenue(pharmacy.id),
        ]);

        const insights = insightsEngine.generate({ summary, lastMonthRevenue });
        res.json({ success: true, data: insights });
      } catch (error: any) {
        console.error('Failed to get store insights:', error);
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
        const pharmacyRepo = dataSource.getRepository(OrganizationStore);
        const pharmacy = await pharmacyRepo.findOne({
          where: { created_by_user_id: userId },
        });

        // Count active services from extension
        const extRepo2 = dataSource.getRepository(GlycopharmPharmacyExtension);
        const storeExtension = pharmacy ? await extRepo2.findOne({ where: { organization_id: pharmacy.id } }) : null;
        const enabledServices = storeExtension?.enabled_services || [];
        const activeServices = enabledServices.length;

        // Count active channels (web is always 1 if active)
        let activeChannels = 0;
        if (pharmacy?.isActive) {
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

  /**
   * POST /pharmacy/cockpit/store-main/:itemId/copy
   * Copy a hub catalog item to pharmacy's store
   * WO-APP-DATA-HUB-PHASE2-B
   */
  router.post(
    '/store-main/:itemId/copy',
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

        const { itemId } = req.params;
        const { templateType, visibility, categoryOverride } = req.body || {};

        // Validate required fields
        if (!templateType || !visibility) {
          res.status(400).json({
            error: { code: 'INVALID_INPUT', message: 'templateType and visibility are required' },
          });
          return;
        }

        // Verify pharmacy exists
        const pharmacyRepo = dataSource.getRepository(OrganizationStore);
        const pharmacy = await pharmacyRepo.findOne({
          where: { created_by_user_id: userId },
        });

        if (!pharmacy) {
          res.status(404).json({
            error: { code: 'PHARMACY_NOT_FOUND', message: '등록된 약국이 없습니다' },
          });
          return;
        }

        // Phase 2-B stub: Log the copy action and return success
        // Full copy logic (creating actual store items) will be implemented
        // when the product management system is integrated
        // Store copy action logged for debugging (Phase 2-B stub)

        res.json({
          success: true,
          data: {
            id: `copy-${itemId}-${Date.now()}`,
            message: '내 매장에 추가되었습니다',
          },
        });
      } catch (error: any) {
        console.error('Failed to copy store item:', error);
        res.status(500).json({
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    }
  );

  // ==========================================================================
  // AI Orchestration Summary (WO-PLATFORM-AI-ORCHESTRATION-LAYER-V1 Phase 3)
  // ==========================================================================

  /**
   * GET /pharmacy/cockpit/ai-summary
   * AI-powered pharmacy insight — aggregated KPI + care data → AI analysis.
   *
   * Principles:
   * - Only aggregated data passed (no individual patient data)
   * - Pharmacy-scoped queries (pharmacy_id isolation)
   * - AI failure → graceful fallback (no error exposed to UI)
   */
  router.get(
    '/ai-summary',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      const start = Date.now();
      try {
        const authReq = req as AuthRequest;
        const userId = authReq.user?.id;
        const userRoles: string[] = (authReq.user as any)?.roles || [];

        if (!userId) {
          res.status(401).json({
            error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          });
          return;
        }

        // Find pharmacy
        const pharmacyRepo = dataSource.getRepository(OrganizationStore);
        const pharmacy = await pharmacyRepo.findOne({
          where: { created_by_user_id: userId },
        });

        if (!pharmacy) {
          res.status(404).json({
            error: { code: 'PHARMACY_NOT_FOUND', message: '등록된 약국이 없습니다' },
          });
          return;
        }

        // --- Collect aggregated context data (pharmacy-scoped) ---

        // A. Care KPI: risk distribution (latest snapshot per patient)
        const riskRows: Array<{ risk_level: string; count: number }> = await dataSource.query(`
          SELECT s.risk_level, COUNT(*)::int AS count
          FROM care_kpi_snapshots s
          INNER JOIN (
            SELECT patient_id, MAX(created_at) AS max_at
            FROM care_kpi_snapshots WHERE pharmacy_id = $1
            GROUP BY patient_id
          ) latest ON s.patient_id = latest.patient_id AND s.created_at = latest.max_at
          WHERE s.pharmacy_id = $1
          GROUP BY s.risk_level
        `, [pharmacy.id]);

        let highRiskCount = 0, moderateRiskCount = 0, lowRiskCount = 0;
        for (const row of riskRows) {
          if (row.risk_level === 'high') highRiskCount = row.count;
          else if (row.risk_level === 'moderate') moderateRiskCount = row.count;
          else if (row.risk_level === 'low') lowRiskCount = row.count;
        }
        const totalPatients = highRiskCount + moderateRiskCount + lowRiskCount;

        // B. Coaching count (last 7 days)
        const coachingResult = await dataSource.query(`
          SELECT COUNT(*)::int AS count FROM care_coaching_sessions
          WHERE created_at >= NOW() - INTERVAL '7 days' AND pharmacy_id = $1
        `, [pharmacy.id]);
        const recentCoachingCount = coachingResult[0]?.count ?? 0;

        // C. Improving count (TIR trend)
        const improvingResult = await dataSource.query(`
          WITH ranked AS (
            SELECT patient_id, tir,
                   ROW_NUMBER() OVER (PARTITION BY patient_id ORDER BY created_at DESC) AS rn
            FROM care_kpi_snapshots WHERE pharmacy_id = $1
          )
          SELECT COUNT(*)::int AS count FROM (
            SELECT r1.patient_id FROM ranked r1
            JOIN ranked r2 ON r1.patient_id = r2.patient_id AND r2.rn = 2
            WHERE r1.rn = 1 AND r1.tir > r2.tir
          ) improving
        `, [pharmacy.id]);
        const improvingCount = improvingResult[0]?.count ?? 0;

        // D. Store KPI (orders, revenue)
        let storeKpi = { orderCount: 0, revenue: 0, lastMonthRevenue: 0 };
        try {
          const [summary, lastMonthRevenue] = await Promise.all([
            summaryEngine.getSummary(pharmacy.id),
            summaryEngine.getLastMonthRevenue(pharmacy.id),
          ]);
          storeKpi = {
            orderCount: summary.stats.totalOrders ?? 0,
            revenue: summary.stats.monthlyRevenue ?? 0,
            lastMonthRevenue: lastMonthRevenue ?? 0,
          };
        } catch { /* store KPI optional */ }

        // E. Pending requests
        const customerRequestRepo = dataSource.getRepository(GlycopharmCustomerRequest);
        const pendingRequests = await customerRequestRepo.count({
          where: { pharmacyId: pharmacy.id, status: 'pending' },
        });

        // --- Call AI Orchestrator ---
        const aiResult = await runAIInsight({
          service: 'glycopharm',
          insightType: 'store-summary',
          contextData: {
            pharmacyName: pharmacy.name,
            kpi: {
              totalPatients,
              highRiskCount,
              moderateRiskCount,
              lowRiskCount,
              improvingCount,
              recentCoachingCount,
            },
            revenue: {
              currentMonth: storeKpi.revenue,
              lastMonth: storeKpi.lastMonthRevenue,
              growthRate: storeKpi.lastMonthRevenue > 0
                ? ((storeKpi.revenue - storeKpi.lastMonthRevenue) / storeKpi.lastMonthRevenue * 100)
                : 0,
            },
            pendingRequests,
          },
          user: {
            id: userId,
            role: userRoles[0] || 'glycopharm:operator',
          },
        });

        if (aiResult.success && aiResult.insight) {
          actionLogService?.logSuccess('glycopharm', userId, 'glycopharm.cockpit.ai_summary', {
            organizationId: pharmacy.id, durationMs: Date.now() - start, source: 'ai',
            meta: { totalPatients, highRiskCount, provider: aiResult.meta.provider },
          }).catch(() => {});

          res.json({
            success: true,
            data: {
              insight: aiResult.insight,
              meta: {
                provider: aiResult.meta.provider,
                model: aiResult.meta.model,
                durationMs: aiResult.meta.durationMs,
                confidenceScore: aiResult.insight.confidenceScore,
              },
            },
          });
        } else {
          actionLogService?.logSuccess('glycopharm', userId, 'glycopharm.cockpit.ai_summary', {
            organizationId: pharmacy.id, durationMs: Date.now() - start, source: 'manual',
            meta: { totalPatients, highRiskCount, provider: 'fallback' },
          }).catch(() => {});

          // Graceful fallback — return rule-based summary instead
          res.json({
            success: true,
            data: {
              insight: buildFallbackInsight(
                totalPatients, highRiskCount, recentCoachingCount, improvingCount
              ),
              meta: { provider: 'fallback', model: 'rule-based', durationMs: 0, confidenceScore: 1.0 },
            },
          });
        }
      } catch (error: any) {
        const authUserId = (req as AuthRequest).user?.id;
        if (authUserId) {
          actionLogService?.logFailure('glycopharm', authUserId, 'glycopharm.cockpit.ai_summary', error.message, {
            durationMs: Date.now() - start, source: 'ai',
          }).catch(() => {});
        }
        console.error('Failed to generate AI summary:', error);
        res.status(500).json({
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    }
  );

  return router;
}

/**
 * Fallback insight when AI provider is unavailable.
 * Pure rule-based — no external calls.
 */
function buildFallbackInsight(
  totalPatients: number,
  highRiskCount: number,
  recentCoachingCount: number,
  improvingCount: number,
): { summary: string; riskLevel: 'low' | 'medium' | 'high'; recommendedActions: string[]; confidenceScore: number } {
  const highRiskRatio = totalPatients > 0 ? highRiskCount / totalPatients : 0;
  const riskLevel = highRiskRatio > 0.3 ? 'high' : highRiskRatio > 0.1 ? 'medium' : 'low';

  const actions: string[] = [];
  if (highRiskCount > 0) actions.push(`고위험 환자 ${highRiskCount}명 우선 상담 필요`);
  if (recentCoachingCount === 0) actions.push('최근 7일간 코칭 미실시 — 코칭 세션 권장');
  if (improvingCount > 0) actions.push(`${improvingCount}명의 환자가 개선 추세`);

  const summary = totalPatients === 0
    ? '등록된 환자 데이터가 없습니다.'
    : `총 ${totalPatients}명 중 고위험 ${highRiskCount}명, 최근 코칭 ${recentCoachingCount}건.`;

  return { summary, riskLevel, recommendedActions: actions, confidenceScore: 1.0 };
}
