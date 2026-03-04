/**
 * Product Marketing Controller
 *
 * WO-O4O-PRODUCT-MARKETING-GRAPH-V1
 *
 * 상품 ↔ 마케팅 자산(QR, POP, Library, Signage) 연결 그래프 API.
 *
 * AUTHENTICATED (requireAuth + requirePharmacyOwner):
 *   GET    /pharmacy/products/:productId/marketing  — 상품별 마케팅 자산 조회
 *   POST   /pharmacy/products/:productId/marketing  — 마케팅 자산 연결
 *   DELETE /pharmacy/products/:productId/marketing/:assetId — 연결 해제
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import { asyncHandler } from '../../../middleware/error-handler.js';
import { createRequireStoreOwner } from '../../../utils/store-owner.utils.js';

type AuthMiddleware = RequestHandler;

export function createProductMarketingController(
  dataSource: DataSource,
  requireAuth: AuthMiddleware,
): Router {
  const router = Router();
  const requirePharmacyOwner = createRequireStoreOwner(dataSource);

  // ─── GET /pharmacy/products/:productId/marketing ─────────────
  router.get(
    '/pharmacy/products/:productId/marketing',
    requireAuth,
    requirePharmacyOwner,
    asyncHandler(async (req: Request, res: Response) => {
      const organizationId = (req as any).organizationId;
      const { productId } = req.params;

      // 연결된 자산 ID 목록 조회
      const links = await dataSource.query(
        `SELECT id, asset_type AS "assetType", asset_id AS "assetId", created_at AS "createdAt"
         FROM product_marketing_assets
         WHERE organization_id = $1 AND product_id = $2
         ORDER BY created_at DESC`,
        [organizationId, productId],
      );

      // 자산 타입별 ID 분류
      const qrIds: string[] = [];
      const libraryIds: string[] = [];
      for (const link of links) {
        if (link.assetType === 'qr') qrIds.push(link.assetId);
        if (link.assetType === 'library') libraryIds.push(link.assetId);
      }

      // QR 자산 상세 조회 (scanCount 포함)
      let qrAssets: any[] = [];
      if (qrIds.length > 0) {
        const placeholders = qrIds.map((_, i) => `$${i + 3}`).join(', ');
        qrAssets = await dataSource.query(
          `SELECT
             qr.id,
             qr.title,
             qr.slug,
             qr.landing_type AS "landingType",
             qr.is_active AS "isActive",
             qr.created_at AS "createdAt",
             COALESCE(sc.cnt, 0)::int AS "scanCount"
           FROM store_qr_codes qr
           LEFT JOIN (
             SELECT qr_code_id, COUNT(*) AS cnt
             FROM store_qr_scan_events
             WHERE organization_id = $1
             GROUP BY qr_code_id
           ) sc ON sc.qr_code_id = qr.id
           WHERE qr.organization_id = $1 AND qr.id IN (${placeholders})
           ORDER BY qr.created_at DESC`,
          [organizationId, productId, ...qrIds],
        );
      }

      // Library 자산 상세 조회
      let libraryAssets: any[] = [];
      if (libraryIds.length > 0) {
        const placeholders = libraryIds.map((_, i) => `$${i + 2}`).join(', ');
        libraryAssets = await dataSource.query(
          `SELECT
             id, title, description, file_url AS "fileUrl",
             mime_type AS "mimeType", category, is_active AS "isActive",
             created_at AS "createdAt"
           FROM store_library_items
           WHERE organization_id = $1 AND id IN (${placeholders})
           ORDER BY created_at DESC`,
          [organizationId, ...libraryIds],
        );
      }

      res.json({
        success: true,
        data: {
          productId,
          links,
          qrAssets,
          libraryAssets,
          summary: {
            totalLinks: links.length,
            qrCount: qrIds.length,
            libraryCount: libraryIds.length,
            totalScans: qrAssets.reduce((sum: number, qr: any) => sum + (qr.scanCount || 0), 0),
          },
        },
      });
    }),
  );

  // ─── POST /pharmacy/products/:productId/marketing ────────────
  router.post(
    '/pharmacy/products/:productId/marketing',
    requireAuth,
    requirePharmacyOwner,
    asyncHandler(async (req: Request, res: Response) => {
      const organizationId = (req as any).organizationId;
      const { productId } = req.params;
      const { assetType, assetId } = req.body;

      if (!assetType || !['qr', 'library', 'pop', 'signage'].includes(assetType)) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'assetType must be qr, library, pop, or signage' },
        });
        return;
      }
      if (!assetId) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'assetId is required' },
        });
        return;
      }

      // 중복 방지 (UNIQUE 인덱스에 의해 보호됨)
      try {
        const result = await dataSource.query(
          `INSERT INTO product_marketing_assets (organization_id, product_id, asset_type, asset_id)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (product_id, asset_type, asset_id) DO NOTHING
           RETURNING id, asset_type AS "assetType", asset_id AS "assetId", created_at AS "createdAt"`,
          [organizationId, productId, assetType, assetId],
        );

        if (result.length === 0) {
          res.json({ success: true, data: null, message: 'Already linked' });
          return;
        }

        res.status(201).json({ success: true, data: result[0] });
      } catch (err: any) {
        res.status(500).json({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Failed to create link' },
        });
      }
    }),
  );

  // ─── DELETE /pharmacy/products/:productId/marketing/:linkId ──
  router.delete(
    '/pharmacy/products/:productId/marketing/:linkId',
    requireAuth,
    requirePharmacyOwner,
    asyncHandler(async (req: Request, res: Response) => {
      const organizationId = (req as any).organizationId;
      const { productId, linkId } = req.params;

      const result = await dataSource.query(
        `DELETE FROM product_marketing_assets
         WHERE id = $1 AND organization_id = $2 AND product_id = $3
         RETURNING id`,
        [linkId, organizationId, productId],
      );

      if (result.length === 0) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Marketing asset link not found' },
        });
        return;
      }

      res.json({ success: true, message: 'Link removed' });
    }),
  );

  return router;
}
