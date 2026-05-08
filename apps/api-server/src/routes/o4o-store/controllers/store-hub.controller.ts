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
import { createRequireStoreOwner, type StoreOwnerServiceKey } from '../../../utils/store-owner.utils.js';
import { optionalStoreAuth } from '../../../auth/auth-context.middleware.js';
import { cacheAside, hashCacheKey, READ_CACHE_TTL } from '../../../cache/read-cache.js';
import { OrganizationChannel } from '../../../modules/store-core/entities/organization-channel.entity.js';
import { StoreCapabilityService } from '../../../modules/store-core/services/store-capability.service.js';
import { getCapabilityMeta } from '@o4o/capabilities';
// WO-O4O-STORE-SLUG-EDITABLE-V1: slug change endpoint reuses existing core service.
import { StoreSlugService, type StoreSlugServiceKey } from '@o4o/platform-core/store-identity';

type AuthMiddleware = import('express').RequestHandler;

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
  requireAuth: AuthMiddleware,
  // WO-O4O-STORE-GUARD-PHASE2C-CONFIG-AND-HUB-V1:
  //   serviceKey 지정 시 해당 서비스의 store_owner role 만 통과 (cross-service leakage 차단).
  //   미지정 시 기존 동작 유지 (back-compat).
  serviceKey?: StoreOwnerServiceKey,
): Router {
  const router = Router();
  const requirePharmacyOwner = createRequireStoreOwner(dataSource, serviceKey);
  // WO-O4O-STORE-HUB-OPTIONAL-AUTH-MIGRATION-V1: serviceKey 전파 →
  //   read-only GET endpoint 도 cross-service routing 차단 (req.organizationId 미설정).
  const optionalAuth = optionalStoreAuth(dataSource, serviceKey);

  /**
   * GET /store-hub/overview
   *
   * Returns unified summary of all service assets linked to the user's organization.
   */
  router.get(
    '/overview',
    requireAuth,
    optionalAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const organizationId = req.organizationId;
        if (!organizationId) {
          res.json({ success: true, data: null, message: 'User not associated with an organization' });
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
    optionalAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const organizationId = req.organizationId;
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
               COALESCE(stats.limit_count, 0)::int AS "salesLimitConfiguredCount",
               COALESCE(stats.public_count, 0)::int AS "publicProductCount",
               COALESCE(stats.service_count, 0)::int AS "serviceProductCount",
               COALESCE(stats.private_count, 0)::int AS "privateProductCount"
             FROM organization_channels oc
             LEFT JOIN (
               SELECT
                 opc.channel_id,
                 COUNT(*) AS total_count,
                 COUNT(*) FILTER (
                   WHERE opc.is_active = true
                     AND opl.is_active = true
                     AND oc_sub.status = 'APPROVED'
                     AND nsp.is_active = true
                     AND ns.status = 'ACTIVE'
                 ) AS visible_count,
                 COUNT(*) FILTER (WHERE opc.sales_limit IS NOT NULL) AS limit_count,
                 COUNT(*) FILTER (
                   WHERE opc.is_active = true AND opl.is_active = true
                     AND oc_sub.status = 'APPROVED' AND nsp.is_active = true
                     AND ns.status = 'ACTIVE' AND nsp.distribution_type = 'PUBLIC'
                 ) AS public_count,
                 COUNT(*) FILTER (
                   WHERE opc.is_active = true AND opl.is_active = true
                     AND oc_sub.status = 'APPROVED' AND nsp.is_active = true
                     AND ns.status = 'ACTIVE' AND nsp.distribution_type = 'SERVICE'
                 ) AS service_count,
                 COUNT(*) FILTER (
                   WHERE opc.is_active = true AND opl.is_active = true
                     AND oc_sub.status = 'APPROVED' AND nsp.is_active = true
                     AND ns.status = 'ACTIVE' AND nsp.distribution_type = 'PRIVATE'
                 ) AS private_count
               FROM organization_product_channels opc
               JOIN organization_product_listings opl ON opl.id = opc.product_listing_id
               JOIN organization_channels oc_sub ON oc_sub.id = opc.channel_id
               JOIN supplier_product_offers nsp ON nsp.id = opl.offer_id
               JOIN neture_suppliers ns ON ns.id = nsp.supplier_id
               GROUP BY opc.channel_id
             ) stats ON stats.channel_id = oc.id
             WHERE oc.organization_id = $1
             ORDER BY oc.created_at ASC`,
            [organizationId],
          ),
        );

        // WO-CHANNEL-EXECUTION-CONSOLE-V1: attach slug for storefront preview
        // WO-STORE-COMMON-SETTINGS-POST-VERIFY-V1: use platform_store_slugs
        // instead of organizations.code — the store-settings controller resolves
        // via StoreSlugService.findBySlug() which reads platform_store_slugs.
        let organizationCode: string | null = null;
        try {
          const slugRow = await dataSource.query(
            `SELECT slug FROM platform_store_slugs WHERE store_id = $1 AND is_active = true ORDER BY created_at ASC LIMIT 1`,
            [organizationId]
          );
          organizationCode = slugRow[0]?.slug || null;
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
    requirePharmacyOwner,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const organizationId = req.organizationId!;

        const { channelType } = req.body;
        const VALID_TYPES = ['B2C', 'KIOSK', 'TABLET', 'SIGNAGE'];

        if (!channelType || !VALID_TYPES.includes(channelType)) {
          res.status(400).json({
            success: false,
            error: { code: 'INVALID_INPUT', message: `channelType must be one of: ${VALID_TYPES.join(', ')}` },
          });
          return;
        }

        // WO-O4O-STORE-CAPABILITY-SYSTEM-V1:
        // Channel 생성 전 해당 capability 활성 여부 확인
        const CHANNEL_CAPABILITY_MAP: Record<string, string> = {
          B2C: 'B2C_COMMERCE', TABLET: 'TABLET', KIOSK: 'KIOSK', SIGNAGE: 'SIGNAGE',
        };
        const requiredCap = CHANNEL_CAPABILITY_MAP[channelType];
        if (requiredCap) {
          const capSvc = new StoreCapabilityService(dataSource);
          const capEnabled = await capSvc.isEnabled(organizationId, requiredCap as any);
          if (!capEnabled) {
            res.status(403).json({
              success: false,
              error: { code: 'STORE_CAPABILITY_DISABLED', message: `'${requiredCap}' capability must be enabled first` },
            });
            return;
          }
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
   * GET /store-hub/slug
   *
   * WO-O4O-STORE-SLUG-EDITABLE-V1
   *
   * 현재 매장의 slug + canChange 플래그 반환.
   * 응답에 service-slug serviceKey 미포함 (controller serviceKey context 에서 결정).
   */
  router.get(
    '/slug',
    requireAuth,
    requirePharmacyOwner,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const organizationId = req.organizationId!;
        if (!serviceKey) {
          res.status(400).json({
            success: false,
            error: { code: 'SERVICE_KEY_REQUIRED', message: 'Slug 변경은 서비스 컨텍스트가 필요합니다.' },
          });
          return;
        }

        const slugService = new StoreSlugService(dataSource);
        const slugSvcKey = serviceKey as StoreSlugServiceKey;
        const record = await slugService.findByStoreId(organizationId, slugSvcKey);
        const canChange = await slugService.canChangeSlug(organizationId);

        res.json({
          success: true,
          data: {
            slug: record?.slug ?? null,
            isActive: record?.isActive ?? false,
            canChange,
          },
        });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    }
  );

  /**
   * PATCH /store-hub/slug
   *
   * WO-O4O-STORE-SLUG-EDITABLE-V1
   *
   * 매장 slug 를 변경한다. StoreSlugService.changeSlug() 가 처리:
   *   - validateSlug (length / format / RESERVED 차단)
   *   - duplicate 검사 (platform_store_slugs unique)
   *   - history 저장 (platform_store_slug_history.old_slug → new_slug)
   *   - active 레코드 업데이트
   * 1-time change policy 가 platform-core 에 적용되어 있으므로 추가 변경은 거부됨.
   *
   * Body: { newSlug: string }
   * 권한: requireAuth + requirePharmacyOwner (serviceKey context)
   */
  router.patch(
    '/slug',
    requireAuth,
    requirePharmacyOwner,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const organizationId = req.organizationId!;
        const userId = req.user!.id;
        if (!serviceKey) {
          res.status(400).json({
            success: false,
            error: { code: 'SERVICE_KEY_REQUIRED', message: 'Slug 변경은 서비스 컨텍스트가 필요합니다.' },
          });
          return;
        }

        const newSlugInput = req.body?.newSlug;
        if (typeof newSlugInput !== 'string' || newSlugInput.trim().length === 0) {
          res.status(400).json({
            success: false,
            error: { code: 'INVALID_INPUT', message: '새 주소(slug)를 입력해주세요.' },
          });
          return;
        }
        const newSlug = newSlugInput.trim();

        const slugService = new StoreSlugService(dataSource);
        const slugSvcKey = serviceKey as StoreSlugServiceKey;

        // 자기 자신의 현재 slug 와 동일하면 no-op (의도적 허용 — 이미 사용 중)
        const current = await slugService.findByStoreId(organizationId, slugSvcKey);
        if (current && current.slug === newSlug.toLowerCase()) {
          res.json({
            success: true,
            data: { slug: current.slug, unchanged: true },
          });
          return;
        }

        // availability 사전 검증 — 명확한 error code 매핑
        const availability = await slugService.checkAvailability(newSlug);
        if (!availability.available) {
          if (availability.reason === 'reserved') {
            res.status(400).json({
              success: false,
              error: { code: 'SLUG_RESERVED', message: '사용할 수 없는 주소입니다.' },
            });
            return;
          }
          if (availability.reason === 'duplicate') {
            res.status(409).json({
              success: false,
              error: { code: 'SLUG_DUPLICATE', message: '이미 사용 중인 주소입니다.' },
            });
            return;
          }
          // 'invalid' (TOO_SHORT / TOO_LONG / INVALID_CHARACTERS / hyphen 등)
          res.status(400).json({
            success: false,
            error: {
              code: 'SLUG_INVALID',
              message: '잘못된 주소 형식입니다.',
              detail: availability.validationError ?? null,
            },
          });
          return;
        }

        // canChangeSlug — 1-time policy 확인
        const canChange = await slugService.canChangeSlug(organizationId);
        if (!canChange) {
          res.status(409).json({
            success: false,
            error: {
              code: 'SLUG_ALREADY_CHANGED',
              message: '이 매장은 이미 주소가 변경되었습니다. 추가 변경은 운영팀에 문의하세요.',
            },
          });
          return;
        }

        // changeSlug — history 저장 + active 업데이트
        const updated = await slugService.changeSlug({
          storeId: organizationId,
          serviceKey: slugSvcKey,
          newSlug,
          changedBy: userId,
        });

        res.json({
          success: true,
          data: {
            slug: updated.slug,
            unchanged: false,
          },
        });
      } catch (error: any) {
        // changeSlug 가 throw 하는 메시지를 식별 — 이미 위에서 사전 검증하지만 race-condition 대비
        const msg = String(error?.message || '');
        if (/already changed/i.test(msg)) {
          res.status(409).json({
            success: false,
            error: {
              code: 'SLUG_ALREADY_CHANGED',
              message: '이 매장은 이미 주소가 변경되었습니다. 추가 변경은 운영팀에 문의하세요.',
            },
          });
          return;
        }
        if (/not available/i.test(msg)) {
          res.status(409).json({
            success: false,
            error: { code: 'SLUG_DUPLICATE', message: '이미 사용 중인 주소입니다.' },
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
    optionalAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const organizationId = req.organizationId;
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
    optionalAuth,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const organizationId = req.organizationId;
        const userId = req.user?.id;

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

        // 2. Pending tablet interest requests
        // WO-O4O-STORE-TABLET-LEGACY-CLEANUP-V1: tablet_service_requests → tablet_interest_requests
        if (organizationId) {
          try {
            const rows = await dataSource.query(
              `SELECT COUNT(*)::int AS count
               FROM tablet_interest_requests
               WHERE organization_id = $1
                 AND status = 'REQUESTED'`,
              [organizationId]
            );
            signals.pendingTabletRequests = rows[0]?.count || 0;
          } catch { /* table may not exist */ }
        }

        // 3. Pending customer requests — sales + survey (via pharmacy ownership)
        if (userId) {
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
        }

        res.json({ success: true, data: signals });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    }
  );

  /**
   * GET /store-hub/capabilities
   *
   * WO-O4O-STORE-CAPABILITY-SYSTEM-V1
   *
   * Returns store-owner's capability list (read-only).
   */
  router.get(
    '/capabilities',
    requireAuth,
    requirePharmacyOwner,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const organizationId = req.organizationId;
        if (!organizationId) {
          res.json({ success: true, data: [] });
          return;
        }
        const capSvc = new StoreCapabilityService(dataSource);
        const caps = await capSvc.getCapabilities(organizationId);

        res.json({
          success: true,
          data: caps.map((c) => ({
            key: c.capability_key,
            label: getCapabilityMeta(c.capability_key)?.label ?? c.capability_key,
            category: getCapabilityMeta(c.capability_key)?.category ?? 'commerce',
            enabled: c.enabled,
            source: c.source,
          })),
        });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    },
  );

  return router;
}
