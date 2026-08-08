/**
 * Pharmacy-Hub Store Owner QR Controller — 매장 QR
 *
 * WO-PHARMACY-HUB-STORE-EXECUTION-ASSETS-V1 (범위 A)
 *
 *   GET    /api/v1/pharmacy-hub/store-owner/qr               목록 (+scanCount)
 *   GET    /api/v1/pharmacy-hub/store-owner/qr/sources       연결 대상(자료함 · 매장 콘텐츠 · 매장 경영활용 제품)
 *   POST   /api/v1/pharmacy-hub/store-owner/qr               생성
 *   PUT    /api/v1/pharmacy-hub/store-owner/qr/:id           수정
 *   DELETE /api/v1/pharmacy-hub/store-owner/qr/:id           비활성화(soft delete)
 *   GET    /api/v1/pharmacy-hub/store-owner/qr/:id/analytics 스캔 통계
 *   GET    /api/v1/pharmacy-hub/store-owner/qr/:id/export    PNG/SVG/PDF 다운로드
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 이 컨트롤러가 하는 일은 **조직 결정 + 연결 대상 검증 + 상태코드 매핑**뿐이다.
 * QR 저장·검증 계약은 공통 services/store/store-qr.service.ts 를 호출한다
 * (KPA·GlycoPharm·K-Cosmetics 가 쓰는 것과 같은 함수 — 로직 복제 0).
 * QR 이미지·PDF 는 공통 services/qr-print.service.ts 를 그대로 사용한다 (새 QR 엔진 0).
 *
 * 왜 공통 라우트(/pharmacy/qr)를 그대로 마운트하지 않는가
 *   createRequireStoreOwner(=resolveStoreAccess) 가 주입하는 organizationId 는 서비스 스코프 없이
 *   organization_members 를 정렬 없는 LIMIT 1 로 고른다 — Pharmacy-Hub enrollment 조직과 일치한다는
 *   보장이 없다. 공통 가드는 변경 금지이므로(WO 변경 금지), 여기서 조직만 다시 정한다.
 *
 * 조직 계약 (PharmacyHubStoreLibraryController 와 동일)
 *   0개      : GET 200 안내 / write 409 STORE_NOT_CONNECTED
 *   2개 이상 : GET 200 안내 / write 409 AMBIGUOUS_STORE_CONNECTION
 *   1개      : 해당 조직으로만 조회·수정
 *   클라이언트 organizationId 는 신뢰하지 않는다.
 *
 * V1 연결 타입 (landingType)
 *   page    : 매장 소유 콘텐츠 — 자료함(store_execution_assets) 또는 매장 콘텐츠(kpa_store_contents direct)
 *   product : 매장 경영활용 제품(organization_product_listings) — 소유 검증 후 연결
 *   link    : 외부 URL
 *   video / screen_set 은 각각 매장 동영상·태블릿 화면 세트 축이 Pharmacy-Hub 에 생긴 뒤 연다.
 *   **연결 대상이 없는 QR 타입은 만들지 않는다** (스캔했을 때 빈 화면이 되는 QR 0).
 */
import type { Request, Response } from 'express';
import { createHash } from 'crypto';
import { AppDataSource } from '../../database/connection.js';
import logger from '../../utils/logger.js';
// WO-O4O-TRUSTED-CLIENT-IP-AND-SECURITY-LOG-REDACTION-V1: XFF 첫 값 직접 파싱 금지
import { getTrustedClientIp } from '../../utils/trusted-client-ip.js';
import { getService } from '../../config/service-catalog.js';
import { SERVICE_KEYS } from '../../constants/service-keys.js';
import {
  resolvePharmacyHubStoreOrganization,
  type StoreOrgResolution,
} from './store-organization.resolver.js';
import {
  resolvePublicQrLanding,
  listStoreQrCodes,
  getStoreQrAnalytics,
  findStoreQrCode,
  createStoreQrCode,
  updateStoreQrCode,
  deactivateStoreQrCode,
  type QrResult,
  type QrFailure,
} from '../../services/store/store-qr.service.js';
import {
  generateQrPng,
  generateQrSvg,
  generateQrPosterPdf,
  presetToPixelSize,
} from '../../services/qr-print.service.js';
import type { QrExportPreset, QrPosterItem } from '../../services/qr-print.service.js';

const SERVICE_KEY = SERVICE_KEYS.PHARMACY_HUB;

/** Pharmacy-Hub V1 에서 생성 가능한 연결 타입 (실제 랜딩이 존재하는 것만) */
const ALLOWED_LANDING_TYPES = ['page', 'product', 'link'] as const;
type AllowedLandingType = (typeof ALLOWED_LANDING_TYPES)[number];

/**
 * QR payload 에 담을 공개 절대 URL 의 origin.
 * 서비스별 canonical 공개 도메인(service-catalog SSOT) — 전역 fallback 을 쓰지 않는다.
 */
function qrPublicOrigin(): string {
  const domain = getService(SERVICE_KEY)?.domain;
  return `https://${domain || 'pharmacyhub.co.kr'}`;
}

function storeConnectionView(resolution: StoreOrgResolution) {
  return {
    status: resolution.status,
    candidateCount: resolution.candidateCount,
    errorCode: resolution.status === 'ambiguous' ? resolution.errorCode : null,
  };
}

function sendWriteBlocked(res: Response, resolution: StoreOrgResolution): void {
  if (resolution.status === 'not_connected') {
    res.status(409).json({
      success: false,
      error: '매장이 연결되어 있지 않아 QR 을 관리할 수 없습니다.',
      code: 'STORE_NOT_CONNECTED',
    });
    return;
  }
  res.status(409).json({
    success: false,
    error: '연결된 매장이 여러 개입니다. 운영자에게 문의해 주세요.',
    code: 'AMBIGUOUS_STORE_CONNECTION',
  });
}

/**
 * 공통 service 실패 결과를 상태코드로 매핑한다 (Pharmacy-Hub 는 flat envelope).
 *
 * api-server tsconfig 는 strictNullChecks 가 꺼져 있어 `if (!result.ok)` 로 union 이
 * 좁혀지지 않는다. 호출은 항상 실패 분기에서만 하므로 여기서 형만 확정한다.
 */
function sendFailure(res: Response, result: QrResult<unknown>): void {
  const failure = result as QrFailure;
  res.status(failure.status).json({
    success: false,
    error: failure.message,
    code: failure.code,
  });
}

function getUserId(req: Request, res: Response): string | null {
  const userId = (req as any).user?.id;
  if (typeof userId !== 'string' || userId.length === 0) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return null;
  }
  return userId;
}

/** body 로 조직을 지목할 수 없다 — 조용히 무시하지 않고 명시적으로 거부한다. */
function rejectsOrganizationId(req: Request, res: Response): boolean {
  if (req.body && typeof req.body === 'object' && 'organizationId' in req.body) {
    res.status(400).json({
      success: false,
      error: '매장은 서버가 결정합니다. organizationId 는 보낼 수 없습니다.',
      code: 'FIELD_NOT_ACCEPTED',
    });
    return true;
  }
  return false;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function rejectsMalformedId(req: Request, res: Response): boolean {
  if (UUID_RE.test(String(req.params.id ?? ''))) return false;
  res.status(404).json({ success: false, error: 'QR code not found', code: 'QR_NOT_FOUND' });
  return true;
}

function fail(res: Response, userId: string, op: string, error: unknown, message: string, code: string) {
  logger.error(`[PharmacyHubStoreQr] ${op} failed`, {
    userId,
    error: error instanceof Error ? error.message : String(error),
  });
  return res.status(500).json({ success: false, error: message, code });
}

/**
 * 제목 → URL 안전 slug.
 * store_qr_codes.slug 는 **전역 unique** 라 프론트가 직접 정하게 하지 않고 서버가 발급한다.
 * 한글은 제거되므로(ASCII 안전 우선) 남는 게 없으면 접두어 + 랜덤 suffix 를 쓴다.
 */
function generateSlug(title: string): string {
  const stripped = title
    .toLowerCase()
    .trim()
    .replace(/[가-힣]/g, '')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
  const base = stripped || 'ph-qr';
  return `${base}-${Date.now().toString(36)}`;
}

/**
 * 연결 대상 검증 — **매장 소유(organization_id)** 인지 확인한다.
 * 여기서 통과한 값만 공통 service 로 넘어간다 (타 매장 자료로 QR 을 만들 수 없다).
 *
 * @returns 정규화된 { libraryItemId, landingTargetId } 또는 실패
 */
async function resolveTarget(
  organizationId: string,
  landingType: AllowedLandingType,
  body: any,
): Promise<
  | { ok: true; libraryItemId: string | null; landingTargetId: string | null }
  | { ok: false; message: string; code: string }
> {
  if (landingType === 'link') {
    const url = typeof body?.landingTargetId === 'string' ? body.landingTargetId.trim() : '';
    if (!/^https?:\/\//i.test(url)) {
      return { ok: false, message: '연결할 주소(https://)를 입력해 주세요.', code: 'VALIDATION_ERROR' };
    }
    return { ok: true, libraryItemId: null, landingTargetId: url };
  }

  if (landingType === 'page') {
    // 자료함 자료(store_execution_assets) 우선 — QR 은 library_item_id 로 사본을 참조한다.
    const libraryItemId =
      typeof body?.libraryItemId === 'string' && UUID_RE.test(body.libraryItemId)
        ? body.libraryItemId
        : null;
    if (libraryItemId) {
      const rows = await AppDataSource.query(
        `SELECT 1 FROM store_execution_assets
         WHERE id = $1 AND organization_id = $2 AND is_active = true LIMIT 1`,
        [libraryItemId, organizationId],
      );
      if (rows.length === 0) {
        return { ok: false, message: '선택한 자료를 매장에서 찾을 수 없습니다.', code: 'ASSET_NOT_FOUND' };
      }
      return { ok: true, libraryItemId, landingTargetId: null };
    }

    // 매장 콘텐츠(kpa_store_contents source_type='direct') — 공개 랜딩이 본문을 inline 으로 렌더한다.
    const contentId =
      typeof body?.landingTargetId === 'string' && UUID_RE.test(body.landingTargetId)
        ? body.landingTargetId
        : null;
    if (!contentId) {
      return { ok: false, message: '연결할 자료 또는 매장 콘텐츠를 선택해 주세요.', code: 'VALIDATION_ERROR' };
    }
    const rows = await AppDataSource.query(
      `SELECT 1 FROM kpa_store_contents
       WHERE id = $1 AND organization_id = $2 AND source_type = 'direct' LIMIT 1`,
      [contentId, organizationId],
    );
    if (rows.length === 0) {
      return { ok: false, message: '선택한 매장 콘텐츠를 찾을 수 없습니다.', code: 'CONTENT_NOT_FOUND' };
    }
    return { ok: true, libraryItemId: null, landingTargetId: contentId };
  }

  // product — 매장 경영활용 제품(organization_product_listings) 소유 검증.
  //   공개 랜딩(GET /qr/public/:slug)은 listing id 와 offer id 를 모두 해석한다.
  //   B2B 구매 대상 offer 를 그대로 쓰지 않고 **매장이 취급 등록한 listing** 만 연결한다
  //   (WO §상품 연결 원칙 — 공급 offer 를 실행 자산 SSOT 로 쓰지 않는다).
  const listingId =
    typeof body?.landingTargetId === 'string' && UUID_RE.test(body.landingTargetId)
      ? body.landingTargetId
      : null;
  if (!listingId) {
    return { ok: false, message: '연결할 매장 경영활용 제품을 선택해 주세요.', code: 'VALIDATION_ERROR' };
  }
  const rows = await AppDataSource.query(
    `SELECT 1 FROM organization_product_listings
     WHERE id = $1 AND organization_id = $2 LIMIT 1`,
    [listingId, organizationId],
  );
  if (rows.length === 0) {
    return { ok: false, message: '선택한 제품을 매장에서 찾을 수 없습니다.', code: 'LISTING_NOT_FOUND' };
  }
  return { ok: true, libraryItemId: null, landingTargetId: listingId };
}

function detectDeviceType(ua: string | undefined): string {
  if (!ua) return 'desktop';
  const lower = ua.toLowerCase();
  if (/tablet|ipad|playbook|silk/i.test(lower)) return 'tablet';
  if (/mobile|iphone|ipod|android.*mobile|windows phone/i.test(lower)) return 'mobile';
  return 'desktop';
}

/** 원문 IP 는 저장하지 않는다 — 중복 스캔 판정용 해시만 남긴다. */
function hashIp(ip: string | undefined): string | null {
  if (!ip) return null;
  return createHash('sha256').update(ip).digest('hex');
}

export class PharmacyHubStoreQrController {
  /**
   * GET /api/v1/pharmacy-hub/qr/public/:slug — 공개 QR 랜딩 (인증 없음).
   *
   * QR payload 는 `https://pharmacyhub.co.kr/qr/{slug}` 이므로 Pharmacy-Hub 도메인에서
   * 스캔이 해석되어야 한다. 랜딩 해석·스캔 기록 계약은 공통 service 가 SSOT 다 —
   * 여기서는 캐시 헤더와 신뢰 가능한 요청 메타만 준비한다.
   *
   * 인증을 요구하지 않는 유일한 실행 자산 경로다. 응답에는 매장 소유 공개 콘텐츠만 담기며
   * 조직 UUID 외 내부 식별자(Screen Set UUID 등)는 service 가 제거한다.
   */
  static async publicLanding(req: Request, res: Response): Promise<any> {
    try {
      // 상태 의존 응답(활성/보관) — 브라우저·edge 캐시가 이전 200/410 을 재사용하면 안 된다.
      res.set('Cache-Control', 'no-store, must-revalidate');

      const ua = req.get('user-agent');
      const result = await resolvePublicQrLanding(AppDataSource, req.params.slug, SERVICE_KEY, {
        deviceType: detectDeviceType(ua),
        userAgent: ua || null,
        referer: req.get('referer') || null,
        ipHash: hashIp(getTrustedClientIp(req)),
      });
      if (!result.ok) return sendFailure(res, result);
      return res.json({ success: true, data: result.data });
    } catch (error) {
      logger.error('[PharmacyHubStoreQr] publicLanding failed', {
        slug: req.params.slug,
        error: error instanceof Error ? error.message : String(error),
      });
      return res
        .status(500)
        .json({ success: false, error: 'QR 정보를 불러오지 못했습니다.', code: 'QR_LANDING_FAILED' });
    }
  }

  /** GET /store-owner/qr — query: page, limit */
  static async list(req: Request, res: Response): Promise<any> {
    const userId = getUserId(req, res);
    if (!userId) return;

    try {
      const resolution = await resolvePharmacyHubStoreOrganization(userId);
      const storeConnection = storeConnectionView(resolution);
      if (resolution.status !== 'connected') {
        return res.json({
          success: true,
          data: { storeConnection, items: [], total: 0, page: 1, limit: 20, publicOrigin: qrPublicOrigin() },
        });
      }

      const data = await listStoreQrCodes(AppDataSource, resolution.organizationId, {
        page: req.query.page,
        limit: req.query.limit,
      });
      return res.json({
        success: true,
        data: { storeConnection, ...data, publicOrigin: qrPublicOrigin() },
      });
    } catch (error) {
      return fail(res, userId, 'list', error, 'QR 목록을 불러오지 못했습니다.', 'QR_LOAD_FAILED');
    }
  }

  /**
   * GET /store-owner/qr/sources — 연결 대상 목록.
   * 매장 소유 자료만 반환한다 (타 매장·운영자 원본 0).
   */
  static async sources(req: Request, res: Response): Promise<any> {
    const userId = getUserId(req, res);
    if (!userId) return;

    try {
      const resolution = await resolvePharmacyHubStoreOrganization(userId);
      const storeConnection = storeConnectionView(resolution);
      if (resolution.status !== 'connected') {
        return res.json({
          success: true,
          data: { storeConnection, libraryAssets: [], storeContents: [], products: [] },
        });
      }
      const organizationId = resolution.organizationId;

      const [libraryAssets, storeContents, products] = await Promise.all([
        AppDataSource.query(
          `SELECT id, title, asset_type AS "assetType", category
             FROM store_execution_assets
            WHERE organization_id = $1 AND is_active = true
            ORDER BY created_at DESC
            LIMIT 200`,
          [organizationId],
        ),
        AppDataSource.query(
          `SELECT id, title
             FROM kpa_store_contents
            WHERE organization_id = $1 AND source_type = 'direct'
            ORDER BY created_at DESC
            LIMIT 200`,
          [organizationId],
        ),
        AppDataSource.query(
          `SELECT opl.id,
                  COALESCE(pm.name, pm.regulatory_name, '(이름 없음)') AS name,
                  pm.brand_name AS "brandName"
             FROM organization_product_listings opl
             LEFT JOIN product_masters pm ON pm.id = opl.master_id
            WHERE opl.organization_id = $1
            ORDER BY pm.name ASC NULLS LAST
            LIMIT 200`,
          [organizationId],
        ),
      ]);

      return res.json({
        success: true,
        data: { storeConnection, libraryAssets, storeContents, products },
      });
    } catch (error) {
      return fail(res, userId, 'sources', error, '연결 대상을 불러오지 못했습니다.', 'QR_SOURCES_FAILED');
    }
  }

  /** POST /store-owner/qr — slug 는 서버가 발급한다(전역 unique). */
  static async create(req: Request, res: Response): Promise<any> {
    const userId = getUserId(req, res);
    if (!userId) return;
    if (rejectsOrganizationId(req, res)) return;

    try {
      const resolution = await resolvePharmacyHubStoreOrganization(userId);
      if (resolution.status !== 'connected') return sendWriteBlocked(res, resolution);

      const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
      if (!title) {
        return res
          .status(400)
          .json({ success: false, error: 'QR 이름을 입력해 주세요.', code: 'VALIDATION_ERROR' });
      }

      const landingType = req.body?.landingType;
      if (!(ALLOWED_LANDING_TYPES as readonly string[]).includes(landingType)) {
        return res.status(400).json({
          success: false,
          error: '지원하지 않는 연결 유형입니다.',
          code: 'VALIDATION_ERROR',
        });
      }

      const target = await resolveTarget(
        resolution.organizationId,
        landingType as AllowedLandingType,
        req.body,
      );
      if (!target.ok) {
        // strictNullChecks 가 꺼져 있어 `!target.ok` 로 union 이 좁혀지지 않는다 — 형만 확정한다.
        const rejected = target as { message: string; code: string };
        return res.status(400).json({ success: false, error: rejected.message, code: rejected.code });
      }

      const result = await createStoreQrCode(
        AppDataSource,
        resolution.organizationId,
        {
          title,
          description: typeof req.body?.description === 'string' ? req.body.description : null,
          landingType,
          libraryItemId: target.libraryItemId,
          landingTargetId: target.landingTargetId,
          slug: generateSlug(title),
          consultationCtaEnabled: req.body?.consultationCtaEnabled === true,
          consultationCtaLabel: req.body?.consultationCtaLabel,
        },
        { serviceKey: SERVICE_KEY, userId },
      );
      if (!result.ok) return sendFailure(res, result);
      return res.status(201).json({ success: true, data: result.data.qr });
    } catch (error) {
      return fail(res, userId, 'create', error, 'QR 을 만들지 못했습니다.', 'QR_CREATE_FAILED');
    }
  }

  /**
   * PUT /store-owner/qr/:id — 이름·설명·상담 CTA 만 수정한다.
   * 연결 대상(landingType/target)과 slug 는 **바꾸지 않는다** — 이미 인쇄·배포된 QR 의
   * 주소와 목적지가 바뀌면 매장 밖에 나가 있는 인쇄물이 조용히 다른 곳을 가리키게 된다.
   * 목적지를 바꾸려면 새 QR 을 만든다.
   */
  static async update(req: Request, res: Response): Promise<any> {
    const userId = getUserId(req, res);
    if (!userId) return;
    if (rejectsOrganizationId(req, res)) return;
    if (rejectsMalformedId(req, res)) return;

    try {
      const resolution = await resolvePharmacyHubStoreOrganization(userId);
      if (resolution.status !== 'connected') return sendWriteBlocked(res, resolution);

      const result = await updateStoreQrCode(AppDataSource, resolution.organizationId, req.params.id, {
        title: req.body?.title,
        description: req.body?.description,
        consultationCtaEnabled: req.body?.consultationCtaEnabled,
        consultationCtaLabel: req.body?.consultationCtaLabel,
      });
      if (!result.ok) return sendFailure(res, result);
      return res.json({ success: true, data: result.data });
    } catch (error) {
      return fail(res, userId, 'update', error, 'QR 을 수정하지 못했습니다.', 'QR_UPDATE_FAILED');
    }
  }

  /** DELETE /store-owner/qr/:id — 비활성화(soft delete). 공개 랜딩은 즉시 404 가 된다. */
  static async deactivate(req: Request, res: Response): Promise<any> {
    const userId = getUserId(req, res);
    if (!userId) return;
    if (rejectsMalformedId(req, res)) return;

    try {
      const resolution = await resolvePharmacyHubStoreOrganization(userId);
      if (resolution.status !== 'connected') return sendWriteBlocked(res, resolution);

      const result = await deactivateStoreQrCode(AppDataSource, resolution.organizationId, req.params.id);
      if (!result.ok) return sendFailure(res, result);
      return res.json({ success: true, data: result.data });
    } catch (error) {
      return fail(res, userId, 'deactivate', error, 'QR 을 내리지 못했습니다.', 'QR_DELETE_FAILED');
    }
  }

  /** GET /store-owner/qr/:id/analytics — 스캔 통계 */
  static async analytics(req: Request, res: Response): Promise<any> {
    const userId = getUserId(req, res);
    if (!userId) return;
    if (rejectsMalformedId(req, res)) return;

    try {
      const resolution = await resolvePharmacyHubStoreOrganization(userId);
      if (resolution.status !== 'connected') return sendWriteBlocked(res, resolution);

      const result = await getStoreQrAnalytics(AppDataSource, resolution.organizationId, req.params.id);
      if (!result.ok) return sendFailure(res, result);
      return res.json({ success: true, data: result.data });
    } catch (error) {
      return fail(res, userId, 'analytics', error, '스캔 통계를 불러오지 못했습니다.', 'QR_ANALYTICS_FAILED');
    }
  }

  /**
   * GET /store-owner/qr/:id/export?format=png|svg|pdf&preset=small|medium|large|a4|a4_4up
   *
   * QR 에는 항상 공개 `/qr/:slug` 주소를 담는다 — 외부 링크 QR 도 스캔 추적을 위해 slug 를 경유한다.
   * 비활성(내린) QR 은 출력하지 않는다.
   */
  static async exportFile(req: Request, res: Response): Promise<any> {
    const userId = getUserId(req, res);
    if (!userId) return;
    if (rejectsMalformedId(req, res)) return;

    try {
      const resolution = await resolvePharmacyHubStoreOrganization(userId);
      if (resolution.status !== 'connected') return sendWriteBlocked(res, resolution);

      const format = String(req.query.format || 'png').toLowerCase();
      if (!['png', 'svg', 'pdf'].includes(format)) {
        return res.status(400).json({
          success: false,
          error: 'format 은 png · svg · pdf 중 하나여야 합니다.',
          code: 'VALIDATION_ERROR',
        });
      }
      const presetRaw = String(req.query.preset || '').toLowerCase();

      const found = await findStoreQrCode(AppDataSource, resolution.organizationId, req.params.id, {
        requireActive: true,
      });
      if (!found.ok) return sendFailure(res, found);
      const qr = found.data;

      const qrUrl = `${qrPublicOrigin()}/qr/${qr.slug}`;
      // 한글 제목 파일명: RFC 5987 filename* + ASCII filename 폴백을 함께 준다.
      const safeTitle = (qr.title || `qr-${qr.slug}`)
        .replace(/[\\/:*?"<>|]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 80);
      const ascii =
        safeTitle.replace(/[^\x20-\x7e]/g, '').replace(/["\\]/g, '').replace(/\s+/g, '_').replace(/^_|_$/g, '') ||
        `qr-${qr.slug}`;
      const disposition = (ext: string) =>
        `attachment; filename="${ascii}.${ext}"; filename*=UTF-8''${encodeURIComponent(safeTitle)}.${ext}`;

      if (format === 'pdf') {
        const perPage: 1 | 4 = presetRaw === 'a4_4up' ? 4 : 1;
        const [orgRow] = await AppDataSource.query(
          `SELECT name FROM organizations WHERE id = $1 LIMIT 1`,
          [resolution.organizationId],
        );
        const item: QrPosterItem = {
          url: qrUrl,
          title: qr.title,
          description: qr.description || undefined,
          storeName: orgRow?.name || undefined,
        };
        // 4분할은 같은 QR 4개를 한 장에 배치한다(절취 사용).
        const pdf = await generateQrPosterPdf(perPage === 4 ? [item, item, item, item] : [item], perPage);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', disposition('pdf'));
        return res.send(pdf);
      }

      const rasterPreset: QrExportPreset = (['small', 'medium', 'large'] as const).includes(
        presetRaw as any,
      )
        ? (presetRaw as QrExportPreset)
        : 'medium';
      const size = presetToPixelSize(rasterPreset);

      if (format === 'svg') {
        const svg = await generateQrSvg(qrUrl, size, 4);
        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Content-Disposition', disposition('svg'));
        return res.send(svg);
      }
      const png = await generateQrPng(qrUrl, size, 4);
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Disposition', disposition('png'));
      return res.send(png);
    } catch (error) {
      return fail(res, userId, 'export', error, 'QR 파일을 만들지 못했습니다.', 'QR_EXPORT_FAILED');
    }
  }
}
