/**
 * GlucoseView Operator Dashboard Controller
 *
 * WO-O4O-OPERATOR-DASHBOARD-DATA-NORMALIZATION-V1 (Phase 3)
 *
 * GET /api/v1/glucoseview/operator/dashboard
 *   → Returns 5-block OperatorDashboardConfig for GlucoseView operators
 *
 * Auth: requireAuth + requireGlucoseViewScope('glucoseview:operator')
 * Data sources:
 *   - glucoseview_pharmacies (status counts)
 *   - glucoseview_pharmacists (approval counts)
 *   - glucoseview_customers (total count)
 *   - glucoseview_vendors (active count)
 *   - glucoseview_applications (pending, recent)
 *   - cms_contents (serviceKey='glucoseview')
 */

import { Router, Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import { requireAuth } from '../../../middleware/auth.middleware.js';
import { requireGlucoseViewScope } from '../../../middleware/glucoseview-scope.middleware.js';

// 5-Block types matching @o4o/operator-ux-core OperatorDashboardConfig
interface KpiItem { key: string; label: string; value: number | string; delta?: number; status?: 'neutral' | 'warning' | 'critical'; link?: string; }
interface AiSummaryItem { id: string; message: string; level: 'info' | 'warning' | 'critical'; link?: string; }
interface ActionItem { id: string; label: string; count: number; link: string; }
interface ActivityItem { id: string; message: string; timestamp: string; }
interface QuickActionItem { id: string; label: string; link: string; icon?: string; }
interface OperatorDashboardConfig {
  kpis: KpiItem[];
  aiSummary?: AiSummaryItem[];
  actionQueue: ActionItem[];
  activityLog: ActivityItem[];
  quickActions: QuickActionItem[];
}

export function createOperatorDashboardController(dataSource: DataSource): Router {
  const router = Router();

  router.use(requireAuth);
  router.use(requireGlucoseViewScope('glucoseview:operator') as any);

  /**
   * GET /operator/dashboard
   * GlucoseView operator dashboard — 5-block response
   */
  router.get('/dashboard', async (_req: Request, res: Response): Promise<void> => {
    try {
      // === Parallel data fetch ===
      const [
        pharmacyCounts,
        pharmacistCounts,
        customerCount,
        vendorCount,
        pendingApplications,
        cmsPublished,
        recentApplications,
      ] = await Promise.all([
        // 1. Pharmacies by status
        dataSource.query(`
          SELECT status, COUNT(*)::int AS cnt
          FROM glucoseview_pharmacies
          GROUP BY status
        `) as Promise<Array<{ status: string; cnt: number }>>,

        // 2. Pharmacists by approval_status
        dataSource.query(`
          SELECT approval_status, COUNT(*)::int AS cnt
          FROM glucoseview_pharmacists
          GROUP BY approval_status
        `) as Promise<Array<{ approval_status: string; cnt: number }>>,

        // 3. Total customers
        dataSource.query(`
          SELECT COUNT(*)::int AS cnt FROM glucoseview_customers
        `) as Promise<Array<{ cnt: number }>>,

        // 4. Active vendors
        dataSource.query(`
          SELECT COUNT(*)::int AS cnt FROM glucoseview_vendors WHERE status = 'active'
        `) as Promise<Array<{ cnt: number }>>,

        // 5. Pending applications
        dataSource.query(`
          SELECT COUNT(*)::int AS cnt FROM glucoseview_applications WHERE status = 'submitted'
        `) as Promise<Array<{ cnt: number }>>,

        // 6. Published CMS content
        dataSource.query(`
          SELECT COUNT(*)::int AS cnt FROM cms_contents WHERE "serviceKey" = 'glucoseview' AND status = 'published'
        `) as Promise<Array<{ cnt: number }>>,

        // 7. Recent applications (activity log)
        dataSource.query(`
          SELECT pharmacy_name, status, submitted_at
          FROM glucoseview_applications
          ORDER BY submitted_at DESC
          LIMIT 5
        `) as Promise<Array<{ pharmacy_name: string; status: string; submitted_at: string }>>,
      ]);

      const activePharmacies = pharmacyCounts.find(r => r.status === 'active')?.cnt || 0;
      const approvedPharmacists = pharmacistCounts.find(r => r.approval_status === 'approved')?.cnt || 0;
      const pendingPharmacists = pharmacistCounts.find(r => r.approval_status === 'pending')?.cnt || 0;
      const totalCustomers = customerCount[0]?.cnt || 0;
      const activeVendors = vendorCount[0]?.cnt || 0;
      const pendingApps = pendingApplications[0]?.cnt || 0;
      const publishedContent = cmsPublished[0]?.cnt || 0;

      // === Build 5-block response ===

      // Block 1: KPIs
      const kpis: KpiItem[] = [
        { key: 'active-pharmacies', label: '활성 약국', value: activePharmacies, status: 'neutral' },
        { key: 'approved-pharmacists', label: '승인 약사', value: approvedPharmacists, status: 'neutral' },
        { key: 'total-customers', label: '등록 고객', value: totalCustomers, status: 'neutral' },
        { key: 'active-vendors', label: '활성 벤더', value: activeVendors, status: 'neutral' },
        { key: 'cms-published', label: '게시 콘텐츠', value: publishedContent, status: 'neutral' },
      ];

      // Block 2: AI Summary
      const aiSummary: AiSummaryItem[] = [];
      if (pendingApps > 0) {
        aiSummary.push({
          id: 'pending-apps',
          message: `참여 신청 대기 ${pendingApps}건이 있습니다.`,
          level: 'warning',
          link: '/operator/applications',
        });
      }
      if (pendingPharmacists > 0) {
        aiSummary.push({
          id: 'pending-pharmacists',
          message: `약사 승인 대기 ${pendingPharmacists}명이 있습니다.`,
          level: 'warning',
          link: '/operator/users',
        });
      }
      if (aiSummary.length === 0) {
        aiSummary.push({
          id: 'all-clear',
          message: '현재 긴급한 처리 항목이 없습니다.',
          level: 'info',
        });
      }

      // Block 3: Action Queue
      const actionQueue: ActionItem[] = [
        { id: 'pending-applications', label: '신청 승인 대기', count: pendingApps, link: '/operator/applications' },
        { id: 'pending-pharmacists', label: '약사 승인 대기', count: pendingPharmacists, link: '/operator/users' },
      ];

      // Block 4: Activity Log
      const activityLog: ActivityItem[] = recentApplications.map((app, i) => ({
        id: `app-${i}`,
        message: `${app.pharmacy_name} — 참여 신청 (${app.status === 'submitted' ? '대기' : app.status === 'approved' ? '승인' : '반려'})`,
        timestamp: app.submitted_at || new Date().toISOString(),
      }));

      // Block 5: Quick Actions
      const quickActions: QuickActionItem[] = [
        { id: 'manage-applications', label: '신청 관리', link: '/operator/applications', icon: 'clipboard' },
        { id: 'manage-users', label: '회원 관리', link: '/operator/users', icon: 'users' },
        { id: 'manage-products', label: '상품 관리', link: '/operator/products', icon: 'package' },
        { id: 'manage-stores', label: '매장 관리', link: '/operator/stores', icon: 'store' },
        { id: 'ai-report', label: 'AI 리포트', link: '/operator/ai-report', icon: 'bar-chart' },
      ];

      const response: OperatorDashboardConfig = {
        kpis,
        aiSummary,
        actionQueue,
        activityLog,
        quickActions,
      };

      res.json({ success: true, data: response });
    } catch (error: any) {
      console.error('[GlucoseView Operator Dashboard] Error:', error);
      res.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  });

  return router;
}
