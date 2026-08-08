/**
 * Store QR Service — 매장 QR 코드(store_qr_codes) CRUD 공통 로직
 *
 * WO-PHARMACY-HUB-STORE-EXECUTION-ASSETS-V1 (공통 service 추출)
 * 원본: routes/o4o-store/controllers/store-qr-landing.controller.ts
 *       (WO-O4O-QR-LANDING-PAGE-V1 / WO-STORE-QR-PRODUCT-DIRECT-LINK-V1 /
 *        WO-O4O-KPA-TABLET-QR-LANDING-CONTRACT-V1 / WO-O4O-KPA-QR-TARGET-COPY-GUARD-V1 외)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 왜 추출하는가 — store-library.service.ts / store-handled-products.service.ts 와 동일한 이유다.
 *   공통 controller 는 createRequireStoreOwner(=resolveStoreAccess) 로 조직을 주입받는다.
 *   그 해석기는 서비스 스코프 없이 organization_members 를 정렬 없는 LIMIT 1 로 고르므로
 *   다중 조직 계정에서 Pharmacy-Hub enrollment 조직과 일치한다는 보장이 없다.
 *   Pharmacy-Hub 는 resolvePharmacyHubStoreOrganization() 으로 조직을 정한다.
 *   **조직 결정만 서비스 경계별로 하고(공통 가드 무변경), 검증·SQL 계약은 공유한다.**
 *
 * 계약
 *   - 인증·조직 결정을 하지 않는다. organizationId 는 호출자가 해석해서 넘긴다.
 *   - 소유 경계는 organization_id 단일 축이다 (Boundary Policy §7 Store Ops).
 *   - 삭제는 **비활성화(soft delete)** 다 (is_active=false). 물리 삭제 경로를 만들지 않는다.
 *   - 검증 실패는 예외가 아니라 결과 객체로 돌려준다 (라우트가 상태코드를 그대로 매핑).
 *   - 응답 envelope 은 만들지 않는다 — 공통 라우트는 nested({error:{code,message}}),
 *     Pharmacy-Hub 는 flat({error,code}) 로 서로 다르기 때문이다.
 *   - QR 이미지/PDF 렌더는 스트리밍이라 라우트에 남긴다. 여기서는 대상 조회까지만 담당한다.
 */

import type { DataSource } from 'typeorm';
import { StoreQrCode } from '../../routes/platform/entities/store-qr-code.entity.js';
import { StoreExecutionAsset } from '../../routes/platform/entities/store-execution-asset.entity.js';
import { recordDerivations } from '../../routes/o4o-store/services/store-asset-derivation.service.js';
import { ensureStoreCopyForPageTarget } from '../../routes/o4o-store/services/qr-content-hub-copy.service.js';
// WO-O4O-KPA-TABLET-QR-LANDING-CONTRACT-V1: screen_set landing 은 태블릿과 같은 공용 resolver 를 쓴다(콘텐츠 원본 1개).
import { resolveScreenSetSections } from '../../routes/platform/store-public/store-public-screen-set-resolve.js';
// WO-O4O-SCREEN-SET-RESOLVER-CONTENT-SOURCE-SEAM-V1: content_list 원본 조회 기본 Store Adapter 명시 주입.
import { createStoreContentSourceAdapter } from '../../routes/platform/store-public/store-public-tablet-content-source.js';

/**
 * QR 연결(landing) 타입.
 *   product    : supplier_product_offers / organization_product_listings
 *   promotion  : 매장 프로모션
 *   page       : 매장 소유 콘텐츠 사본 (store_execution_assets / kpa_store_contents direct)
 *   link       : 외부 URL
 *   video      : store_videos 매장 사본
 *   screen_set : store_tablet_screen_sets (태블릿과 같은 화면을 모바일로 연다)
 */
export const VALID_QR_LANDING_TYPES = [
  'product',
  'promotion',
  'page',
  'link',
  'video',
  'screen_set',
] as const;
export type QrLandingType = (typeof VALID_QR_LANDING_TYPES)[number];

/** 검증·부존재 실패. 라우트가 상태코드로 그대로 매핑한다. */
export interface QrFailure {
  ok: false;
  status: number;
  code: string;
  message: string;
}

export type QrResult<T> = { ok: true; data: T } | QrFailure;

const NOT_FOUND: QrFailure = {
  ok: false,
  status: 404,
  code: 'QR_NOT_FOUND',
  message: 'QR code not found',
};

function invalid(message: string): QrFailure {
  return { ok: false, status: 400, code: 'VALIDATION_ERROR', message };
}

function failure(status: number, code: string, message: string): QrFailure {
  return { ok: false, status, code, message };
}

// ────────────────────────────────────────────────────────────────────────────
// 공개 랜딩 (GET /qr/public/:slug)
// ────────────────────────────────────────────────────────────────────────────

/** 스캔 이벤트 기록에 쓰이는 요청 메타. 라우트가 신뢰 가능한 값으로 채워서 넘긴다. */
export interface QrScanMeta {
  deviceType: string;
  userAgent: string | null;
  referer: string | null;
  /** 원문 IP 가 아니라 해시. 개인식별 값을 저장하지 않는다. */
  ipHash: string | null;
}

export interface PublicQrLandingResult {
  ok: true;
  data: Record<string, unknown>;
}

/**
 * GET — 공개 QR 랜딩 데이터 + 스캔 이벤트 기록.
 *
 * 실패 코드
 *   QR_NOT_FOUND           : slug 없음 / 비활성 일반 QR
 *   SCREEN_SET_INACTIVE    : 비활성 screen_set QR (410 — 종료된 화면, slug 는 유지되어 복원 가능)
 *   SCREEN_SET_UNAVAILABLE : Screen Set 보관·삭제·org 불일치 (이중 게이트 실패)
 *
 * 스캔 이벤트는 fire-and-forget 이며 같은 (qr, ipHash) 는 5초 내 중복 기록하지 않는다.
 */
export async function resolvePublicQrLanding(
  dataSource: DataSource,
  slug: string,
  serviceKey: string | undefined,
  scan: QrScanMeta,
): Promise<QrResult<Record<string, unknown>>> {
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
       qr.consultation_cta_enabled AS "consultationCtaEnabled",
       qr.consultation_cta_label AS "consultationCtaLabel",
       li.file_url AS "imageUrl",
       li.title AS "libraryItemTitle",
       li.html_content AS "libraryItemHtml",
       qr.is_active AS "isActive"
     FROM store_qr_codes qr
     LEFT JOIN store_execution_assets li
       ON li.id = qr.library_item_id AND li.is_active = true
     WHERE qr.slug = $1
     LIMIT 1`,
    [slug],
  );

  if (rows.length === 0) return NOT_FOUND;

  const qrData = rows[0];

  // WO-O4O-SCREEN-SET-QR-LIFECYCLE-SYNC-V1: 비활성 Screen Set QR 은 archive 로 종료된 화면 →
  //   일반 404 대신 410 Gone + 종료 안내. 일반 QR 비활성은 기존대로 404.
  if (!qrData.isActive) {
    if (qrData.landingType === 'screen_set') {
      return failure(
        410,
        'SCREEN_SET_INACTIVE',
        '현재 사용할 수 없는 화면입니다. 매장에서 새로 안내받은 QR을 이용해 주세요.',
      );
    }
    return NOT_FOUND;
  }

  // 5초 중복 방지: 같은 ipHash + qrCodeId
  dataSource
    .query(
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
        scan.deviceType,
        scan.userAgent,
        scan.referer,
        scan.ipHash,
      ],
    )
    .catch((err: unknown) => {
      console.error('[QR Scan Event] Insert failed:', err);
    });

  const storeRows = await dataSource.query(
    `SELECT slug FROM platform_store_slugs
     WHERE store_id = $1 AND is_active = true
     ORDER BY created_at DESC LIMIT 1`,
    [qrData.organizationId],
  );

  // WO-STORE-QR-PRODUCT-DIRECT-LINK-V1: product 타입이면 상품 정보 포함.
  //   landingTargetId 는 supplier_product_offers.id 또는 organization_product_listings.id 둘 다 가능.
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

  // WO-O4O-KPA-QR-CODE-VIDEO-CONTENT-V1 (+ SUPPLIER-RESOURCE-...-PRESERVE-V1 published 게이트):
  //   video QR 은 매장 사본(store_videos)의 외부 URL 을 내려준다. draft/archived 는 미노출.
  let videoUrl: string | null = null;
  if (qrData.landingType === 'video' && qrData.landingTargetId) {
    const videoRows = await dataSource.query(
      `SELECT video_url AS "videoUrl"
       FROM store_videos
       WHERE id = $1 AND store_id = $2 AND status = 'published'
       LIMIT 1`,
      [qrData.landingTargetId, qrData.organizationId],
    );
    videoUrl = videoRows[0]?.videoUrl || null;
  }

  // WO-O4O-KPA-QR-TARGET-COPY-GUARD-V1 (P1=A안):
  //   page QR 은 매장 소유 사본만 본다. content_hub 원본(kpa_contents) 직접 렌더 분기는 없다.
  //   여기서는 매장 직접 콘텐츠(kpa_store_contents source_type='direct')만 inline 으로 내려주고,
  //   미발견 시 매장 자료(libraryItemHtml) 및 frontend redirect 폴백을 보존한다.
  type PublicQrItem = { key: string; name: string; descriptionHtml: string; relatedKeys: string[] };
  let pageContent:
    | {
        available: true;
        title: string;
        summary: string | null;
        body: string | null;
        blocks: unknown[];
        items: PublicQrItem[];
        source: 'store_asset' | 'direct_content';
      }
    | null = null;
  const PUBLIC_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (
    qrData.landingType === 'page' &&
    qrData.landingTargetId &&
    PUBLIC_UUID_RE.test(qrData.landingTargetId)
  ) {
    const directRows = await dataSource.query(
      `SELECT title, content_json
         FROM kpa_store_contents
        WHERE id = $1 AND organization_id = $2 AND source_type = 'direct'
        LIMIT 1`,
      [qrData.landingTargetId, qrData.organizationId],
    );
    const d = directRows[0];
    if (d) {
      const cj = (d.content_json ?? {}) as any;
      const html = typeof cj.html === 'string' ? cj.html : null;
      const blocks = Array.isArray(cj.blocks) ? cj.blocks : Array.isArray(cj) ? cj : [];
      // 코너 AI 설명 items — 저장된 설명만 그대로 노출(스캔 시 추가 AI 호출 0).
      const rawItems = Array.isArray(cj?.aiDescription?.items) ? cj.aiDescription.items : [];
      const items: PublicQrItem[] = rawItems
        .map((it: any) => ({
          key: typeof it?.key === 'string' ? it.key : '',
          name: typeof it?.name === 'string' ? it.name : '',
          descriptionHtml: typeof it?.descriptionHtml === 'string' ? it.descriptionHtml : '',
          relatedKeys: Array.isArray(it?.relatedKeys)
            ? it.relatedKeys.filter((k: unknown): k is string => typeof k === 'string')
            : [],
        }))
        .filter((it: PublicQrItem) => it.key && it.descriptionHtml);
      pageContent = {
        available: true,
        title: d.title,
        summary: null,
        body: html,
        blocks,
        items,
        source: 'direct_content',
      };
    }
  }

  // 내 매장 제작자료(store_execution_assets, assetType='content')를 QR 대상으로 만든 경우
  // landing_target_id 없이 library_item_id 만 갖는다. library_item 은 QR 과 동일 organization
  // 소유로 JOIN 되므로(위 LEFT JOIN) 추가 경계 검사가 필요 없다.
  if (
    pageContent === null &&
    qrData.landingType === 'page' &&
    typeof qrData.libraryItemHtml === 'string' &&
    qrData.libraryItemHtml.trim() !== ''
  ) {
    pageContent = {
      available: true,
      title: qrData.libraryItemTitle || qrData.title,
      summary: null,
      body: qrData.libraryItemHtml,
      blocks: [],
      items: [],
      source: 'store_asset',
    };
  }

  // screen_set landing — 이중 게이트 = QR is_active(위) + Screen Set 유효(resolver 내부).
  //   태블릿과 같은 resolver 를 써서 같은 콘텐츠 원본을 렌더 데이터로 반환한다.
  let screenSet:
    | { landingType: 'screen_set'; slug: string; name: string; templateKey: string; sections: unknown[] }
    | null = null;
  if (qrData.landingType === 'screen_set' && qrData.landingTargetId) {
    const resolvedSet = await resolveScreenSetSections(
      dataSource,
      {
        organizationId: qrData.organizationId,
        screenSetId: qrData.landingTargetId,
        serviceKey: serviceKey || 'kpa',
        storeId: qrData.organizationId,
        storeSlug: storeRows[0]?.slug || null,
        // tabletContext 없음 → 매장 org 기준(대기영상 custom-only, 상품 org 기준).
      },
      createStoreContentSourceAdapter(dataSource),
    );
    if (!resolvedSet) {
      return failure(404, 'SCREEN_SET_UNAVAILABLE', 'Screen set is not available');
    }
    screenSet = {
      landingType: 'screen_set',
      slug: qrData.slug,
      name: resolvedSet.set.name,
      templateKey: resolvedSet.set.templateKey,
      sections: resolvedSet.sections,
    };
    // 내부 Screen Set UUID 는 프론트에 노출하지 않는다(slug 로만 접근).
    qrData.landingTargetId = null;
  }

  return {
    ok: true,
    data: {
      ...qrData,
      storeSlug: storeRows[0]?.slug || null,
      productDetails,
      videoUrl,
      pageContent,
      screenSet,
    },
  };
}

// ────────────────────────────────────────────────────────────────────────────
// 목록
// ────────────────────────────────────────────────────────────────────────────

export interface ListQrParams {
  page?: unknown;
  limit?: unknown;
}

export interface ListQrResult {
  items: Array<Record<string, unknown>>;
  page: number;
  limit: number;
  total: number;
}

/**
 * GET — 매장 QR 목록 (활성 항목만, scanCount 포함).
 *
 * scanCount 는 store_qr_scan_events 집계이고, aiDescriptionMode 는 page QR 이 가리키는
 * 매장 직접 콘텐츠(kpa_store_contents source_type='direct')의 AI 설명 모드다.
 * landing_target_id 는 varchar(링크 QR=URL 등 비-UUID 가능)라 uuid 직접 비교 금지 — id::text 로 비교한다.
 */
export async function listStoreQrCodes(
  dataSource: DataSource,
  organizationId: string,
  params: ListQrParams,
): Promise<ListQrResult> {
  const page = Math.max(1, parseInt(params.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(params.limit as string) || 20));
  const offset = (page - 1) * limit;

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
         qr.consultation_cta_enabled AS "consultationCtaEnabled",
         qr.consultation_cta_label AS "consultationCtaLabel",
         COALESCE(sc.scan_count, 0)::int AS "scanCount",
         dc.content_json->'aiDescription'->>'mode' AS "aiDescriptionMode"
       FROM store_qr_codes qr
       LEFT JOIN (
         SELECT qr_code_id, COUNT(*) AS scan_count
         FROM store_qr_scan_events
         WHERE organization_id = $1
         GROUP BY qr_code_id
       ) sc ON sc.qr_code_id = qr.id
       LEFT JOIN kpa_store_contents dc
         ON dc.id::text = qr.landing_target_id
         AND dc.organization_id = qr.organization_id
         AND dc.source_type = 'direct'
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

  return { items, page, limit, total: countResult[0]?.total || 0 };
}

// ────────────────────────────────────────────────────────────────────────────
// 스캔 통계
// ────────────────────────────────────────────────────────────────────────────

export interface QrAnalytics {
  totalScans: number;
  todayScans: number;
  weeklyScans: number;
  deviceStats: Record<string, number>;
}

/** GET — 단일 QR 스캔 통계. 소유 경계(organization_id) 확인 후 집계한다. */
export async function getStoreQrAnalytics(
  dataSource: DataSource,
  organizationId: string,
  id: string,
): Promise<QrResult<QrAnalytics>> {
  const qrRepo = dataSource.getRepository(StoreQrCode);
  const qr = await qrRepo.findOne({ where: { id, organizationId } });
  if (!qr) return NOT_FOUND;

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

  return { ok: true, data: { ...stats, deviceStats } };
}

/**
 * 출력(이미지/PDF) 대상 QR 단건 조회.
 * `requireActive` 를 켜면 비활성(삭제) QR 은 출력 대상에서 제외한다.
 */
export async function findStoreQrCode(
  dataSource: DataSource,
  organizationId: string,
  id: string,
  opts: { requireActive?: boolean } = {},
): Promise<QrResult<StoreQrCode>> {
  const qrRepo = dataSource.getRepository(StoreQrCode);
  const where: Record<string, unknown> = { id, organizationId };
  if (opts.requireActive) where.isActive = true;
  const qr = await qrRepo.findOne({ where: where as any });
  if (!qr) return NOT_FOUND;
  return { ok: true, data: qr };
}

// ────────────────────────────────────────────────────────────────────────────
// 생성
// ────────────────────────────────────────────────────────────────────────────

export interface CreateQrContext {
  /** store_asset_derivations / content 사본 추적용 서비스 키 */
  serviceKey?: string | null;
  /** 파생 기록 작성자 */
  userId?: string | null;
}

export interface CreateQrResult {
  qr: StoreQrCode;
  /** screen_set QR 이 기존 것을 재사용했으면 true (신규 생성 아님 → 200) */
  reused: boolean;
}

/**
 * POST — QR 생성.
 *
 * landingType 별 계약:
 *   screen_set : store_tablet_screen_sets(origin='store', 미삭제·미보관, 같은 org)만 대상.
 *                같은 Screen Set 에 QR 이 이미 있으면 **재사용**한다 (이름 변경 ≠ 주소 변경).
 *                public_qr_slug 를 denormalize 동기화한다 (SSOT=store_qr_codes).
 *   product    : productId 제공 시 supplier_product_offers(APPROVED·active) 검증 후 대상 확정.
 *   page       : content_hub 원본을 가리키면 매장 소유 사본으로 치환한다
 *                (WO-O4O-KPA-QR-TARGET-COPY-GUARD-V1 — 매장 QR 은 원본을 직접 참조하지 않는다).
 *   그 외      : 그대로 저장.
 *
 * 상담 CTA 는 page 타입에서만 의미가 있으므로 나머지 타입에서는 무조건 OFF 로 정규화한다.
 */
export async function createStoreQrCode(
  dataSource: DataSource,
  organizationId: string,
  body: any,
  ctx: CreateQrContext = {},
): Promise<QrResult<CreateQrResult>> {
  const qrRepo = dataSource.getRepository(StoreQrCode);

  const {
    title,
    description,
    type,
    libraryItemId,
    landingType,
    landingTargetId,
    productId,
    slug,
    consultationCtaEnabled,
    consultationCtaLabel,
  } = body ?? {};

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return invalid('title is required');
  }
  if (!slug || typeof slug !== 'string' || slug.trim().length === 0) {
    return invalid('slug is required');
  }
  if (!landingType || !(VALID_QR_LANDING_TYPES as readonly string[]).includes(landingType)) {
    return invalid('Invalid landingType');
  }

  // ── screen_set — 별도 계약으로 완결 처리 (page-guard / product / marketing-graph 미경유) ──
  if (landingType === 'screen_set') {
    const setId = typeof landingTargetId === 'string' ? landingTargetId.trim() : '';
    if (!setId) return invalid('landingTargetId (screen set id) is required');

    // WO-O4O-STORE-SCREEN-SET-ORIGIN-ISOLATION-HARDENING-V1:
    //   QR 발급 대상은 매장 소유(origin='store') 원본만. 운영자·공급자 원본 ID 는 404.
    const [setRow] = await dataSource.query(
      `SELECT id, name FROM store_tablet_screen_sets
       WHERE id = $1 AND organization_id = $2 AND origin = 'store'
         AND deleted_at IS NULL AND status <> 'archived' LIMIT 1`,
      [setId, organizationId],
    );
    if (!setRow) {
      return failure(
        404,
        'SCREEN_SET_NOT_FOUND',
        'Screen set not found in this store (or archived/deleted)',
      );
    }

    const existingQr = await qrRepo.findOne({
      where: { organizationId, landingType: 'screen_set', landingTargetId: setId },
    });
    if (existingQr) {
      await dataSource.query(
        `UPDATE store_tablet_screen_sets SET public_qr_slug = $1, updated_at = NOW()
         WHERE id = $2 AND organization_id = $3`,
        [existingQr.slug, setId, organizationId],
      );
      return { ok: true, data: { qr: existingQr, reused: true } };
    }

    const setSlug = slug.trim();
    const slugConflict = await qrRepo.findOne({ where: { slug: setSlug } });
    if (slugConflict) return failure(409, 'SLUG_CONFLICT', 'Slug already in use');

    const createdSet = qrRepo.create({
      organizationId,
      type: 'screen_set',
      title: title.trim(),
      description: description || null,
      libraryItemId: null,
      landingType: 'screen_set',
      landingTargetId: setId,
      slug: setSlug,
      isActive: true,
    });
    const savedSet = await qrRepo.save(createdSet);
    await dataSource.query(
      `UPDATE store_tablet_screen_sets SET public_qr_slug = $1, updated_at = NOW()
       WHERE id = $2 AND organization_id = $3`,
      [savedSet.slug, setId, organizationId],
    );
    return { ok: true, data: { qr: savedSet, reused: false } };
  }

  // ── product — productId 직접 연결 검증 ──
  let resolvedLandingTargetId: string | null = landingTargetId || null;
  if (landingType === 'product' && productId) {
    const [productCheck] = await dataSource.query(
      `SELECT spo.id FROM supplier_product_offers spo
       WHERE spo.id = $1 AND spo.is_active = true AND spo.approval_status = 'APPROVED'
       LIMIT 1`,
      [productId],
    );
    if (!productCheck) {
      return failure(400, 'PRODUCT_NOT_FOUND', 'Product not found or not available');
    }
    resolvedLandingTargetId = productId; // productId 우선
  }

  const existing = await qrRepo.findOne({ where: { slug: slug.trim() } });
  if (existing) return failure(409, 'SLUG_CONFLICT', 'Slug already in use');

  // ── page — content_hub 원본 → 매장 사본 치환 ──
  let resolvedLibraryItemId: string | null = libraryItemId || null;
  if (landingType === 'page') {
    const guarded = await ensureStoreCopyForPageTarget(dataSource, {
      organizationId,
      serviceKey: ctx.serviceKey ?? null,
      landingTargetId: resolvedLandingTargetId,
      libraryItemId: resolvedLibraryItemId,
      createdBy: ctx.userId ?? null,
    });
    resolvedLibraryItemId = guarded.libraryItemId;
    resolvedLandingTargetId = guarded.landingTargetId;
  }

  const ctaEnabled = landingType === 'page' && consultationCtaEnabled === true;
  const ctaLabel =
    ctaEnabled && typeof consultationCtaLabel === 'string' && consultationCtaLabel.trim()
      ? consultationCtaLabel.trim().slice(0, 100)
      : null;

  const item = qrRepo.create({
    organizationId,
    type: type || landingType,
    title: title.trim(),
    description: description || null,
    libraryItemId: resolvedLibraryItemId,
    landingType,
    landingTargetId: resolvedLandingTargetId,
    slug: slug.trim(),
    isActive: true,
    consultationCtaEnabled: ctaEnabled,
    consultationCtaLabel: ctaLabel,
  });

  const saved = await qrRepo.save(item);

  // WO-KPA-STORE-ASSET-DERIVATION-QR-BLOG-WRITEPATH-V1: 원본(자료함)→qr_code 관계 best-effort 기록.
  //   실패해도 생성 응답에 영향을 주지 않는다.
  if (resolvedLibraryItemId) {
    try {
      const lib = await dataSource
        .getRepository(StoreExecutionAsset)
        .findOne({ where: { id: resolvedLibraryItemId, organizationId } });
      await recordDerivations(dataSource, {
        serviceKey: ctx.serviceKey ?? 'kpa',
        organizationId,
        createdBy: ctx.userId ?? null,
        derivedKind: 'qr_code',
        derivedId: saved.id,
        derivedTitle: saved.title,
        sources: [
          { kind: 'store_execution_asset', id: resolvedLibraryItemId, title: lib?.title ?? null },
        ],
      });
    } catch (derivationErr) {
      console.error('[store-qr] derivation record failed (non-blocking)', derivationErr);
    }
  }

  // WO-O4O-PRODUCT-MARKETING-GRAPH-V1: Auto-link QR → Product (fire-and-forget)
  if (landingType === 'product' && resolvedLandingTargetId) {
    dataSource
      .query(
        `INSERT INTO product_marketing_assets (organization_id, product_id, asset_type, asset_id)
         VALUES ($1, $2, 'qr', $3)
         ON CONFLICT (product_id, asset_type, asset_id) DO NOTHING`,
        [organizationId, resolvedLandingTargetId, saved.id],
      )
      .catch((err: unknown) => {
        console.error('[ProductMarketingGraph] Auto-link QR failed:', err);
      });
  }

  return { ok: true, data: { qr: saved, reused: false } };
}

// ────────────────────────────────────────────────────────────────────────────
// 수정 · 비활성화
// ────────────────────────────────────────────────────────────────────────────

/** PUT — QR 수정. slug 변경 시 전역 unique 충돌을 검사한다. */
export async function updateStoreQrCode(
  dataSource: DataSource,
  organizationId: string,
  id: string,
  body: any,
): Promise<QrResult<StoreQrCode>> {
  const qrRepo = dataSource.getRepository(StoreQrCode);
  const item = await qrRepo.findOne({ where: { id, organizationId } });
  if (!item) return NOT_FOUND;

  const {
    title,
    description,
    type,
    libraryItemId,
    landingType,
    landingTargetId,
    slug,
    consultationCtaEnabled,
    consultationCtaLabel,
  } = body ?? {};

  if (title !== undefined) item.title = String(title).trim();
  if (description !== undefined) item.description = description;
  if (type !== undefined) item.type = type;
  if (libraryItemId !== undefined) item.libraryItemId = libraryItemId;
  if (landingType !== undefined) item.landingType = landingType;
  if (landingTargetId !== undefined) item.landingTargetId = landingTargetId;

  // 상담 CTA 는 page 타입에서만 ON 을 허용한다.
  if (consultationCtaEnabled !== undefined) {
    const effectiveLandingType = landingType !== undefined ? landingType : item.landingType;
    item.consultationCtaEnabled = effectiveLandingType === 'page' && consultationCtaEnabled === true;
    if (!item.consultationCtaEnabled) item.consultationCtaLabel = null;
  }
  if (consultationCtaLabel !== undefined) {
    item.consultationCtaLabel =
      item.consultationCtaEnabled &&
      typeof consultationCtaLabel === 'string' &&
      consultationCtaLabel.trim()
        ? consultationCtaLabel.trim().slice(0, 100)
        : null;
  }

  if (slug !== undefined && slug !== item.slug) {
    const conflict = await qrRepo.findOne({ where: { slug: String(slug).trim() } });
    if (conflict) return failure(409, 'SLUG_CONFLICT', 'Slug already in use');
    item.slug = String(slug).trim();
  }

  const saved = await qrRepo.save(item);
  return { ok: true, data: saved };
}

/** DELETE — 비활성화(soft delete). 물리 삭제 경로를 만들지 않는다. */
export async function deactivateStoreQrCode(
  dataSource: DataSource,
  organizationId: string,
  id: string,
): Promise<QrResult<{ id: string; deactivated: true }>> {
  const qrRepo = dataSource.getRepository(StoreQrCode);
  const item = await qrRepo.findOne({ where: { id, organizationId } });
  if (!item) return NOT_FOUND;

  item.isActive = false;
  await qrRepo.save(item);
  return { ok: true, data: { id, deactivated: true } };
}
