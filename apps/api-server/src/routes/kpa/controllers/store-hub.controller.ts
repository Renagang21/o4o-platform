/**
 * Store Hub Controller — Unified Storefront Rendering API
 *
 * WO-STORE-HUB-UNIFIED-RENDERING-PHASE1-V1
 * WO-PHARMACY-HUB-CHANNEL-LAYER-UI-V1 (channels endpoint)
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

function isPharmacyOwnerRole(roles: string[]): boolean {
  // KPA pharmacy owner: has kpa:branch_admin or kpa:branch_operator or kpa:admin/operator
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

        if (!isPharmacyOwnerRole(userRoles)) {
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
            `SELECT name FROM kpa_organizations WHERE id = $1`,
            [organizationId]
          );
          organizationName = orgResult[0]?.name || null;
        } catch { /* graceful degradation */ }

        // ── Section A: Products ──────────────────────────
        // Phase 1: No direct org→pharmacy mapping exists across services.
        // Provide link-only with 0 count (graceful degradation).
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
   *
   * Returns channel ownership overview for the user's organization.
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

        if (!isPharmacyOwnerRole(userRoles)) {
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

        // Fetch channels with product count per channel
        const channels = await dataSource.query(
          `SELECT
             oc.id,
             oc.channel_type AS "channelType",
             oc.status,
             oc.approved_at AS "approvedAt",
             oc.created_at AS "createdAt",
             COALESCE(pc.product_count, 0)::int AS "visibleProductCount"
           FROM organization_channels oc
           LEFT JOIN (
             SELECT channel_id, COUNT(*) AS product_count
             FROM organization_product_channels
             WHERE is_active = true
             GROUP BY channel_id
           ) pc ON pc.channel_id = oc.id
           WHERE oc.organization_id = $1
           ORDER BY oc.created_at ASC`,
          [organizationId]
        );

        res.json({ success: true, data: channels });
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
