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

// WO-O4O-TRUSTED-CLIENT-IP-AND-SECURITY-LOG-REDACTION-V1
import { getTrustedClientIp } from '../../../utils/trusted-client-ip.js';
import { Router, Request, Response, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import { createHash } from 'crypto';
import { StoreQrCode } from '../../platform/entities/store-qr-code.entity.js';
import { asyncHandler } from '../../../middleware/error-handler.js';
import type { StoreOwnerServiceKey } from '../../../utils/store-owner.utils.js';
import { createRequireStoreWorkspaceAccess } from '../../../utils/store-workspace-access.js';
// WO-PHARMACY-HUB-STORE-EXECUTION-ASSETS-V1:
//   QR CRUD·집계 계약을 services/store/store-qr.service.ts 로 추출했다. 이 controller 는
//   인증·조직 결정(공통 createRequireStoreWorkspaceAccess — 무변경)과 응답 매핑·파일 스트리밍만 담당한다.
//   Pharmacy-Hub 는 같은 service 함수를 쓰되 조직만 PH enrollment 기준으로 해석한다.
import {
  resolvePublicQrLanding,
  listStoreQrCodes,
  getStoreQrAnalytics,
  findStoreQrCode,
  createStoreQrCode,
  updateStoreQrCode,
  deactivateStoreQrCode,
  reactivateStoreQrCode,
  cloneStoreQrCode,
  type QrResult,
  type QrFailure,
} from '../../../services/store/store-qr.service.js';
// WO-O4O-STORE-QR-PLACEMENT-AND-ANALYTICS-IMPLEMENTATION-V1 §7:
//   placement lifecycle 은 KPA/PH 공통 service 하나가 SSOT 다. 서비스별 복제본을 만들지 않는다.
import {
  listQrPlacements,
  startQrPlacement,
  updateQrPlacement,
  endQrPlacement,
  getQrPlacementScanBreakdown,
  getOrganizationPlacementAnalytics,
} from '../../../services/store/store-qr-placement.service.js';
// HOTFIX-O4O-QR-PUBLIC-URL-SERVICE-DOMAIN-FIRST-V1:
//   QR payload URL 은 서비스별 canonical 공개 도메인을 사용한다 (service-catalog SSOT).
import { getService } from '../../../config/service-catalog.js';
// WO-KPA-STORE-ASSET-DERIVATION-QR-BLOG-WRITEPATH-V1 (원본→qr_code 파생 기록) 과
// WO-O4O-KPA-QR-TARGET-COPY-GUARD-V1 (page QR content_hub 원본 → 매장 사본 치환) 은
// 이제 services/store/store-qr.service.ts 안에서 수행된다 — 여기서 직접 import 하지 않는다.
import { generateQrPng, generateQrSvg, generateQrPrintPdf, generateQrPosterPdf, presetToPixelSize } from '../../../services/qr-print.service.js';
import type { QrPrintItem, QrExportPreset, QrPosterItem } from '../../../services/qr-print.service.js';
import { generateProductFlyer } from '../../../services/qr-flyer.service.js';
import type { FlyerProduct } from '../../../services/qr-flyer.service.js';
// WO-O4O-KPA-STORE-QR-SCREENSET-STATE-ALIGNMENT-V1 §6-2: 일괄 출력에도 단건과 동일한 archive 판정.
import { screenSetQrPrintablePredicate } from '../../platform/store-screen-set-qr.service.js';
// WO-O4O-KPA-TABLET-QR-LANDING-CONTRACT-V1 의 screen_set landing resolver 는
// services/store/store-qr.service.ts(resolvePublicQrLanding) 안으로 옮겼다.

type AuthMiddleware = RequestHandler;

// HOTFIX-O4O-QR-PUBLIC-URL-SERVICE-DOMAIN-FIRST-V1:
//   StoreOwnerServiceKey(role-prefix) → service-catalog key 매핑.
//   (store-owner.utils STORE_OWNER_SCOPE_TO_MEMBERSHIP_KEY 와 동일 의미)
const QR_SERVICE_TO_CATALOG_KEY: Record<StoreOwnerServiceKey, string> = {
  kpa: 'kpa-society',
  cosmetics: 'k-cosmetics',
  // WO-O4O-STORE-OWNER-GUARD-PHARMACY-HUB-REGISTRATION-V1: role prefix 와 catalog key 동일
  // (service-catalog.ts `pharmacy-hub` → pharmacyhub.co.kr). 본 controller 는 서비스별
  // 명시 serviceKey 로만 mount 되며 pharmacy-hub mount 는 아직 없다.
  // WO-O4O-CAFE24-B2B-STORE-MEMBER-LOGIN-PILOT-V1: role prefix 와 catalog key 동일.
  // 본 controller 는 cafe24-b2b 로 mount 되지 않는다 (Pilot 범위 밖 — §14).
  'cafe24-b2b': 'cafe24-b2b',
};

/**
 * QR payload(이미지/PDF)에 담을 공개 절대 URL 의 origin.
 * 서비스별 canonical 도메인(service-catalog)을 사용한다. 과거 `PUBLIC_DOMAIN || 'o4o.kr'`
 * 전역 fallback 으로 인해 KPA QR 이 https://o4o.kr/qr/* 로 생성되던 장애를 수정.
 * 서비스 미상/카탈로그 누락 시 pharmacy.neture.co.kr(KPA Society canonical) 로 안전 폴백.
 */
function qrPublicOrigin(serviceKey?: StoreOwnerServiceKey): string {
  const catalogKey = serviceKey ? QR_SERVICE_TO_CATALOG_KEY[serviceKey] : 'kpa-society';
  const domain = getService(catalogKey)?.domain;
  return `https://${domain || 'pharmacy.neture.co.kr'}`;
}

// WO-O4O-KPA-QR-EXPORT-FILENAME-BY-TITLE-V1:
//   QR 출력 파일명을 콘텐츠(QR) 제목 기반으로 생성. 한글 등 비ASCII 안전을 위해
//   RFC 5987 `filename*=UTF-8''` (실제명) + ASCII `filename=` 폴백을 함께 설정한다.
function buildQrContentDisposition(title: string | null | undefined, slug: string, ext: string): string {
  const raw = (title || '').trim();
  // 파일시스템 금지문자/제어문자 제거 + 공백 정리, 길이 제한
  const safe = (raw || `qr-${slug}`)
    .replace(/[\\/:*?"<>|\x00-\x1f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80) || `qr-${slug}`;
  // ASCII 폴백: 비ASCII 제거 후 남는 게 없으면 slug 사용
  const ascii = (safe.replace(/[^\x20-\x7e]/g, '').replace(/["\\]/g, '').replace(/\s+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')) || `qr-${slug}`;
  const utf8 = encodeURIComponent(safe);
  return `attachment; filename="${ascii}.${ext}"; filename*=UTF-8''${utf8}.${ext}`;
}

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

/**
 * store-qr.service 실패 결과 → 공통 라우트 envelope(nested error).
 *
 * api-server tsconfig 는 strictNullChecks 가 꺼져 있어 `if (!result.ok)` 로 union 이
 * 좁혀지지 않는다. 호출은 항상 실패 분기에서만 하므로 여기서 형만 확정한다.
 */
function sendQrFailure(res: Response, result: QrResult<unknown>): void {
  const failure = result as QrFailure;
  res.status(failure.status).json({
    success: false,
    error: { code: failure.code, message: failure.message },
  });
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
  const requirePharmacyOwner = createRequireStoreWorkspaceAccess(dataSource, serviceKey);

  // Advertise HEAD semantics on the existing namespace, including its slug-less
  // 404. Clients can check deployment support without resolving a QR or writing a scan.
  router.use('/qr/public', (_req, res, next) => {
    res.set('X-QR-Read-Only-Head', '1');
    res.set('Cache-Control', 'no-store, must-revalidate');
    next();
  });

  // ─── PUBLIC: GET /qr/public/:slug ──────────────────────────────
  //   랜딩 데이터 해석·스캔 이벤트 기록 계약은 공통 service 가 SSOT 다.
  //   여기서는 캐시 헤더와 신뢰 가능한 요청 메타(IP 해시 등)만 준비한다.
  router.get(
    '/qr/public/:slug',
    asyncHandler(async (req: Request, res: Response) => {
      // WO-O4O-SCREEN-SET-QR-LIFECYCLE-SYNC-V1: 공개 QR 랜딩은 QR is_active(archive/restore) 라이브 상태를
      //   즉시 반영해야 한다. 브라우저/edge 캐시가 이전 200/410 을 재사용하면 archive·restore 가 지연 반영되므로
      //   no-store 로 캐시를 막는다(상태 의존 응답).
      res.set('Cache-Control', 'no-store, must-revalidate');

      const ua = req.get('user-agent');
      const result = await resolvePublicQrLanding(dataSource, req.params.slug, serviceKey, {
        recordScan: req.method !== 'HEAD',
        deviceType: detectDeviceType(ua),
        userAgent: ua || null,
        referer: req.get('referer') || null,
        // WO-O4O-TRUSTED-CLIENT-IP-AND-SECURITY-LOG-REDACTION-V1: XFF 첫 값 직접 파싱 금지
        ipHash: hashIp(getTrustedClientIp(req)),
      });
      if (!result.ok) {
        sendQrFailure(res, result);
        return;
      }
      res.json({ success: true, data: result.data });
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
      // 목록 계약(scanCount 집계 · aiDescriptionMode 파생)은 공통 service 가 SSOT 다.
      const data = await listStoreQrCodes(dataSource, organizationId, {
        page: req.query.page,
        limit: req.query.limit,
        includeInactive: req.query.includeInactive,
      });
      res.json({ success: true, data });
    }),
  );

  // ─── GET /pharmacy/qr/:id/analytics — QR 스캔 통계 ────────────
  router.get(
    '/pharmacy/qr/:id/analytics',
    requireAuth,
    requirePharmacyOwner,
    asyncHandler(async (req: Request, res: Response) => {
      const organizationId = (req as any).organizationId;
      const result = await getStoreQrAnalytics(dataSource, organizationId, req.params.id);
      if (!result.ok) {
        sendQrFailure(res, result);
        return;
      }
      res.json({ success: true, data: result.data });
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

      // WO-O4O-KPA-STORE-QR-SCREENSET-STATE-ALIGNMENT-V1 §1:
      //   이 경로만 requireActive 가 없어, 화면에서는 출력이 막힌 QR 도 URL 직접 호출로 이미지를 받을 수 있었다
      //   (/export · /print · /flyer 는 이미 활성 QR 만 허용). 우회 경로를 닫고 판정을 통일한다.
      const found = await findStoreQrCode(dataSource, organizationId, id, { requireActive: true });
      if (!found.ok) {
        sendQrFailure(res, found);
        return;
      }
      const qr = found.data;

      const qrUrl = `${qrPublicOrigin(serviceKey)}/qr/${qr.slug}`;

      if (format === 'svg') {
        const svg = await generateQrSvg(qrUrl, size);
        res.setHeader('Content-Type', 'image/svg+xml');
        // WO-O4O-KPA-QR-EXPORT-FILENAME-BY-TITLE-V1: 파일명 = QR 제목
        res.setHeader('Content-Disposition', buildQrContentDisposition(qr.title, qr.slug, 'svg'));
        res.send(svg);
      } else {
        const png = await generateQrPng(qrUrl, size);
        res.setHeader('Content-Type', 'image/png');
        // WO-O4O-KPA-QR-EXPORT-FILENAME-BY-TITLE-V1: 파일명 = QR 제목
        res.setHeader('Content-Disposition', buildQrContentDisposition(qr.title, qr.slug, 'png'));
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
      const found = await findStoreQrCode(dataSource, organizationId, id, { requireActive: true });
      if (!found.ok) {
        sendQrFailure(res, found);
        return;
      }
      const qr = found.data;

      // 외부 URL QR 이라도 public /qr/:slug 를 담는다(스캔 추적 보존)
      const qrUrl = `${qrPublicOrigin(serviceKey)}/qr/${qr.slug}`;

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
        // WO-O4O-KPA-QR-EXPORT-FILENAME-BY-TITLE-V1: 파일명 = QR 제목 (+4분할 표기)
        res.setHeader('Content-Disposition', buildQrContentDisposition(
          qr.title ? `${qr.title}${perPage === 4 ? ' (4분할)' : ''}` : null,
          `${qr.slug}-${perPage === 4 ? 'a4-4up' : 'a4'}`,
          'pdf',
        ));
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
        // WO-O4O-KPA-QR-EXPORT-FILENAME-BY-TITLE-V1: 파일명 = QR 제목
        res.setHeader('Content-Disposition', buildQrContentDisposition(qr.title, qr.slug, 'svg'));
        res.send(svg);
      } else {
        const png = await generateQrPng(qrUrl, size, 4);
        res.setHeader('Content-Type', 'image/png');
        // WO-O4O-KPA-QR-EXPORT-FILENAME-BY-TITLE-V1: 파일명 = QR 제목
        res.setHeader('Content-Disposition', buildQrContentDisposition(qr.title, qr.slug, 'png'));
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
      // WO-O4O-KPA-STORE-QR-SCREENSET-STATE-ALIGNMENT-V1 §6-2 (E2E 후속 수정):
      //   이 경로만 findStoreQrCode 를 안 거쳐 `is_active` 만 봤고, 그 결과 보관된 Screen Set 의
      //   코너 QR(is_active=true)이 **일괄 출력으로는 계속 인쇄**됐다(단건 /image·/export·/flyer 는 409).
      //   단건 경로와 동일한 archive 판정을 적용해 우회를 닫는다.
      const qrCodes = await qrRepo
        .createQueryBuilder('qr')
        .where('qr.organization_id = :organizationId', { organizationId })
        .andWhere('qr.id IN (:...ids)', { ids: qrIds })
        .andWhere('qr.is_active = true')
        .andWhere(screenSetQrPrintablePredicate('qr'))
        .getMany();

      if (qrCodes.length === 0) {
        // 요청이 전부 '보관된 Screen Set 의 코너 QR' 이면 단건 경로와 같은 409 + 복원 안내를 준다.
        //   (일반 not-found 404 로 뭉뚱그리면 매장이 '왜 안 되는지 / 어떻게 푸는지' 를 알 수 없다.)
        const archivedOnly = await qrRepo
          .createQueryBuilder('qr')
          .where('qr.organization_id = :organizationId', { organizationId })
          .andWhere('qr.id IN (:...ids)', { ids: qrIds })
          .andWhere(`NOT ${screenSetQrPrintablePredicate('qr')}`)
          .getCount();
        if (archivedOnly > 0) {
          res.status(409).json({
            success: false,
            error: {
              code: 'SCREEN_SET_ARCHIVED',
              message: '보관된 화면 세트의 코너 QR 입니다. 보관을 해제하면 같은 주소로 다시 출력할 수 있습니다.',
            },
          });
          return;
        }
        res.status(404).json({
          success: false,
          error: { code: 'QR_NOT_FOUND', message: 'No matching QR codes found' },
        });
        return;
      }

      const printItems: QrPrintItem[] = qrCodes.map((qr) => ({
        url: `${qrPublicOrigin(serviceKey)}/qr/${qr.slug}`,
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

      const flyerFound = await findStoreQrCode(dataSource, organizationId, id, { requireActive: true });
      if (!flyerFound.ok) {
        sendQrFailure(res, flyerFound);
        return;
      }
      const qr = flyerFound.data;

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

      const qrUrl = `${qrPublicOrigin(serviceKey)}/qr/${qr.slug}`;
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
      const userId = (req as any).authContext?.userId || (req as any).user?.id;

      // 생성 계약(screen_set 멱등 재사용 · product 검증 · page 사본 가드 · 파생 기록 ·
      // marketing graph 링크)은 전부 공통 service 가 SSOT 다.
      const result = await createStoreQrCode(dataSource, organizationId, req.body, {
        serviceKey,
        userId,
      });
      if (!result.ok) {
        sendQrFailure(res, result);
        return;
      }
      // screen_set 재사용은 신규 생성이 아니므로 200 + reused:true 로 구분한다(기존 계약 보존).
      if (result.data.reused) {
        res.status(200).json({ success: true, data: result.data.qr, reused: true });
        return;
      }
      res.status(201).json({ success: true, data: result.data.qr });
    }),
  );

  // ─── PUT /pharmacy/qr/:id — QR 코드 수정 ──────────────────────
  router.put(
    '/pharmacy/qr/:id',
    requireAuth,
    requirePharmacyOwner,
    asyncHandler(async (req: Request, res: Response) => {
      const organizationId = (req as any).organizationId;
      const result = await updateStoreQrCode(dataSource, organizationId, req.params.id, req.body);
      if (!result.ok) {
        sendQrFailure(res, result);
        return;
      }
      res.json({ success: true, data: result.data });
    }),
  );

  // ─── DELETE /pharmacy/qr/:id — soft-delete ────────────────────
  router.delete(
    '/pharmacy/qr/:id',
    requireAuth,
    requirePharmacyOwner,
    asyncHandler(async (req: Request, res: Response) => {
      const organizationId = (req as any).organizationId;
      const result = await deactivateStoreQrCode(dataSource, organizationId, req.params.id);
      if (!result.ok) {
        sendQrFailure(res, result);
        return;
      }
      res.json({ success: true, message: 'QR code deactivated' });
    }),
  );

  // ─── POST /pharmacy/qr/:id/reactivate — 내린 QR 다시 올리기 ─────────────────
  //   is_active 만 되돌린다. slug 와 연결 대상은 그대로다(인쇄된 QR 이 같은 곳을 연다).
  router.post(
    '/pharmacy/qr/:id/reactivate',
    requireAuth,
    requirePharmacyOwner,
    asyncHandler(async (req: Request, res: Response) => {
      const organizationId = (req as any).organizationId;
      const result = await reactivateStoreQrCode(dataSource, organizationId, req.params.id);
      if (!result.ok) {
        sendQrFailure(res, result);
        return;
      }
      res.json({ success: true, data: result.data });
    }),
  );


  // ─── QR 사용처(Placement) ─────────────────────────────────────
  //   WO-O4O-STORE-QR-PLACEMENT-AND-ANALYTICS-IMPLEMENTATION-V1 §7
  //   Target(무엇을 여는가)과 별개 축이다. 모든 write 는 조직 경계를 service 가 강제한다.

  router.get(
    '/pharmacy/qr/:id/placements',
    requireAuth,
    requirePharmacyOwner,
    asyncHandler(async (req: Request, res: Response) => {
      const organizationId = (req as any).organizationId;
      const result = await listQrPlacements(dataSource, organizationId, req.params.id);
      if (!result.ok) { sendQrFailure(res, result); return; }
      res.json({ success: true, data: result.data });
    }),
  );

  router.post(
    '/pharmacy/qr/:id/placements',
    requireAuth,
    requirePharmacyOwner,
    asyncHandler(async (req: Request, res: Response) => {
      const organizationId = (req as any).organizationId;
      const result = await startQrPlacement(dataSource, organizationId, req.params.id, req.body ?? {});
      if (!result.ok) { sendQrFailure(res, result); return; }
      res.status(201).json({ success: true, data: result.data });
    }),
  );

  router.patch(
    '/pharmacy/qr/:id/placements/:placementId',
    requireAuth,
    requirePharmacyOwner,
    asyncHandler(async (req: Request, res: Response) => {
      const organizationId = (req as any).organizationId;
      const result = await updateQrPlacement(
        dataSource, organizationId, req.params.id, req.params.placementId, req.body ?? {},
      );
      if (!result.ok) { sendQrFailure(res, result); return; }
      res.json({ success: true, data: result.data });
    }),
  );

  // 배치 종료 — QR 은 건드리지 않는다(주소 유지 · 인쇄물 보호).
  router.post(
    '/pharmacy/qr/:id/placements/:placementId/end',
    requireAuth,
    requirePharmacyOwner,
    asyncHandler(async (req: Request, res: Response) => {
      const organizationId = (req as any).organizationId;
      const result = await endQrPlacement(dataSource, organizationId, req.params.id, req.params.placementId);
      if (!result.ok) { sendQrFailure(res, result); return; }
      res.json({ success: true, data: result.data });
    }),
  );

  // 사용처별 스캔 귀속(구간 조인). 기존 /analytics 응답은 건드리지 않는다(§17 additive).
  router.get(
    '/pharmacy/qr/:id/placement-analytics',
    requireAuth,
    requirePharmacyOwner,
    asyncHandler(async (req: Request, res: Response) => {
      const organizationId = (req as any).organizationId;
      const result = await getQrPlacementScanBreakdown(dataSource, organizationId, req.params.id);
      if (!result.ok) { sendQrFailure(res, result); return; }
      res.json({ success: true, data: { byPlacement: result.data } });
    }),
  );

  // 매장 전체 사용처 분포 (Placement × ContentSource × TargetKind)
  router.get(
    '/pharmacy/qr-analytics/placements',
    requireAuth,
    requirePharmacyOwner,
    asyncHandler(async (req: Request, res: Response) => {
      const organizationId = (req as any).organizationId;
      const data = await getOrganizationPlacementAnalytics(dataSource, organizationId, {
        days: req.query.days ? Number(req.query.days) : undefined,
      });
      res.json({ success: true, data });
    }),
  );

  // ─── POST /pharmacy/qr/:id/clone — 같은 콘텐츠로 QR 추가 (§8) ──
  router.post(
    '/pharmacy/qr/:id/clone',
    requireAuth,
    requirePharmacyOwner,
    asyncHandler(async (req: Request, res: Response) => {
      const organizationId = (req as any).organizationId;
      const result = await cloneStoreQrCode(dataSource, organizationId, req.params.id, req.body ?? {});
      if (!result.ok) { sendQrFailure(res, result); return; }
      // 생성 직후 사용처를 함께 지정할 수 있다(선택). 실패해도 QR 생성은 유효하다.
      let placement = null;
      if (req.body?.placement) {
        const started = await startQrPlacement(dataSource, organizationId, result.data.qr.id, req.body);
        if (started.ok) placement = started.data.placement;
      }
      res.status(201).json({ success: true, data: { qr: result.data.qr, placement } });
    }),
  );


  return router;
}