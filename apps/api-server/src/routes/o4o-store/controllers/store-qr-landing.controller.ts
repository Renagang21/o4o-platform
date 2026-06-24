/**
 * Store QR Landing Controller
 *
 * WO-O4O-QR-LANDING-PAGE-V1
 * WO-O4O-QR-SCAN-ANALYTICS-V1
 * WO-O4O-QR-PRINT-MODULE-V2
 * WO-STORE-QR-PRODUCT-DIRECT-LINK-V1: 공급자 상품 직접 연결 지원
 *
 * QR 코드 CRUD + 공개 랜딩 데이터 조회 + 스캔 이벤트 추적 + 출력.
 *
 * PUBLIC (no auth):
 *   GET  /qr/public/:slug  — QR 랜딩 데이터 조회 + scan event 기록 (product 타입 시 상품 정보 포함)
 *
 * AUTHENTICATED (requireAuth + requirePharmacyOwner):
 *   GET    /pharmacy/qr/source/products — 공급자 상품 목록 (QR 직접 연결용)
 *   GET    /pharmacy/qr              — 내 QR 코드 목록 (scanCount 포함)
 *   POST   /pharmacy/qr/print        — 선택 QR 일괄 PDF 출력
 *   POST   /pharmacy/qr              — QR 코드 생성 (productId 직접 연결 지원)
 *   PUT    /pharmacy/qr/:id          — QR 코드 수정
 *   DELETE /pharmacy/qr/:id          — soft-delete
 *   GET    /pharmacy/qr/:id/analytics — QR 스캔 통계
 *   GET    /pharmacy/qr/:id/image    — QR 이미지 다운로드 (PNG/SVG)
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import { createHash } from 'crypto';
import { StoreQrCode } from '../../platform/entities/store-qr-code.entity.js';
import { StoreExecutionAsset } from '../../platform/entities/store-execution-asset.entity.js';
import { asyncHandler } from '../../../middleware/error-handler.js';
import { createRequireStoreOwner, type StoreOwnerServiceKey } from '../../../utils/store-owner.utils.js';
// WO-KPA-STORE-ASSET-DERIVATION-QR-BLOG-WRITEPATH-V1: 원본(library)→qr_code 관계 기록
import { recordDerivations } from '../services/store-asset-derivation.service.js';
import { generateQrPng, generateQrSvg, generateQrPrintPdf, generateQrPosterPdf, presetToPixelSize } from '../../../services/qr-print.service.js';
import type { QrPrintItem, QrExportPreset, QrPosterItem } from '../../../services/qr-print.service.js';
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
  // WO-O4O-STORE-GUARD-PHASE2A-CHANNEL-AND-QR-V1:
  //   serviceKey 지정 시 해당 서비스의 store_owner role 만 통과 (cross-service leakage 차단).
  //   미지정 시 기존 동작 유지 (back-compat).
  serviceKey?: StoreOwnerServiceKey,
): Router {
  const router = Router();
  const qrRepo = dataSource.getRepository(StoreQrCode);
  const requirePharmacyOwner = createRequireStoreOwner(dataSource, serviceKey);

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
         LEFT JOIN store_execution_assets li
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

      // WO-STORE-QR-PRODUCT-DIRECT-LINK-V1: product 타입 QR이면 상품 정보 포함
      let productDetails: Record<string, unknown> | null = null;
      if (qrData.landingType === 'product' && qrData.landingTargetId) {
        const productRows = await dataSource.query(
          `SELECT
             COALESCE(pm.name, pm.regulatory_name, 'Unknown') AS name,
             pm.brand_name AS "brandName",
             spo.price_general::int AS price,
             pm.specification AS description
           FROM supplier_product_offers spo
           LEFT JOIN product_masters pm ON pm.id = spo.master_id
           WHERE spo.id = $1 AND spo.is_active = true
           UNION
           SELECT
             COALESCE(pm.name, pm.regulatory_name, 'Unknown') AS name,
             pm.brand_name AS "brandName",
             spo.price_general::int AS price,
             pm.specification AS description
           FROM organization_product_listings opl
           JOIN supplier_product_offers spo ON spo.id = opl.offer_id
           LEFT JOIN product_masters pm ON pm.id = spo.master_id
           WHERE opl.id = $1 AND spo.is_active = true
           LIMIT 1`,
          [qrData.landingTargetId],
        );
        productDetails = productRows[0] || null;
      }

      // WO-O4O-KPA-QR-CODE-VIDEO-CONTENT-V1: video 타입 QR이면 store_videos 사본의 외부 URL 포함.
      //   landingTargetId = store_videos 사본 id. 같은 organization 의 사본만 통과 (boundary).
      //   공개 뷰어가 일반 KPA 레이아웃 없이 동영상만 렌더하기 위해 videoUrl 을 직접 내려준다.
      let videoUrl: string | null = null;
      if (qrData.landingType === 'video' && qrData.landingTargetId) {
        const videoRows = await dataSource.query(
          `SELECT video_url AS "videoUrl"
           FROM store_videos
           WHERE id = $1 AND store_id = $2
           LIMIT 1`,
          [qrData.landingTargetId, qrData.organizationId],
        );
        videoUrl = videoRows[0]?.videoUrl || null;
      }

      // WO-O4O-KPA-QR-PAGE-LANDING-RENDER-V1:
      //   landing_type='page' 이면 콘텐츠 본문을 inline 으로 내려준다(고객이 앱 내부로 진입하지 않고
      //   공개 landing 에서 바로 본문을 읽음). content_hub picker 가 저장한 landing_target_id =
      //   kpa_contents.id (UUID). UUID 형태가 아니면(blog/cms/pop slug 등) 시도하지 않고
      //   frontend 기존 redirect 흐름으로 폴백.
      //   노출 정책(WO-O4O-KPA-CONTENT-STATUS-SEMANTICS-AUDIT-V1):
      //   is_deleted=false 且 status IN ('ready','published'). content-meta SSOT 상 kpa_contents 의
      //   노출 가능 상태는 'ready'('발행 가능/검토 완료'=운영자 '완료'). 'draft'/'private'/기타는
      //   고객에게 노출하지 않고 fallback 안내. body(HTML) 우선, legacy blocks 폴백.
      const EXPOSABLE_CONTENT_STATUS = ['ready', 'published'];
      let pageContent:
        | { available: false; reason: 'unpublished' }
        | { available: true; title: string; summary: string | null; body: string | null; blocks: unknown[]; source: 'content_hub' }
        | null = null;
      const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (qrData.landingType === 'page' && qrData.landingTargetId && UUID_RE.test(qrData.landingTargetId)) {
        const contentRows = await dataSource.query(
          `SELECT title, summary, body, blocks, status
           FROM kpa_contents
           WHERE id = $1 AND is_deleted = false
           LIMIT 1`,
          [qrData.landingTargetId],
        );
        const c = contentRows[0];
        // 행이 없으면 pageContent=null 로 둔다 — content_hub 가 아닌 page ref(blog/cms/pop)의
        // 기존 redirect 폴백을 보존하기 위함(비-content_hub 회귀 방지).
        if (c) {
          if (EXPOSABLE_CONTENT_STATUS.includes(c.status)) {
            pageContent = {
              available: true,
              title: c.title,
              summary: c.summary ?? null,
              body: c.body ?? null,
              blocks: Array.isArray(c.blocks) ? c.blocks : [],
              source: 'content_hub',
            };
          } else {
            // draft/private/archived 등 — 비노출(상태 세부는 고객에게 노출하지 않음)
            pageContent = { available: false, reason: 'unpublished' };
          }
        }
      }

      res.json({
        success: true,
        data: {
          ...qrData,
          storeSlug: storeRows[0]?.slug || null,
          productDetails,
          videoUrl,
          pageContent,
        },
      });
    }),
  );

  // ─── GET /pharmacy/qr/source/products — 공급자 상품 목록 (직접 연결용) ─
  // WO-STORE-QR-PRODUCT-DIRECT-LINK-V1
  router.get(
    '/pharmacy/qr/source/products',
    requireAuth,
    requirePharmacyOwner,
    asyncHandler(async (req: Request, res: Response) => {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
      const offset = (page - 1) * limit;
      const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

      const params: (string | number)[] = [limit, offset];
      let searchClause = '';
      if (search) {
        params.push(`%${search}%`);
        const idx = params.length;
        searchClause = `AND (pm.name ILIKE $${idx} OR pm.brand_name ILIKE $${idx})`;
      }

      const [rows, countResult] = await Promise.all([
        dataSource.query(
          `SELECT
             spo.id,
             COALESCE(pm.name, pm.regulatory_name, 'Unknown') AS name,
             pm.brand_name AS "brandName",
             spo.price_general::int AS price,
             pm.specification AS description
           FROM supplier_product_offers spo
           JOIN product_masters pm ON pm.id = spo.master_id
           WHERE spo.is_active = true
             AND spo.approval_status = 'APPROVED'
             AND spo.distribution_type = 'PUBLIC'
             ${searchClause}
           ORDER BY pm.name ASC
           LIMIT $1 OFFSET $2`,
          params,
        ),
        dataSource.query(
          `SELECT COUNT(*)::int AS total
           FROM supplier_product_offers spo
           JOIN product_masters pm ON pm.id = spo.master_id
           WHERE spo.is_active = true
             AND spo.approval_status = 'APPROVED'
             AND spo.distribution_type = 'PUBLIC'
             ${searchClause}`,
          search ? [`%${search}%`] : [],
        ),
      ]);

      res.json({
        success: true,
        data: { items: rows, total: countResult[0]?.total || 0, page, limit },
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

  // ─── GET /pharmacy/qr/:id/export — 단일 QR 통합 export (PNG/SVG/PDF + preset) ─
  // WO-O4O-KPA-STORE-QR-PRINT-EXPORT-FOUNDATION-V1
  //   format: png | svg | pdf
  //   preset: small | medium | large (png/svg 해상도) | a4 | a4_4up (pdf 레이아웃)
  //   모든 QR 타입 지원(상품 전용 flyer 와 별개). 매장 소유 + is_active QR 만.
  //   QR 에는 항상 /qr/:slug public URL 을 담는다(외부 URL QR 도 추적 위해 slug 경유).
  router.get(
    '/pharmacy/qr/:id/export',
    requireAuth,
    requirePharmacyOwner,
    asyncHandler(async (req: Request, res: Response) => {
      const organizationId = (req as any).organizationId;
      const { id } = req.params;
      const format = ((req.query.format as string) || 'png').toLowerCase();
      const presetRaw = ((req.query.preset as string) || '').toLowerCase();

      const VALID_FORMATS = ['png', 'svg', 'pdf'];
      if (!VALID_FORMATS.includes(format)) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: `format must be one of: ${VALID_FORMATS.join(', ')}` },
        });
        return;
      }

      // 삭제(비활성) QR 은 export 불가
      const qr = await qrRepo.findOne({ where: { id, organizationId, isActive: true } });
      if (!qr) {
        res.status(404).json({
          success: false,
          error: { code: 'QR_NOT_FOUND', message: 'QR code not found' },
        });
        return;
      }

      // 외부 URL QR 이라도 public /qr/:slug 를 담는다(스캔 추적 보존)
      const qrUrl = `https://${PUBLIC_DOMAIN}/qr/${qr.slug}`;

      if (format === 'pdf') {
        const perPage: 1 | 4 = presetRaw === 'a4_4up' ? 4 : 1;
        const [orgRow] = await dataSource.query(
          `SELECT name FROM organizations WHERE id = $1 LIMIT 1`,
          [organizationId],
        );
        const item: QrPosterItem = {
          url: qrUrl,
          title: qr.title,
          description: qr.description || undefined,
          storeName: orgRow?.name || undefined,
        };
        // 4분할은 동일 QR 4개를 한 장에 배치(절취 사용)
        const items = perPage === 4 ? [item, item, item, item] : [item];
        const pdfBuffer = await generateQrPosterPdf(items, perPage);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="qr-${qr.slug}-${perPage === 4 ? 'a4-4up' : 'a4'}.pdf"`);
        res.send(pdfBuffer);
        return;
      }

      // png | svg — preset(small/medium/large) → 픽셀 해상도. quiet zone(margin=4) 보장.
      const rasterPreset: QrExportPreset = (['small', 'medium', 'large'] as const).includes(presetRaw as any)
        ? (presetRaw as QrExportPreset)
        : 'medium';
      const size = presetToPixelSize(rasterPreset);

      if (format === 'svg') {
        const svg = await generateQrSvg(qrUrl, size, 4);
        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Content-Disposition', `attachment; filename="qr-${qr.slug}.svg"`);
        res.send(svg);
      } else {
        const png = await generateQrPng(qrUrl, size, 4);
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
           COALESCE(pm.name, 'Unknown') AS product_name,
           pm.brand_name,
           spo.price_general,
           spo.id AS offer_id
         FROM supplier_product_offers spo
         LEFT JOIN product_masters pm ON pm.id = spo.master_id
         WHERE spo.id = $1 AND spo.is_active = true
         UNION
         SELECT
           COALESCE(pm.name, 'Unknown') AS product_name,
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
      const asciiPart = safeName.replace(/[^\x20-\x7E]/g, '').trim() || 'flyer';
      const encodedPart = encodeURIComponent(`flyer-${safeName}-${template}.pdf`);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="flyer-${asciiPart}-${template}.pdf"; filename*=UTF-8''${encodedPart}`);
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
      // WO-STORE-QR-PRODUCT-DIRECT-LINK-V1: productId 직접 연결 지원
      const { title, description, type, libraryItemId, landingType, landingTargetId, productId, slug } = req.body;

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
      // WO-O4O-KPA-QR-CODE-VIDEO-CONTENT-V1: 'video' 추가 (landingTargetId = store_videos 사본 id).
      //   QR 전용 연결 타입 — 사이니지/블로그/POP 와 의미가 섞이지 않는다.
      if (!landingType || !['product', 'promotion', 'page', 'link', 'video'].includes(landingType)) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid landingType' },
        });
        return;
      }

      // productId 검증 (product 타입이고 productId 제공 시)
      let resolvedLandingTargetId: string | null = landingTargetId || null;
      if (landingType === 'product' && productId) {
        const [productCheck] = await dataSource.query(
          `SELECT spo.id FROM supplier_product_offers spo
           WHERE spo.id = $1
             AND spo.is_active = true
             AND spo.approval_status = 'APPROVED'
           LIMIT 1`,
          [productId],
        );
        if (!productCheck) {
          res.status(400).json({
            success: false,
            error: { code: 'PRODUCT_NOT_FOUND', message: 'Product not found or not available' },
          });
          return;
        }
        resolvedLandingTargetId = productId; // productId 우선
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
        landingTargetId: resolvedLandingTargetId,
        slug: slug.trim(),
        isActive: true,
      });

      const saved = await qrRepo.save(item);

      // WO-KPA-STORE-ASSET-DERIVATION-QR-BLOG-WRITEPATH-V1:
      //   QR 가 라이브러리 자료(libraryItemId)에서 만들어진 경우 원본→qr_code 관계 best-effort 기록.
      //   service_key + organization_id 기준(POP/read endpoint 와 동일 organizationId). 실패해도 생성 응답 무영향.
      if (libraryItemId) {
        try {
          const userId = (req as any).authContext?.userId || (req as any).user?.id;
          const lib = await dataSource.getRepository(StoreExecutionAsset).findOne({
            where: { id: libraryItemId, organizationId },
          });
          await recordDerivations(dataSource, {
            serviceKey: serviceKey ?? 'kpa',
            organizationId,
            createdBy: userId ?? null,
            derivedKind: 'qr_code',
            derivedId: saved.id,
            derivedTitle: saved.title,
            sources: [{ kind: 'store_execution_asset', id: libraryItemId, title: lib?.title ?? null }],
          });
        } catch (derivationErr) {
          console.error('[store-qr] derivation record failed (non-blocking)', derivationErr);
        }
      }

      // WO-O4O-PRODUCT-MARKETING-GRAPH-V1: Auto-link QR → Product
      if (landingType === 'product' && resolvedLandingTargetId) {
        dataSource.query(
          `INSERT INTO product_marketing_assets (organization_id, product_id, asset_type, asset_id)
           VALUES ($1, $2, 'qr', $3)
           ON CONFLICT (product_id, asset_type, asset_id) DO NOTHING`,
          [organizationId, resolvedLandingTargetId, saved.id],
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
