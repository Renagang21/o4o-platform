/**
 * Store Hub Controller — Unified Storefront Rendering API
 *
 * WO-STORE-HUB-UNIFIED-RENDERING-PHASE1-V1
 * WO-PHARMACY-HUB-CHANNEL-LAYER-UI-V1 (channels endpoint)
 * WO-CHANNEL-CREATION-FLOW-SIMPLIFICATION-V1 (channel creation)
 *
 * Aggregates Products / Contents / Signage summaries from multiple services
 * into a single response for the pharmacy owner's "cyber store" dashboard.
 *
 * Principle: read-only aggregation, no new tables, graceful degradation.
 */

import { Router, Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { KpaMember } from '../entities/kpa-member.entity.js';
import type { AuthRequest } from '../../../types/auth.js';
import { hasAnyServiceRole } from '../../../utils/role.utils.js';
import { cacheAside, hashCacheKey, READ_CACHE_TTL } from '../../../cache/read-cache.js';
import { OrganizationChannel } from '../entities/organization-channel.entity.js';

type AuthMiddleware = import('express').RequestHandler;

// ─────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────

async function getUserOrganizationId(
  dataSource: DataSource,
  userId: string
): Promise<string | null> {
  const memberRepo = dataSource.getRepository(KpaMember);
  const member = await memberRepo.findOne({ where: { user_id: userId } });
  return member?.organization_id || null;
}

function isPharmacyOwnerRole(roles: string[], user?: any): boolean {
  // 1. pharmacistRole === 'pharmacy_owner' (DB column, carried in JWT)
  if (user?.pharmacistRole === 'pharmacy_owner') return true;
  // 2. KPA admin/operator roles also have store access
  return hasAnyServiceRole(roles, [
    'kpa:branch_admin', 'kpa:branch_operator', 'kpa:admin', 'kpa:operator',
  ]);
}

// ─────────────────────────────────────────────────────
// Response types
// ─────────────────────────────────────────────────────

interface StoreHubOverview {
  organizationId: string;
  organizationName: string | null;
  products: {
    glycopharm: { totalCount: number; link: string };
    cosmetics: { listedCount: number; link: string };
  };
  contents: {
    slots: Array<{
      serviceKey: string;
      slotKey: string;
      count: number;
      link: string;
    }>;
    totalSlotCount: number;
  };
  signage: {
    pharmacy: { contentCount: number; activeCount: number; link: string };
  };
}

// ─────────────────────────────────────────────────────
// Controller
// ─────────────────────────────────────────────────────

export function createStoreHubController(
  dataSource: DataSource,
  requireAuth: AuthMiddleware
): Router {
  const router = Router();

  /**
   * GET /store-hub/overview
   *
   * Returns unified summary of all service assets linked to the user's organization.
   */
  router.get(
    '/overview',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const authReq = req as AuthRequest;
        const userId = authReq.user?.id;
        const userRoles = authReq.user?.roles || [];

        if (!userId) {
          res.status(401).json({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'User ID not found' },
          });
          return;
        }

        if (!isPharmacyOwnerRole(userRoles, authReq.user)) {
          res.status(403).json({
            success: false,
            error: { code: 'FORBIDDEN', message: 'Pharmacy owner or operator role required' },
          });
          return;
        }

        const organizationId = await getUserOrganizationId(dataSource, userId);
        if (!organizationId) {
          res.json({
            success: true,
            data: null,
            message: 'User not associated with an organization',
          });
          return;
        }

        // Fetch organization name
        let organizationName: string | null = null;
        try {
          const orgResult = await dataSource.query(
            `SELECT name FROM organizations WHERE id = $1`,
            [organizationId]
          );
          organizationName = orgResult[0]?.name || null;
        } catch { /* graceful degradation */ }

        // ── Section A: Products ──────────────────────────
        // Phase 1: No direct org→pharmacy mapping exists across services.
        // Provide link-only with 0 count (graceful degradation).
        //
        // WO-STORE-LOCAL-PRODUCT-HARDENING-V1: KPI 오염 방지
        // 이 Hub Overview는 서비스별 Commerce Product만 집계한다.
        // StoreLocalProduct(store_local_products)는 Display Domain이며
        // 이 KPI 집계에 포함되지 않는다. (별도 Display 관리 API로 조회)
        const products = {
          glycopharm: {
            totalCount: 0,
            link: '/glycopharm/store',
          },
          cosmetics: {
            listedCount: 0,
            link: '/k-cosmetics/store',
          },
        };

        // ── Section B: Contents (cms_content_slots) ──────
        // cms_content_slots has organizationId — the ONE reliable cross-service connection.
        let contentSlots: Array<{ serviceKey: string; slotKey: string; count: number; link: string }> = [];
        let totalSlotCount = 0;
        try {
          const slotsResult = await dataSource.query(
            `SELECT "serviceKey", "slotKey", COUNT(*)::int as count
             FROM cms_content_slots
             WHERE "organizationId" = $1 AND "isActive" = true
             GROUP BY "serviceKey", "slotKey"
             ORDER BY "serviceKey", "slotKey"`,
            [organizationId]
          );
          contentSlots = (slotsResult || []).map((row: any) => ({
            serviceKey: row.serviceKey || 'unknown',
            slotKey: row.slotKey,
            count: row.count,
            link: `/operator/content`,
          }));
          totalSlotCount = contentSlots.reduce((sum, s) => sum + s.count, 0);
        } catch { /* graceful degradation — table may not exist */ }

        // Also count cms_contents directly scoped to this organization
        let orgContentCount = 0;
        try {
          const contentResult = await dataSource.query(
            `SELECT COUNT(*)::int as count
             FROM cms_contents
             WHERE "organizationId" = $1 AND status = 'published'`,
            [organizationId]
          );
          orgContentCount = contentResult[0]?.count || 0;
        } catch { /* graceful degradation */ }

        if (orgContentCount > 0 && contentSlots.length === 0) {
          contentSlots.push({
            serviceKey: 'kpa',
            slotKey: 'org-contents',
            count: orgContentCount,
            link: '/operator/content',
          });
          totalSlotCount = orgContentCount;
        }

        // ── Section C: Signage ───────────────────────────
        // signage_pharmacy.pharmacy_contents has organizationId
        let signageContentCount = 0;
        let signageActiveCount = 0;
        try {
          const signageResult = await dataSource.query(
            `SELECT
               COUNT(*)::int as total,
               COUNT(*) FILTER (WHERE status = 'published')::int as active
             FROM signage_pharmacy.pharmacy_contents
             WHERE "organizationId" = $1`,
            [organizationId]
          );
          signageContentCount = signageResult[0]?.total || 0;
          signageActiveCount = signageResult[0]?.active || 0;
        } catch { /* graceful degradation — schema/table may not exist */ }

        const overview: StoreHubOverview = {
          organizationId,
          organizationName,
          products,
          contents: {
            slots: contentSlots,
            totalSlotCount,
          },
          signage: {
            pharmacy: {
              contentCount: signageContentCount,
              activeCount: signageActiveCount,
              link: '/signage',
            },
          },
        };

        res.json({ success: true, data: overview });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    }
  );

  /**
   * GET /store-hub/channels
   *
   * WO-PHARMACY-HUB-CHANNEL-LAYER-UI-V1
   * WO-PHARMACY-CHANNEL-KPI-STABILIZATION-V1 (KPI fields)
   *
   * Returns channel ownership overview with KPI metrics.
   * Read-only — no status changes, no order creation.
   */
  router.get(
    '/channels',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const authReq = req as AuthRequest;
        const userId = authReq.user?.id;
        const userRoles = authReq.user?.roles || [];

        if (!userId) {
          res.status(401).json({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'User ID not found' },
          });
          return;
        }

        if (!isPharmacyOwnerRole(userRoles, authReq.user)) {
          res.status(403).json({
            success: false,
            error: { code: 'FORBIDDEN', message: 'Pharmacy owner or operator role required' },
          });
          return;
        }

        const organizationId = await getUserOrganizationId(dataSource, userId);
        if (!organizationId) {
          res.json({ success: true, data: [] });
          return;
        }

        // WO-O4O-GA-PRELAUNCH-VERIFICATION-V1: cache-aside (TTL 30s)
        const channels = await cacheAside(
          hashCacheKey(`hub:ch:${organizationId}`, {}),
          READ_CACHE_TTL.HUB_KPI,
          () => dataSource.query(
            `SELECT
               oc.id,
               oc.channel_type AS "channelType",
               oc.status,
               oc.approved_at AS "approvedAt",
               oc.created_at AS "createdAt",
               oc.updated_at AS "updatedAt",
               COALESCE(stats.visible_count, 0)::int AS "visibleProductCount",
               COALESCE(stats.total_count, 0)::int AS "totalProductCount",
               COALESCE(stats.limit_count, 0)::int AS "salesLimitConfiguredCount"
             FROM organization_channels oc
             LEFT JOIN (
               SELECT
                 opc.channel_id,
                 COUNT(*) AS total_count,
                 COUNT(*) FILTER (
                   WHERE opc.is_active = true
                     AND opl.is_active = true
                     AND oc_sub.status = 'APPROVED'
                     AND (
                       (opl.product_id IS NULL AND gp.status = 'active')
                       OR
                       (opl.product_id IS NOT NULL AND nsp.is_active = true AND ns.status = 'ACTIVE')
                     )
                 ) AS visible_count,
                 COUNT(*) FILTER (WHERE opc.sales_limit IS NOT NULL) AS limit_count
               FROM organization_product_channels opc
               JOIN organization_product_listings opl ON opl.id = opc.product_listing_id
               JOIN organization_channels oc_sub ON oc_sub.id = opc.channel_id
               LEFT JOIN glycopharm_products gp ON gp.id::text = opl.external_product_id AND opl.product_id IS NULL
               LEFT JOIN neture_supplier_products nsp ON nsp.id = opl.product_id
               LEFT JOIN neture_suppliers ns ON ns.id = nsp.supplier_id
               GROUP BY opc.channel_id
             ) stats ON stats.channel_id = oc.id
             WHERE oc.organization_id = $1
             ORDER BY oc.created_at ASC`,
            [organizationId],
          ),
        );

        // WO-CHANNEL-EXECUTION-CONSOLE-V1: attach org code for storefront preview
        let organizationCode: string | null = null;
        try {
          const orgRow = await dataSource.query(
            `SELECT code FROM organizations WHERE id = $1`,
            [organizationId]
          );
          organizationCode = orgRow[0]?.code || null;
        } catch { /* graceful degradation */ }

        res.json({ success: true, data: channels, organizationCode });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    }
  );

  /**
   * POST /store-hub/channels
   *
   * WO-CHANNEL-CREATION-FLOW-SIMPLIFICATION-V1
   * WO-STORE-CHANNEL-BASE-RIGHT-ACTIVATION-V1
   *
   * Creates a new channel for the user's organization.
   * All 4 base-right channels (B2C/KIOSK/TABLET/SIGNAGE) → APPROVED immediately.
   */
  router.post(
    '/channels',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const authReq = req as AuthRequest;
        const userId = authReq.user?.id;
        const userRoles = authReq.user?.roles || [];

        if (!userId) {
          res.status(401).json({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'User ID not found' },
          });
          return;
        }

        if (!isPharmacyOwnerRole(userRoles, authReq.user)) {
          res.status(403).json({
            success: false,
            error: { code: 'FORBIDDEN', message: 'Pharmacy owner or operator role required' },
          });
          return;
        }

        const organizationId = await getUserOrganizationId(dataSource, userId);
        if (!organizationId) {
          res.status(403).json({
            success: false,
            error: { code: 'NO_ORGANIZATION', message: 'No organization found' },
          });
          return;
        }

        const { channelType } = req.body;
        const VALID_TYPES = ['B2C', 'KIOSK', 'TABLET', 'SIGNAGE'];

        if (!channelType || !VALID_TYPES.includes(channelType)) {
          res.status(400).json({
            success: false,
            error: { code: 'INVALID_INPUT', message: `channelType must be one of: ${VALID_TYPES.join(', ')}` },
          });
          return;
        }

        // WO-STORE-CHANNEL-BASE-RIGHT-ACTIVATION-V1:
        // All 4 channel types are base-right channels → APPROVED immediately.
        // External/partner channels (future) will use PENDING flow.
        const status = 'APPROVED';
        const approvedAt = new Date();

        const channelRepo = dataSource.getRepository(OrganizationChannel);
        const newChannel = channelRepo.create({
          organization_id: organizationId,
          channel_type: channelType,
          status,
          approved_at: approvedAt,
        });

        const saved = await channelRepo.save(newChannel);

        res.status(201).json({
          success: true,
          data: {
            id: saved.id,
            channelType: saved.channel_type,
            status: saved.status,
            approvedAt: saved.approved_at?.toISOString() ?? null,
            createdAt: saved.created_at.toISOString(),
            visibleProductCount: 0,
            totalProductCount: 0,
            salesLimitConfiguredCount: 0,
          },
        });
      } catch (error: any) {
        // Handle unique constraint violation (organization_id, channel_type)
        if (error.code === '23505') {
          res.status(409).json({
            success: false,
            error: { code: 'ALREADY_EXISTS', message: 'This channel type already exists for your organization' },
          });
          return;
        }
        res.status(500).json({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    }
  );

  /**
   * GET /store-hub/kpi-summary
   *
   * WO-O4O-STORE-KPI-REALDATA-V1
   *
   * Returns order/revenue KPI summary from checkout_orders.
   * Graceful degradation if table does not exist.
   */
  router.get(
    '/kpi-summary',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const authReq = req as AuthRequest;
        const userId = authReq.user?.id;
        const userRoles = authReq.user?.roles || [];

        if (!userId) {
          res.status(401).json({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'User ID not found' },
          });
          return;
        }

        if (!isPharmacyOwnerRole(userRoles, authReq.user)) {
          res.status(403).json({
            success: false,
            error: { code: 'FORBIDDEN', message: 'Pharmacy owner or operator role required' },
          });
          return;
        }

        const organizationId = await getUserOrganizationId(dataSource, userId);
        if (!organizationId) {
          res.json({
            success: true,
            data: {
              todayOrders: 0, weekOrders: 0, monthOrders: 0,
              monthRevenue: 0, avgOrderValue: 0, lastMonthRevenue: 0,
            },
          });
          return;
        }

        // WO-O4O-GA-PRELAUNCH-VERIFICATION-V1: cache-aside (TTL 30s)
        const kpi = await cacheAside(
          hashCacheKey(`hub:kpi:${organizationId}`, {}),
          READ_CACHE_TTL.HUB_KPI,
          async () => {
            let result = {
              todayOrders: 0,
              weekOrders: 0,
              monthOrders: 0,
              monthRevenue: 0,
              avgOrderValue: 0,
              lastMonthRevenue: 0,
            };

            try {
              const rows = await dataSource.query(
                `SELECT
                   COUNT(*) FILTER (
                     WHERE "createdAt" >= CURRENT_DATE AND status = 'paid'
                   )::int AS "todayOrders",
                   COUNT(*) FILTER (
                     WHERE "createdAt" >= date_trunc('week', CURRENT_DATE) AND status = 'paid'
                   )::int AS "weekOrders",
                   COUNT(*) FILTER (
                     WHERE "createdAt" >= date_trunc('month', CURRENT_DATE) AND status = 'paid'
                   )::int AS "monthOrders",
                   COALESCE(SUM("totalAmount") FILTER (
                     WHERE "createdAt" >= date_trunc('month', CURRENT_DATE) AND status = 'paid'
                   ), 0)::numeric AS "monthRevenue",
                   COALESCE(SUM("totalAmount") FILTER (
                     WHERE "createdAt" >= date_trunc('month', CURRENT_DATE) - INTERVAL '1 month'
                       AND "createdAt" < date_trunc('month', CURRENT_DATE)
                       AND status = 'paid'
                   ), 0)::numeric AS "lastMonthRevenue"
                 FROM checkout_orders
                 WHERE "sellerOrganizationId" = $1`,
                [organizationId],
              );

              const row = rows[0];
              if (row) {
                const monthOrders = Number(row.todayOrders !== undefined ? row.monthOrders : 0);
                const monthRevenue = Number(row.monthRevenue || 0);
                result = {
                  todayOrders: Number(row.todayOrders || 0),
                  weekOrders: Number(row.weekOrders || 0),
                  monthOrders,
                  monthRevenue,
                  avgOrderValue: monthOrders > 0 ? Math.round(monthRevenue / monthOrders) : 0,
                  lastMonthRevenue: Number(row.lastMonthRevenue || 0),
                };
              }
            } catch {
              /* graceful degradation — checkout_orders table may not exist */
            }

            return result;
          },
        );

        res.json({ success: true, data: kpi });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    }
  );

  /**
   * GET /store-hub/live-signals
   *
   * WO-O4O-STORE-LIVE-SIGNAL-LAYER-V1
   *
   * Returns live operational signal counts for polling.
   * Graceful degradation per data source.
   */
  router.get(
    '/live-signals',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const authReq = req as AuthRequest;
        const userId = authReq.user?.id;
        const userRoles = authReq.user?.roles || [];

        if (!userId) {
          res.status(401).json({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'User ID not found' },
          });
          return;
        }

        if (!isPharmacyOwnerRole(userRoles, authReq.user)) {
          res.status(403).json({
            success: false,
            error: { code: 'FORBIDDEN', message: 'Pharmacy owner or operator role required' },
          });
          return;
        }

        const organizationId = await getUserOrganizationId(dataSource, userId);

        const signals = {
          newOrders: 0,
          pendingTabletRequests: 0,
          pendingSalesRequests: 0,
          surveyRequests: 0,
        };

        // 1. Unfulfilled paid orders — action signal, not daily stat
        if (organizationId) {
          try {
            const rows = await dataSource.query(
              `SELECT COUNT(*)::int AS count
               FROM checkout_orders
               WHERE "sellerOrganizationId" = $1
                 AND status = 'paid'`,
              [organizationId]
            );
            signals.newOrders = rows[0]?.count || 0;
          } catch { /* checkout_orders may not exist */ }
        }

        // 2. Pending tablet requests (via pharmacy ownership)
        try {
          const rows = await dataSource.query(
            `SELECT COUNT(*)::int AS count
             FROM tablet_service_requests tsr
             JOIN glycopharm_pharmacies gp ON gp.id = tsr.pharmacy_id
             WHERE gp.created_by_user_id = $1
               AND tsr.status = 'requested'`,
            [userId]
          );
          signals.pendingTabletRequests = rows[0]?.count || 0;
        } catch { /* table may not exist */ }

        // 3. Pending customer requests — sales + survey (via pharmacy ownership)
        try {
          const rows = await dataSource.query(
            `SELECT
               COUNT(*) FILTER (WHERE purpose = 'order')::int AS "salesCount",
               COUNT(*) FILTER (WHERE purpose = 'survey_followup')::int AS "surveyCount"
             FROM glycopharm_customer_requests gcr
             JOIN glycopharm_pharmacies gp ON gp.id = gcr.pharmacy_id
             WHERE gp.created_by_user_id = $1
               AND gcr.status = 'pending'`,
            [userId]
          );
          signals.pendingSalesRequests = rows[0]?.salesCount || 0;
          signals.surveyRequests = rows[0]?.surveyCount || 0;
        } catch { /* table may not exist */ }

        res.json({ success: true, data: signals });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    }
  );

  return router;
}
