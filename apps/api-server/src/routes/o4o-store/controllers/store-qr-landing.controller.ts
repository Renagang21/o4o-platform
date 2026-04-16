/**
 * Store QR Landing Controller
 *
 * WO-O4O-QR-LANDING-PAGE-V1
 * WO-O4O-QR-SCAN-ANALYTICS-V1
 * WO-O4O-QR-PRINT-MODULE-V2
 *
 * QR 코드 CRUD + 공개 랜딩 데이터 조회 + 스캔 이벤트 추적 + 출력.
 *
 * PUBLIC (no auth):
 *   GET  /qr/public/:slug  — QR 랜딩 데이터 조회 + scan event 기록
 *
 * AUTHENTICATED (requireAuth + requirePharmacyOwner):
 *   GET    /pharmacy/qr              — 내 QR 코드 목록 (scanCount 포함)
 *   POST   /pharmacy/qr/print        — 선택 QR 일괄 PDF 출력
 *   POST   /pharmacy/qr              — QR 코드 생성
 *   PUT    /pharmacy/qr/:id          — QR 코드 수정
 *   DELETE /pharmacy/qr/:id          — soft-delete
 *   GET    /pharmacy/qr/:id/analytics — QR 스캔 통계
 *   GET    /pharmacy/qr/:id/image    — QR 이미지 다운로드 (PNG/SVG)
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import { createHash } from 'crypto';
import { StoreQrCode } from '../../platform/entities/store-qr-code.entity.js';
import { asyncHandler } from '../../../middleware/error-handler.js';
import { createRequireStoreOwner } from '../../../utils/store-owner.utils.js';
import { generateQrPng, generateQrSvg, generateQrPrintPdf } from '../../../services/qr-print.service.js';
import type { QrPrintItem } from '../../../services/qr-print.service.js';
import { generateProductFlyer } from '../../../services/qr-flyer.service.js';
import type { FlyerProduct } from '../../../services/qr-flyer.service.js';

type AuthMiddleware = RequestHandler;

const PUBLIC_DOMAIN = process.env.PUBLIC_DOMAIN || 'o4o.kr';

function detectDeviceType(ua: string | undefined): string {
  if (!ua) return 'desktop';
  const lower = ua.toLowerCase();
  if (/tablet|ipad|playbook|silk/i.test(lower)) return 'tablet';
  if (/mobile|iphone|ipod|android.*mobile|windows phone/i.test(lower)) return 'mobile';
  return 'desktop';
}

function hashIp(ip: string | undefined): string | null {
  if (!ip) return null;
  return createHash('sha256').update(ip).digest('hex');
}

export function createStoreQrLandingController(
  dataSource: DataSource,
  requireAuth: AuthMiddleware,
): Router {
  const router = Router();
  const qrRepo = dataSource.getRepository(StoreQrCode);
  const requirePharmacyOwner = createRequireStoreOwner(dataSource);

  // ─── PUBLIC: GET /qr/public/:slug ──────────────────────────────
  router.get(
    '/qr/public/:slug',
    asyncHandler(async (req: Request, res: Response) => {
      const { slug } = req.params;

      const rows = await dataSource.query(
        `SELECT
           qr.id,
           qr.type,
           qr.title,
           qr.description,
           qr.landing_type AS "landingType",
           qr.landing_target_id AS "landingTargetId",
           qr.slug,
           qr.organization_id AS "organizationId",
           li.file_url AS "imageUrl",
           li.title AS "libraryItemTitle"
         FROM store_qr_codes qr
         LEFT JOIN store_library_items li
           ON li.id = qr.library_item_id AND li.is_active = true
         WHERE qr.slug = $1 AND qr.is_active = true
         LIMIT 1`,
        [slug],
      );

      if (rows.length === 0) {
        res.status(404).json({
          success: false,
          error: { code: 'QR_NOT_FOUND', message: 'QR code not found' },
        });
        return;
      }

      const qrData = rows[0];

      // ── Scan Event (fire-and-forget) ──
      const ua = req.get('user-agent');
      const ipRaw = req.get('x-forwarded-for')?.split(',')[0]?.trim() || req.socket.remoteAddress;
      const ipHashed = hashIp(ipRaw);

      // 5초 중복 방지: 같은 ipHash + qrCodeId
      dataSource.query(
        `INSERT INTO store_qr_scan_events
           (organization_id, qr_code_id, device_type, user_agent, referer, ip_hash)
         SELECT $1, $2, $3, $4, $5, $6
         WHERE NOT EXISTS (
           SELECT 1 FROM store_qr_scan_events
           WHERE qr_code_id = $2 AND ip_hash = $6
             AND created_at > NOW() - INTERVAL '5 seconds'
         )`,
        [
          qrData.organizationId,
          qrData.id,
          detectDeviceType(ua),
          ua || null,
          req.get('referer') || null,
          ipHashed,
        ],
      ).catch((err: unknown) => {
        console.error('[QR Scan Event] Insert failed:', err);
      });

      const storeRows = await dataSource.query(
        `SELECT slug FROM platform_store_slugs
         WHERE store_id = $1 AND is_active = true
         ORDER BY created_at DESC LIMIT 1`,
        [qrData.organizationId],
      );

      res.json({
        success: true,
        data: {
          ...qrData,
          storeSlug: storeRows[0]?.slug || null,
        },
      });
    }),
  );

  // ─── GET /pharmacy/qr — QR 코드 목록 (scanCount 포함) ─────────
  router.get(
    '/pharmacy/qr',
    requireAuth,
    requirePharmacyOwner,
    asyncHandler(async (req: Request, res: Response) => {
      const organizationId = (req as any).organizationId;
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
      const offset = (page - 1) * limit;

      // Raw SQL로 scanCount LEFT JOIN
      const [items, countResult] = await Promise.all([
        dataSource.query(
          `SELECT
             qr.id,
             qr.organization_id AS "organizationId",
             qr.type,
             qr.title,
             qr.description,
             qr.library_item_id AS "libraryItemId",
             qr.landing_type AS "landingType",
             qr.landing_target_id AS "landingTargetId",
             qr.slug,
             qr.is_active AS "isActive",
             qr.created_at AS "createdAt",
             qr.updated_at AS "updatedAt",
             COALESCE(sc.scan_count, 0)::int AS "scanCount"
           FROM store_qr_codes qr
           LEFT JOIN (
             SELECT qr_code_id, COUNT(*) AS scan_count
             FROM store_qr_scan_events
             WHERE organization_id = $1
             GROUP BY qr_code_id
           ) sc ON sc.qr_code_id = qr.id
           WHERE qr.organization_id = $1 AND qr.is_active = true
           ORDER BY qr.created_at DESC
           LIMIT $2 OFFSET $3`,
          [organizationId, limit, offset],
        ),
        dataSource.query(
          `SELECT COUNT(*)::int AS total
           FROM store_qr_codes
           WHERE organization_id = $1 AND is_active = true`,
          [organizationId],
        ),
      ]);

      res.json({
        success: true,
        data: { items, page, limit, total: countResult[0]?.total || 0 },
      });
    }),
  );

  // ─── GET /pharmacy/qr/:id/analytics — QR 스캔 통계 ────────────
  router.get(
    '/pharmacy/qr/:id/analytics',
    requireAuth,
    requirePharmacyOwner,
    asyncHandler(async (req: Request, res: Response) => {
      const organizationId = (req as any).organizationId;
      const { id } = req.params;

      // QR 소유권 확인
      const qr = await qrRepo.findOne({ where: { id, organizationId } });
      if (!qr) {
        res.status(404).json({
          success: false,
          error: { code: 'QR_NOT_FOUND', message: 'QR code not found' },
        });
        return;
      }

      const [statsResult, deviceResult] = await Promise.all([
        dataSource.query(
          `SELECT
             COUNT(*)::int AS "totalScans",
             COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE)::int AS "todayScans",
             COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days')::int AS "weeklyScans"
           FROM store_qr_scan_events
           WHERE qr_code_id = $1 AND organization_id = $2`,
          [id, organizationId],
        ),
        dataSource.query(
          `SELECT device_type AS "deviceType", COUNT(*)::int AS count
           FROM store_qr_scan_events
           WHERE qr_code_id = $1 AND organization_id = $2
           GROUP BY device_type`,
          [id, organizationId],
        ),
      ]);

      const stats = statsResult[0] || { totalScans: 0, todayScans: 0, weeklyScans: 0 };
      const deviceStats: Record<string, number> = { mobile: 0, tablet: 0, desktop: 0 };
      for (const row of deviceResult) {
        deviceStats[row.deviceType] = row.count;
      }

      res.json({
        success: true,
        data: { ...stats, deviceStats },
      });
    }),
  );

  // ─── GET /pharmacy/qr/:id/image — QR 이미지 다운로드 (PNG/SVG) ─
  router.get(
    '/pharmacy/qr/:id/image',
    requireAuth,
    requirePharmacyOwner,
    asyncHandler(async (req: Request, res: Response) => {
      const organizationId = (req as any).organizationId;
      const { id } = req.params;
      const format = (req.query.format as string) || 'png';
      const size = Math.min(1024, Math.max(128, parseInt(req.query.size as string) || 512));

      const qr = await qrRepo.findOne({ where: { id, organizationId } });
      if (!qr) {
        res.status(404).json({
          success: false,
          error: { code: 'QR_NOT_FOUND', message: 'QR code not found' },
        });
        return;
      }

      const qrUrl = `https://${PUBLIC_DOMAIN}/qr/${qr.slug}`;

      if (format === 'svg') {
        const svg = await generateQrSvg(qrUrl, size);
        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Content-Disposition', `attachment; filename="qr-${qr.slug}.svg"`);
        res.send(svg);
      } else {
        const png = await generateQrPng(qrUrl, size);
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Content-Disposition', `attachment; filename="qr-${qr.slug}.png"`);
        res.send(png);
      }
    }),
  );

  // ─── POST /pharmacy/qr/print — 선택 QR 일괄 PDF 출력 ─────────
  router.post(
    '/pharmacy/qr/print',
    requireAuth,
    requirePharmacyOwner,
    asyncHandler(async (req: Request, res: Response) => {
      const organizationId = (req as any).organizationId;
      const { qrIds } = req.body;

      if (!Array.isArray(qrIds) || qrIds.length === 0) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'qrIds array is required' },
        });
        return;
      }
      if (qrIds.length > 24) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Maximum 24 QR codes per print' },
        });
        return;
      }

      // 소유권 확인 + 데이터 로드
      const qrCodes = await qrRepo
        .createQueryBuilder('qr')
        .where('qr.organization_id = :organizationId', { organizationId })
        .andWhere('qr.id IN (:...ids)', { ids: qrIds })
        .andWhere('qr.is_active = true')
        .getMany();

      if (qrCodes.length === 0) {
        res.status(404).json({
          success: false,
          error: { code: 'QR_NOT_FOUND', message: 'No matching QR codes found' },
        });
        return;
      }

      const printItems: QrPrintItem[] = qrCodes.map((qr) => ({
        url: `https://${PUBLIC_DOMAIN}/qr/${qr.slug}`,
        title: qr.title,
        subtitle: `/qr/${qr.slug}`,
      }));

      const pdfBuffer = await generateQrPrintPdf(printItems);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="qr-print.pdf"');
      res.send(pdfBuffer);
    }),
  );

  // ─── GET /pharmacy/qr/:id/flyer — 상품 QR 전단지 PDF 출력 ─────
  // WO-O4O-STORE-QR-TEMPLATE-PRINT-UX-FINISH-V1
  router.get(
    '/pharmacy/qr/:id/flyer',
    requireAuth,
    requirePharmacyOwner,
    asyncHandler(async (req: Request, res: Response) => {
      const organizationId = (req as any).organizationId;
      const { id } = req.params;
      const template = parseInt(req.query.template as string);

      if (![1, 4, 8].includes(template)) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'template must be 1, 4, or 8' },
        });
        return;
      }

      const qr = await qrRepo.findOne({
        where: { id, organizationId, isActive: true },
      });

      if (!qr) {
        res.status(404).json({
          success: false,
          error: { code: 'QR_NOT_FOUND', message: 'QR code not found' },
        });
        return;
      }
      if (qr.landingType !== 'product' || !qr.landingTargetId) {
        res.status(400).json({
          success: false,
          error: { code: 'NOT_PRODUCT_QR', message: 'Flyer is only available for product-type QR codes with a target product' },
        });
        return;
      }

      // Resolve landingTargetId → supplier_product_offer
      // landingTargetId may be: supplier_product_offers.id OR organization_product_listings.id
      const targetId = qr.landingTargetId;
      const [productRow] = await dataSource.query(
        `SELECT
           COALESCE(pm.marketing_name, 'Unknown') AS product_name,
           pm.brand_name,
           spo.price_general,
           spo.id AS offer_id
         FROM supplier_product_offers spo
         LEFT JOIN product_masters pm ON pm.id = spo.master_id
         WHERE spo.id = $1 AND spo.is_active = true
         UNION
         SELECT
           COALESCE(pm.marketing_name, 'Unknown') AS product_name,
           pm.brand_name,
           spo.price_general,
           spo.id AS offer_id
         FROM organization_product_listings opl
         JOIN supplier_product_offers spo ON spo.id = opl.offer_id
         LEFT JOIN product_masters pm ON pm.id = spo.master_id
         WHERE opl.id = $1 AND spo.is_active = true
         LIMIT 1`,
        [targetId],
      );

      if (!productRow) {
        res.status(404).json({
          success: false,
          error: { code: 'PRODUCT_NOT_FOUND', message: 'Product not found for this QR code' },
        });
        return;
      }

      // Get store name
      const [orgRow] = await dataSource.query(
        `SELECT name FROM organizations WHERE id = $1 LIMIT 1`,
        [organizationId],
      );

      const qrUrl = `https://${PUBLIC_DOMAIN}/qr/${qr.slug}`;
      const flyerProduct: FlyerProduct = {
        productName: productRow.product_name,
        brandName: productRow.brand_name || undefined,
        price: Number(productRow.price_general) || 0,
        storeName: orgRow?.name || '약국',
        qrUrl,
      };

      const pdfBuffer = await generateProductFlyer(flyerProduct, template as 1 | 4 | 8);
      const safeName = (flyerProduct.productName).replace(/[^a-zA-Z0-9가-힣\s]/g, '').trim().slice(0, 30);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="flyer-${safeName}-${template}.pdf"`);
      res.send(pdfBuffer);
    }),
  );

  // ─── POST /pharmacy/qr — QR 코드 생성 ─────────────────────────
  router.post(
    '/pharmacy/qr',
    requireAuth,
    requirePharmacyOwner,
    asyncHandler(async (req: Request, res: Response) => {
      const organizationId = (req as any).organizationId;
      const { title, description, type, libraryItemId, landingType, landingTargetId, slug } = req.body;

      if (!title || typeof title !== 'string' || title.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'title is required' },
        });
        return;
      }
      if (!slug || typeof slug !== 'string' || slug.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'slug is required' },
        });
        return;
      }
      if (!landingType || !['product', 'promotion', 'page', 'link'].includes(landingType)) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid landingType' },
        });
        return;
      }

      const existing = await qrRepo.findOne({ where: { slug: slug.trim() } });
      if (existing) {
        res.status(409).json({
          success: false,
          error: { code: 'SLUG_CONFLICT', message: 'Slug already in use' },
        });
        return;
      }

      const item = qrRepo.create({
        organizationId,
        type: type || landingType,
        title: title.trim(),
        description: description || null,
        libraryItemId: libraryItemId || null,
        landingType,
        landingTargetId: landingTargetId || null,
        slug: slug.trim(),
        isActive: true,
      });

      const saved = await qrRepo.save(item);

      // WO-O4O-PRODUCT-MARKETING-GRAPH-V1: Auto-link QR → Product
      if (landingType === 'product' && landingTargetId) {
        dataSource.query(
          `INSERT INTO product_marketing_assets (organization_id, product_id, asset_type, asset_id)
           VALUES ($1, $2, 'qr', $3)
           ON CONFLICT (product_id, asset_type, asset_id) DO NOTHING`,
          [organizationId, landingTargetId, saved.id],
        ).catch((err: unknown) => {
          console.error('[ProductMarketingGraph] Auto-link QR failed:', err);
        });
      }

      res.status(201).json({ success: true, data: saved });
    }),
  );

  // ─── PUT /pharmacy/qr/:id — QR 코드 수정 ──────────────────────
  router.put(
    '/pharmacy/qr/:id',
    requireAuth,
    requirePharmacyOwner,
    asyncHandler(async (req: Request, res: Response) => {
      const organizationId = (req as any).organizationId;
      const { id } = req.params;

      const item = await qrRepo.findOne({ where: { id, organizationId } });

      if (!item) {
        res.status(404).json({
          success: false,
          error: { code: 'QR_NOT_FOUND', message: 'QR code not found' },
        });
        return;
      }

      const { title, description, type, libraryItemId, landingType, landingTargetId, slug } = req.body;

      if (title !== undefined) item.title = String(title).trim();
      if (description !== undefined) item.description = description;
      if (type !== undefined) item.type = type;
      if (libraryItemId !== undefined) item.libraryItemId = libraryItemId;
      if (landingType !== undefined) item.landingType = landingType;
      if (landingTargetId !== undefined) item.landingTargetId = landingTargetId;
      if (slug !== undefined && slug !== item.slug) {
        const conflict = await qrRepo.findOne({ where: { slug: slug.trim() } });
        if (conflict) {
          res.status(409).json({
            success: false,
            error: { code: 'SLUG_CONFLICT', message: 'Slug already in use' },
          });
          return;
        }
        item.slug = slug.trim();
      }

      const saved = await qrRepo.save(item);
      res.json({ success: true, data: saved });
    }),
  );

  // ─── DELETE /pharmacy/qr/:id — soft-delete ────────────────────
  router.delete(
    '/pharmacy/qr/:id',
    requireAuth,
    requirePharmacyOwner,
    asyncHandler(async (req: Request, res: Response) => {
      const organizationId = (req as any).organizationId;
      const { id } = req.params;

      const item = await qrRepo.findOne({ where: { id, organizationId } });

      if (!item) {
        res.status(404).json({
          success: false,
          error: { code: 'QR_NOT_FOUND', message: 'QR code not found' },
        });
        return;
      }

      item.isActive = false;
      await qrRepo.save(item);
      res.json({ success: true, message: 'QR code deactivated' });
    }),
  );

  return router;
}
