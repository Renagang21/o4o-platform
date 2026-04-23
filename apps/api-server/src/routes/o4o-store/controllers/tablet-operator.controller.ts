/**
 * Tablet Operator Controller — WO-TABLET-OPERATOR-UI-V1
 *
 * 타블렛 채널 노출 설정을 운영 UI에서 관리할 수 있는 Operator API.
 *
 * 설계 원칙:
 * - 공급자 상품 원본을 직접 참조하는 구조 유지 (복사 금지)
 * - 운영자는 organization_product_listings 기반 상품의 TABLET 채널 노출 여부만 관리
 * - TABLET organization_channel이 없으면 자동 생성(APPROVED)
 * - organization_product_listings가 없는 상품은 노출 불가 (별도 진열 등록 필요)
 *
 * Endpoints (mounted at /api/v1/store):
 *   GET  /tablet/operator/channel                          — TABLET 채널 상태 조회
 *   GET  /tablet/operator/products                         — 진열 상품 + 타블렛 노출 상태
 *   PATCH /tablet/operator/products/:listingId/visibility  — 타블렛 노출 ON/OFF
 */

import { Router, Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import { createRequireStoreOwner } from '../../../utils/store-owner.utils.js';

type AuthMiddleware = import('express').RequestHandler;

export function createTabletOperatorController(
  dataSource: DataSource,
): Router {
  const router = Router();
  const requireStoreOwner = createRequireStoreOwner(dataSource);

  // Lazy-load requireAuth (same pattern as store-tablet.routes.ts)
  let _requireAuth: AuthMiddleware;
  async function getRequireAuth(): Promise<AuthMiddleware> {
    if (!_requireAuth) {
      const mod = await import('../../../middleware/auth.middleware.js');
      _requireAuth = mod.requireAuth as AuthMiddleware;
    }
    return _requireAuth;
  }

  /** requireAuth + requireStoreOwner 체인 래퍼 */
  function withAuth(
    handler: (req: Request, res: Response, organizationId: string) => Promise<void>,
  ) {
    return async (req: Request, res: Response): Promise<void> => {
      try {
        const auth = await getRequireAuth();
        await new Promise<void>((resolve, reject) => {
          (auth as any)(req, res, (err: any) => (err ? reject(err) : resolve()));
        });
      } catch {
        return;
      }

      let passed = false;
      await new Promise<void>((resolve) => {
        (requireStoreOwner as any)(req, res, (err: any) => {
          if (!err) passed = true;
          resolve();
        });
      });
      if (!passed || !req.organizationId) return;

      await handler(req, res, req.organizationId);
    };
  }

  /**
   * TABLET 채널 조회 또는 없으면 APPROVED로 자동 생성.
   */
  async function ensureTabletChannel(
    organizationId: string,
  ): Promise<{ id: string; status: string }> {
    const rows = await dataSource.query(
      `SELECT id, status FROM organization_channels
       WHERE organization_id = $1 AND channel_type = 'TABLET'
       LIMIT 1`,
      [organizationId],
    );
    if (rows.length > 0) return { id: rows[0].id, status: rows[0].status };

    const inserted = await dataSource.query(
      `INSERT INTO organization_channels
         (organization_id, channel_type, status, approved_at, config, created_at, updated_at)
       VALUES ($1, 'TABLET', 'APPROVED', NOW(), '{}', NOW(), NOW())
       RETURNING id, status`,
      [organizationId],
    );
    return { id: inserted[0].id, status: inserted[0].status };
  }

  // ─── GET /tablet/operator/channel ───────────────────────────────────────
  router.get(
    '/tablet/operator/channel',
    withAuth(async (_req, res, organizationId) => {
      try {
        const rows = await dataSource.query(
          `SELECT id, channel_type AS "channelType", status,
                  approved_at AS "approvedAt", created_at AS "createdAt"
           FROM organization_channels
           WHERE organization_id = $1 AND channel_type = 'TABLET'
           LIMIT 1`,
          [organizationId],
        );
        res.json({
          success: true,
          data: rows.length > 0
            ? { exists: true, channel: rows[0] }
            : { exists: false, channel: null },
        });
      } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
      }
    }),
  );

  // ─── GET /tablet/operator/products ──────────────────────────────────────
  /**
   * 조직의 진열 상품(organization_product_listings) + 타블렛 노출 상태 반환.
   *
   * Query params:
   *   search  — 상품명 검색 (ILIKE)
   *   visible — 'true' | 'false' | (없으면 전체)
   *   page    — (default 1)
   *   limit   — (default 20, max 100)
   */
  router.get(
    '/tablet/operator/products',
    withAuth(async (req, res, organizationId) => {
      try {
        const { search, visible } = req.query;
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
        const offset = (page - 1) * limit;

        // org의 APPROVED TABLET channel id
        const channelRows = await dataSource.query(
          `SELECT id FROM organization_channels
           WHERE organization_id = $1 AND channel_type = 'TABLET' AND status = 'APPROVED'
           LIMIT 1`,
          [organizationId],
        );
        const tabletChannelId: string | null =
          channelRows.length > 0 ? channelRows[0].id : null;

        const params: any[] = [organizationId];
        let idx = 2;
        const conditions: string[] = ['opl.organization_id = $1'];

        if (search) {
          conditions.push(
            `(pm.name ILIKE $${idx} OR pm.regulatory_name ILIKE $${idx} OR ns.company_name ILIKE $${idx})`,
          );
          params.push(`%${search}%`);
          idx++;
        }

        const whereClause = conditions.join(' AND ');

        const channelJoin = tabletChannelId
          ? `LEFT JOIN organization_product_channels opc
               ON opc.product_listing_id = opl.id
               AND opc.channel_id = '${tabletChannelId}'
               AND opc.is_active = true`
          : '';

        const visibleExpr = tabletChannelId ? `(opc.id IS NOT NULL)` : `false`;

        // visible 필터 조건
        let visibleFilter = '';
        if (visible === 'true') visibleFilter = `AND ${visibleExpr}`;
        if (visible === 'false') visibleFilter = `AND NOT ${visibleExpr}`;

        // COUNT
        const countRows = await dataSource.query(
          `SELECT COUNT(*) AS total
           FROM organization_product_listings opl
           LEFT JOIN supplier_product_offers spo ON spo.id = opl.offer_id
           LEFT JOIN product_masters pm ON pm.id = opl.master_id
           LEFT JOIN neture_suppliers ns ON ns.id = spo.supplier_id
           ${channelJoin}
           WHERE ${whereClause} ${visibleFilter}`,
          params,
        );

        // Data
        const rows = await dataSource.query(
          `SELECT
             opl.id AS "listingId",
             opl.offer_id AS "offerId",
             opl.master_id AS "masterId",
             opl.is_active AS "listingActive",
             opl.service_key AS "serviceKey",
             pm.name AS "productName",
             pm.regulatory_name AS "regulatoryName",
             pm.specification,
             ns.company_name AS "supplierName",
             spo.price_general AS "priceGeneral",
             (
               SELECT image_url FROM product_images
               WHERE master_id = opl.master_id AND is_primary = true
               LIMIT 1
             ) AS "imageUrl",
             ${visibleExpr} AS "tabletVisible"
           FROM organization_product_listings opl
           LEFT JOIN supplier_product_offers spo ON spo.id = opl.offer_id
           LEFT JOIN product_masters pm ON pm.id = opl.master_id
           LEFT JOIN neture_suppliers ns ON ns.id = spo.supplier_id
           ${channelJoin}
           WHERE ${whereClause} ${visibleFilter}
           ORDER BY pm.name ASC NULLS LAST, opl.created_at DESC
           LIMIT $${idx} OFFSET $${idx + 1}`,
          [...params, limit, offset],
        );

        res.json({
          success: true,
          data: {
            items: rows,
            total: parseInt(countRows[0]?.total ?? '0', 10),
            page,
            limit,
            tabletChannelId,
          },
        });
      } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
      }
    }),
  );

  // ─── PATCH /tablet/operator/products/:listingId/visibility ──────────────
  /**
   * 타블렛 노출 ON/OFF.
   * Body: { visible: boolean }
   *
   * ON:  TABLET channel 없으면 자동 생성 → organization_product_channels upsert
   * OFF: organization_product_channels.is_active = false
   */
  router.patch(
    '/tablet/operator/products/:listingId/visibility',
    withAuth(async (req, res, organizationId) => {
      try {
        const { listingId } = req.params;
        const { visible } = req.body;

        if (typeof visible !== 'boolean') {
          res.status(400).json({
            success: false,
            error: '`visible` (boolean) is required',
          });
          return;
        }

        // listing이 이 org 소속인지 확인
        const listingRows = await dataSource.query(
          `SELECT id FROM organization_product_listings
           WHERE id = $1 AND organization_id = $2`,
          [listingId, organizationId],
        );
        if (listingRows.length === 0) {
          res.status(404).json({ success: false, error: 'Product listing not found' });
          return;
        }

        if (visible) {
          const channel = await ensureTabletChannel(organizationId);

          const existing = await dataSource.query(
            `SELECT id, is_active FROM organization_product_channels
             WHERE channel_id = $1 AND product_listing_id = $2`,
            [channel.id, listingId],
          );

          if (existing.length === 0) {
            const maxOrder = await dataSource.query(
              `SELECT COALESCE(MAX(display_order), -1) + 1 AS "nextOrder"
               FROM organization_product_channels WHERE channel_id = $1`,
              [channel.id],
            );
            await dataSource.query(
              `INSERT INTO organization_product_channels
                 (channel_id, product_listing_id, is_active, display_order, created_at, updated_at)
               VALUES ($1, $2, true, $3, NOW(), NOW())`,
              [channel.id, listingId, maxOrder[0]?.nextOrder ?? 0],
            );
          } else if (!existing[0].is_active) {
            await dataSource.query(
              `UPDATE organization_product_channels
               SET is_active = true, updated_at = NOW()
               WHERE id = $1`,
              [existing[0].id],
            );
          }

          res.json({ success: true, data: { listingId, tabletVisible: true } });
        } else {
          const channelRows = await dataSource.query(
            `SELECT id FROM organization_channels
             WHERE organization_id = $1 AND channel_type = 'TABLET'
             LIMIT 1`,
            [organizationId],
          );

          if (channelRows.length > 0) {
            await dataSource.query(
              `UPDATE organization_product_channels
               SET is_active = false, updated_at = NOW()
               WHERE channel_id = $1 AND product_listing_id = $2`,
              [channelRows[0].id, listingId],
            );
          }

          res.json({ success: true, data: { listingId, tabletVisible: false } });
        }
      } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
      }
    }),
  );

  return router;
}
