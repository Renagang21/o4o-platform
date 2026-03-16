/**
 * GlycoPharm Admin Dashboard Controller
 *
 * WO-O4O-OPERATOR-DASHBOARD-DATA-NORMALIZATION-V1:
 *   Returns the legacy OperatorDashboardData shape needed by GlycoPharmAdminDashboard.
 *   The operator endpoint (/operator/dashboard) now returns 5-block format,
 *   so this separate admin endpoint preserves the admin dashboard's data contract.
 *
 *   Guard: glycopharm:admin (admins only — operators use /operator/dashboard)
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import { GlycopharmApplication } from '../entities/glycopharm-application.entity.js';
import { GlycopharmProduct } from '../entities/glycopharm-product.entity.js';
import { CmsContent } from '@o4o-apps/cms-core';
import { requireGlycopharmScope } from '../../../middleware/glycopharm-scope.middleware.js';

type AuthMiddleware = RequestHandler;

export function createAdminDashboardController(
  dataSource: DataSource,
  requireAuth: AuthMiddleware,
): Router {
  const router = Router();

  router.use(requireAuth);
  router.use(requireGlycopharmScope('glycopharm:admin') as any);

  /**
   * GET /admin/dashboard
   * Returns legacy OperatorDashboardData shape for admin 4-block layout
   */
  router.get('/dashboard', async (req: Request, res: Response): Promise<void> => {
    try {
      const applicationRepo = dataSource.getRepository(GlycopharmApplication);
      const productRepo = dataSource.getRepository(GlycopharmProduct);
      const serviceKey = 'glycopharm';

      const [
        pharmacyCounts,
        storeCounts,
        pendingApprovals,
        productTotal,
        productActive,
        productDraft,
        channelCounts,
        contentCounts,
        forumCounts,
      ] = await Promise.all([
        // Organizations enrolled in glycopharm
        dataSource.query(`
          SELECT o."isActive" AS is_active, COUNT(*)::int AS cnt
          FROM organizations o
          JOIN organization_service_enrollments ose
            ON ose.organization_id = o.id AND ose.service_code = 'glycopharm'
          GROUP BY o."isActive"
        `) as Promise<Array<{ is_active: boolean; cnt: number }>>,

        // Organization stores
        dataSource.query(`
          SELECT os.status, COUNT(*)::int AS cnt
          FROM organization_stores os
          JOIN organizations o ON o.id = os."organizationId"
          JOIN organization_service_enrollments ose
            ON ose.organization_id = o.id AND ose.service_code = 'glycopharm'
          GROUP BY os.status
        `) as Promise<Array<{ status: string; cnt: number }>>,

        // Pending applications
        applicationRepo.count({ where: { status: 'submitted' } }),

        // Products
        productRepo.count(),
        productRepo.count({ where: { status: 'active' } }),
        productRepo.count({ where: { status: 'draft' } }),

        // Channels by type
        dataSource.query(`
          SELECT
            COALESCE(sc.channel_type, 'web') AS type,
            COUNT(*) FILTER (WHERE sc.is_active = true)::int AS active,
            COUNT(*) FILTER (WHERE sc.is_active = false)::int AS inactive,
            COUNT(*)::int AS total
          FROM store_channels sc
          JOIN organization_stores os ON os.id = sc.store_id
          JOIN organizations o ON o.id = os."organizationId"
          JOIN organization_service_enrollments ose
            ON ose.organization_id = o.id AND ose.service_code = 'glycopharm'
          GROUP BY sc.channel_type
        `).catch(() => []) as Promise<Array<{ type: string; active: number; inactive: number; total: number }>>,

        // CMS content counts by content type
        dataSource.query(`
          SELECT
            COUNT(*) FILTER (WHERE hcm.slot = 'hero')::int AS hero_total,
            COUNT(*) FILTER (WHERE hcm.slot = 'hero' AND cc.status = 'published')::int AS hero_active,
            COUNT(*) FILTER (WHERE hcm.slot = 'featured')::int AS featured_total,
            COUNT(*) FILTER (WHERE hcm.slot = 'event_notice')::int AS event_total,
            COUNT(*) FILTER (WHERE hcm.slot = 'event_notice' AND cc.status = 'published')::int AS event_active
          FROM hub_content_mappings hcm
          JOIN cms_contents cc ON cc.id = hcm.content_id
          WHERE hcm.service_key = 'glycopharm'
        `).catch(() => [{ hero_total: 0, hero_active: 0, featured_total: 0, event_total: 0, event_active: 0 }]) as Promise<Array<any>>,

        // Forum counts
        dataSource.query(`
          SELECT
            COUNT(*) FILTER (WHERE fc.status = 'active')::int AS open,
            COUNT(*) FILTER (WHERE fc.status = 'readonly')::int AS readonly,
            COUNT(*) FILTER (WHERE fc.status = 'closed')::int AS closed,
            COALESCE((SELECT COUNT(*)::int FROM forum_posts fp WHERE fp.category_id IN (
              SELECT fcc.id FROM forum_categories fcc WHERE fcc.service_code = 'glycopharm'
            )), 0) AS total_posts
          FROM forum_categories fc
          WHERE fc.service_code = 'glycopharm'
        `).catch(() => [{ open: 0, readonly: 0, closed: 0, total_posts: 0 }]) as Promise<Array<any>>,
      ]);

      const activePharmacies = pharmacyCounts.find(r => r.is_active === true)?.cnt || 0;
      const activeStores = storeCounts.find(r => r.status === 'active')?.cnt || 0;
      const inactiveStores = storeCounts.find(r => r.status === 'inactive')?.cnt || 0;

      const webChannel = channelCounts.find((c: any) => c.type === 'web');
      const kioskChannel = channelCounts.find((c: any) => c.type === 'kiosk');
      const tabletChannel = channelCounts.find((c: any) => c.type === 'tablet');

      const content = contentCounts[0] || {};
      const forum = forumCounts[0] || {};

      const data = {
        serviceStatus: {
          activePharmacies,
          approvedStores: activeStores,
          warnings: pendingApprovals,
          lastUpdated: new Date().toISOString(),
        },
        storeStatus: {
          pendingApprovals,
          supplementRequests: 0,
          activeStores,
          inactiveStores,
        },
        channelStatus: {
          web: { active: webChannel?.active || 0, pending: 0, inactive: webChannel?.inactive || 0 },
          kiosk: { active: kioskChannel?.active || 0, pending: 0, inactive: kioskChannel?.inactive || 0 },
          tablet: { active: tabletChannel?.active || 0, pending: 0, inactive: tabletChannel?.inactive || 0 },
        },
        contentStatus: {
          hero: { total: content.hero_total || 0, active: content.hero_active || 0 },
          featured: { total: content.featured_total || 0, operatorPicked: 0 },
          eventNotice: { total: content.event_total || 0, active: content.event_active || 0 },
        },
        trialStatus: {
          activeTrials: 0,
          connectedPharmacies: 0,
          pendingConnections: 0,
        },
        forumStatus: {
          open: forum.open || 0,
          readonly: forum.readonly || 0,
          closed: forum.closed || 0,
          totalPosts: forum.total_posts || 0,
        },
        productStats: {
          total: productTotal,
          active: productActive,
          draft: productDraft,
        },
        orderStats: {
          totalOrders: 0,
          paidOrders: 0,
          totalRevenue: 0,
        },
      };

      res.json({ success: true, data });
    } catch (error: any) {
      console.error('Failed to get admin dashboard:', error);
      res.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: error.message },
      });
    }
  });

  return router;
}
