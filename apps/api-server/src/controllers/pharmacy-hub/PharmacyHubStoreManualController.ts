/**
 * Pharmacy-Hub Store Owner Product Manual Controller — 상품 설명서 (조회 전용)
 *
 * WO-PHARMACY-HUB-STORE-EXECUTION-ASSETS-V1 (범위 E)
 *
 *   GET  /api/v1/pharmacy-hub/store-owner/manuals              매장 경영활용 제품 + 설명서 보유 언어
 *   GET  /api/v1/pharmacy-hub/store-owner/manuals/:listingId   설명서 상세 (언어별 본문)
 *   POST /api/v1/pharmacy-hub/store-owner/manuals/:listingId/qr 상품 QR 발급·조회 (멱등)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * canonical 판정 (하나뿐이다 — 이 WO 는 판정 기준을 새로 만들지 않는다)
 *
 *   매장용 상품 설명서 = shared_product_descriptions
 *       description_type = 'STORE'
 *       status           = 'canonical'
 *       deleted_at       IS NULL
 *       master_id        = organization_product_listings.master_id
 *
 *   같은 기준을 공통 ProductLandingService.getPublicLanding() 과
 *   공통 store-handled-products.routes.ts(GET /handled-products/qr) 가 이미 쓰고 있다.
 *   본 컨트롤러는 **그 기준을 그대로 읽기만** 한다.
 *
 * F12 (O4O-PRODUCT-RESOURCE-ARCHITECTURE-BASELINE-V1) 정합
 *   설명서는 계층1 Product Resource (master 기준 canonical) 다 — 매장 소유 자산이 아니다.
 *   따라서 매장별 사본을 만들지 않고, 매장은 **자기가 취급 등록한 제품의 것만** 조회한다.
 *   상품 QR 도 매장 QR(store_qr_codes)이 아니라 master 기준 고정 Landing(/p/{key}) 이다 —
 *   같은 상품이면 매장·콘텐츠가 바뀌어도 주소가 유지된다(불변식 ③④).
 *
 * DB write
 *   설명서 write 0 (생성·번역·수정 경로를 만들지 않는다).
 *   유일한 write 는 `POST .../qr` 의 product_landings **멱등 발급**이며, 이는 사용자가
 *   명시적으로 QR 을 요청했을 때만 일어난다 (목록·상세 조회는 순수 읽기).
 *
 * 조직 계약은 다른 Pharmacy-Hub 매장 컨트롤러와 동일하다 (enrollment 기준 · 클라이언트 미신뢰).
 */
import type { Request, Response } from 'express';
import { AppDataSource } from '../../database/connection.js';
import logger from '../../utils/logger.js';
import {
  resolvePharmacyHubStoreOrganization,
  type StoreOrgResolution,
} from './store-organization.resolver.js';
import {
  ProductLandingService,
  productLandingUrl,
} from '../../modules/neture/services/product-landing.service.js';

/** 설명서 canonical 조건 — 위 헤더 주석의 판정 기준을 SQL 로 1회만 표현한다. */
const SPD_CANONICAL_STORE = `description_type = 'STORE' AND status = 'canonical' AND deleted_at IS NULL`;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
      error: '매장이 연결되어 있지 않아 상품 QR 을 발급할 수 없습니다.',
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

function getUserId(req: Request, res: Response): string | null {
  const userId = (req as any).user?.id;
  if (typeof userId !== 'string' || userId.length === 0) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return null;
  }
  return userId;
}

function fail(res: Response, userId: string, op: string, error: unknown, message: string, code: string) {
  logger.error(`[PharmacyHubStoreManual] ${op} failed`, {
    userId,
    error: error instanceof Error ? error.message : String(error),
  });
  return res.status(500).json({ success: false, error: message, code });
}

/** ko 를 먼저, 나머지는 알파벳 순으로 (공통 ProductLandingService 정렬과 동일). */
function sortLocales(langs: string[]): string[] {
  return [...new Set(langs.map((l) => (l || 'ko').toLowerCase()))].sort((a, b) =>
    a === 'ko' ? -1 : b === 'ko' ? 1 : a.localeCompare(b),
  );
}

/**
 * listing 소유 검증 + master 해석.
 * 매장이 취급 등록하지 않은 제품의 설명서는 이 경로로 볼 수 없다.
 */
async function resolveListingMaster(
  organizationId: string,
  listingId: string,
): Promise<{ masterId: string | null; name: string | null; brandName: string | null } | null> {
  const rows = await AppDataSource.query(
    `SELECT opl.master_id AS "masterId",
            COALESCE(pm.name, pm.regulatory_name) AS name,
            pm.brand_name AS "brandName"
       FROM organization_product_listings opl
       LEFT JOIN product_masters pm ON pm.id = opl.master_id
      WHERE opl.id = $1 AND opl.organization_id = $2
      LIMIT 1`,
    [listingId, organizationId],
  );
  return rows[0] ?? null;
}

export class PharmacyHubStoreManualController {
  /**
   * GET /store-owner/manuals — 매장 경영활용 제품별 설명서 보유 현황.
   *
   * 매장 자체 상품(store_local_products)은 master 가 없어 canonical 설명서 대상이 아니다 →
   * 목록에 넣지 않는다 (빈 상세로 들어가는 항목을 만들지 않는다).
   */
  static async list(req: Request, res: Response): Promise<any> {
    const userId = getUserId(req, res);
    if (!userId) return;

    try {
      const resolution = await resolvePharmacyHubStoreOrganization(userId);
      const storeConnection = storeConnectionView(resolution);
      if (resolution.status !== 'connected') {
        return res.json({
          success: true,
          data: { storeConnection, items: [], total: 0, page: 1, limit: 20 },
        });
      }

      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
      const offset = (page - 1) * limit;
      const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

      const params: unknown[] = [resolution.organizationId];
      let searchClause = '';
      if (search) {
        params.push(`%${search}%`);
        searchClause = `AND (pm.name ILIKE $${params.length} OR pm.brand_name ILIKE $${params.length})`;
      }

      const [items, countRows] = await Promise.all([
        AppDataSource.query(
          `SELECT opl.id                                        AS "listingId",
                  opl.master_id                                 AS "masterId",
                  COALESCE(pm.name, pm.regulatory_name, '(이름 없음)') AS name,
                  pm.brand_name                                 AS "brandName",
                  pm.regulatory_type                            AS "regulatoryType",
                  COALESCE(spd.langs, ARRAY[]::text[])          AS languages
             FROM organization_product_listings opl
             LEFT JOIN product_masters pm ON pm.id = opl.master_id
             LEFT JOIN LATERAL (
               SELECT array_agg(DISTINCT COALESCE(d.language, 'ko')) AS langs
                 FROM shared_product_descriptions d
                WHERE d.master_id = opl.master_id AND ${SPD_CANONICAL_STORE}
             ) spd ON true
            WHERE opl.organization_id = $1
              AND opl.master_id IS NOT NULL
              ${searchClause}
            ORDER BY pm.name ASC NULLS LAST
            LIMIT ${limit} OFFSET ${offset}`,
          params,
        ),
        AppDataSource.query(
          `SELECT COUNT(*)::int AS total
             FROM organization_product_listings opl
             LEFT JOIN product_masters pm ON pm.id = opl.master_id
            WHERE opl.organization_id = $1
              AND opl.master_id IS NOT NULL
              ${searchClause}`,
          params,
        ),
      ]);

      return res.json({
        success: true,
        data: {
          storeConnection,
          items: items.map((r: any) => ({
            ...r,
            languages: sortLocales(r.languages ?? []),
            hasManual: (r.languages ?? []).length > 0,
          })),
          page,
          limit,
          total: countRows[0]?.total || 0,
        },
      });
    } catch (error) {
      return fail(res, userId, 'list', error, '설명서 목록을 불러오지 못했습니다.', 'MANUAL_LIST_FAILED');
    }
  }

  /**
   * GET /store-owner/manuals/:listingId?locale=ko — 설명서 상세.
   *
   * 요청 언어가 없으면 ko, ko 도 없으면 보유 언어 중 첫 번째로 폴백한다
   * (공통 ProductLandingService.getPublicLanding 과 동일한 폴백 규칙).
   * 설명서가 아예 없으면 `manual.hasCanonical=false` 로 **빈 상태를 명시**한다 — 404 가 아니다.
   */
  static async detail(req: Request, res: Response): Promise<any> {
    const userId = getUserId(req, res);
    if (!userId) return;

    const listingId = String(req.params.listingId ?? '');
    if (!UUID_RE.test(listingId)) {
      return res
        .status(404)
        .json({ success: false, error: '제품을 찾을 수 없습니다.', code: 'LISTING_NOT_FOUND' });
    }

    try {
      const resolution = await resolvePharmacyHubStoreOrganization(userId);
      const storeConnection = storeConnectionView(resolution);
      if (resolution.status !== 'connected') {
        return res.json({ success: true, data: { storeConnection, product: null, manual: null } });
      }

      const listing = await resolveListingMaster(resolution.organizationId, listingId);
      if (!listing) {
        return res
          .status(404)
          .json({ success: false, error: '제품을 매장에서 찾을 수 없습니다.', code: 'LISTING_NOT_FOUND' });
      }
      if (!listing.masterId) {
        // master 없는 listing(예외) — canonical 설명서 대상이 아니다.
        return res.json({
          success: true,
          data: {
            storeConnection,
            product: { listingId, masterId: null, name: listing.name, brandName: listing.brandName },
            manual: { hasCanonical: false, languages: [], locale: null, summary: null, content: null },
            landing: null,
          },
        });
      }

      const langRows = await AppDataSource.query(
        `SELECT DISTINCT COALESCE(language, 'ko') AS lang
           FROM shared_product_descriptions
          WHERE master_id = $1 AND ${SPD_CANONICAL_STORE}`,
        [listing.masterId],
      );
      const languages = sortLocales(langRows.map((r: any) => r.lang));

      const requested = String(req.query.locale ?? '').toLowerCase();
      const locale = languages.includes(requested)
        ? requested
        : languages.includes('ko')
          ? 'ko'
          : (languages[0] ?? null);

      let manualRow: any = null;
      if (locale) {
        // shared_product_descriptions 에는 title 컬럼이 없다 — 제목은 제품명(product_masters.name)이
        // 담당하고, 설명서는 summary + content(HTML) 만 갖는다.
        const rows = await AppDataSource.query(
          `SELECT summary, content, source_type AS "sourceType", updated_at AS "updatedAt"
             FROM shared_product_descriptions
            WHERE master_id = $1 AND ${SPD_CANONICAL_STORE}
              AND COALESCE(language, 'ko') = $2
            ORDER BY updated_at DESC
            LIMIT 1`,
          [listing.masterId, locale],
        );
        manualRow = rows[0] ?? null;
      }

      // 이미 발급된 Landing 만 읽는다 — 조회 화면은 write 하지 않는다(발급은 POST .../qr).
      const landing = await new ProductLandingService(AppDataSource).getByMaster(listing.masterId);

      return res.json({
        success: true,
        data: {
          storeConnection,
          product: {
            listingId,
            masterId: listing.masterId,
            name: listing.name,
            brandName: listing.brandName,
          },
          manual: {
            hasCanonical: !!manualRow,
            languages,
            locale: manualRow ? locale : null,
            summary: manualRow?.summary ?? null,
            content: manualRow?.content ?? null,
            sourceType: manualRow?.sourceType ?? null,
            updatedAt: manualRow?.updatedAt ?? null,
          },
          landing: landing
            ? { publicKey: landing.publicKey, url: productLandingUrl(landing.publicKey) }
            : null,
        },
      });
    } catch (error) {
      return fail(res, userId, 'detail', error, '설명서를 불러오지 못했습니다.', 'MANUAL_DETAIL_FAILED');
    }
  }

  /**
   * POST /store-owner/manuals/:listingId/qr — 상품 QR 발급·조회 (멱등).
   *
   * QR 이미지는 저장하지 않는다 — 공개 URL(/p/{public_key})을 그 자리에서 인코딩한다 (F12 불변식 ④).
   * 같은 master 면 항상 같은 QR 이므로 재호출해도 새 QR 이 생기지 않는다 (불변식 ③).
   */
  static async issueProductQr(req: Request, res: Response): Promise<any> {
    const userId = getUserId(req, res);
    if (!userId) return;

    const listingId = String(req.params.listingId ?? '');
    if (!UUID_RE.test(listingId)) {
      return res
        .status(404)
        .json({ success: false, error: '제품을 찾을 수 없습니다.', code: 'LISTING_NOT_FOUND' });
    }

    try {
      const resolution = await resolvePharmacyHubStoreOrganization(userId);
      if (resolution.status !== 'connected') return sendWriteBlocked(res, resolution);

      const listing = await resolveListingMaster(resolution.organizationId, listingId);
      if (!listing) {
        return res
          .status(404)
          .json({ success: false, error: '제품을 매장에서 찾을 수 없습니다.', code: 'LISTING_NOT_FOUND' });
      }
      if (!listing.masterId) {
        return res.status(400).json({
          success: false,
          error: '기준 상품 정보가 없어 상품 QR 을 발급할 수 없습니다.',
          code: 'NO_MASTER',
        });
      }

      const qr = await new ProductLandingService(AppDataSource).getLandingQr(listing.masterId, 320);
      return res.json({
        success: true,
        data: { publicKey: qr.publicKey, url: qr.url, svg: qr.svg, created: qr.created },
      });
    } catch (error) {
      return fail(res, userId, 'issueProductQr', error, '상품 QR 을 발급하지 못했습니다.', 'PRODUCT_QR_FAILED');
    }
  }
}
