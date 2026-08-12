/**
 * Store External Sales Controller — 외부 판매 채널 연동 · 판매 조건 입력
 * WO-O4O-KPA-NAVER-ONLINE-SALES-CONNECTION-AND-PILOT-CLOSEOUT-V1 §4
 *
 * `온라인 판매 > 판매 설정` 화면의 백엔드. 신규 메뉴·신규 도메인을 만들지 않는다.
 *
 * 이 API 가 다루는 것은 **연동 상태와 판매 조건**뿐이다. 상품 자체는 O4O 원장에 있고
 * 여기서 복제하지 않는다 (external_channel_product_links 는 상태 원장이다).
 *
 * 의약품 차단은 `assertExternalSalesEligible` 한 지점에서만 판정한다.
 * 이 컨트롤러는 자체 규칙을 만들지 않는다 — 서비스별 분기가 생기는 순간 우회 표면이 된다.
 *
 * Endpoints (mount: /store-hub/external-sales)
 *   GET    /channels                       — 채널별 연동 요약
 *   GET    /:channelCode/candidates        — 연동 가능한 매장 진열 상품 (의약품 제외)
 *   GET    /:channelCode/links             — 연동 목록
 *   POST   /:channelCode/links             — 연동 생성 (판매 조건 입력 시작)
 *   PUT    /:channelCode/links/:linkId     — 판매 조건 저장 + 결손 실측
 *   DELETE /:channelCode/links/:linkId     — 연동 해제
 */

import { Router, Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { createRequireStoreOwner, type StoreOwnerServiceKey } from '../../../utils/store-owner.utils.js';
import {
  assertExternalSalesEligibleById,
  ExternalSalesErrorCode,
} from '../../../modules/external-sales/guards/external-sales-eligibility.guard.js';
import {
  collectMissingRequired,
  collectMissingChannelInput,
  type NaverChannelInput,
  type O4OProductSource,
} from '../../../modules/external-sales/channels/naver/naver-product.mapper.js';
import type { ExternalChannelCode } from '../../../modules/external-sales/entities/external-channel-product-link.entity.js';

type AuthMiddleware = import('express').RequestHandler;

/** DB CHECK 제약과 1:1 유지 */
const SUPPORTED_CHANNELS: ExternalChannelCode[] = ['NAVER', 'COUPANG'];

/** 현재 실제 연동 구현이 있는 채널. 쿠팡은 스키마만 준비돼 있고 adapter 가 없다. */
const IMPLEMENTED_CHANNELS: ExternalChannelCode[] = ['NAVER'];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fail(res: Response, status: number, code: string, message: string): void {
  res.status(status).json({ success: false, error: message, code });
}

/** channel_input(jsonb) → 매퍼 입력. 누락 키는 null 로 정규화한다. */
function toNaverChannelInput(raw: Record<string, any> | null): NaverChannelInput {
  const v = raw ?? {};
  const num = (x: unknown): number | null =>
    x === null || x === undefined || x === '' ? null : Number(x);
  const str = (x: unknown): string | null =>
    typeof x === 'string' && x.trim() ? x.trim() : null;

  return {
    leafCategoryId: str(v.leafCategoryId),
    stockQuantity: num(v.stockQuantity),
    deliveryFeeType: str(v.deliveryFeeType),
    baseDeliveryFee: num(v.baseDeliveryFee),
    returnDeliveryFee: num(v.returnDeliveryFee),
    exchangeDeliveryFee: num(v.exchangeDeliveryFee),
    releaseAddressId: num(v.releaseAddressId),
    refundAddressId: num(v.refundAddressId),
    afterServiceTelephoneNumber: str(v.afterServiceTelephoneNumber),
    afterServiceGuideContent: str(v.afterServiceGuideContent),
    productInfoProvidedNotice:
      v.productInfoProvidedNotice && typeof v.productInfoProvidedNotice === 'object'
        ? v.productInfoProvidedNotice
        : null,
  };
}

export function createStoreExternalSalesController(
  dataSource: DataSource,
  requireAuth: AuthMiddleware,
  serviceKey?: StoreOwnerServiceKey,
): Router {
  const router = Router();
  const requireStoreOwner = createRequireStoreOwner(dataSource, serviceKey);

  /** 경로 채널코드 검증 — 응답을 이미 보냈으면 null 반환 */
  function validateChannel(raw: string, res: Response): ExternalChannelCode | null {
    const code = (raw ?? '').toUpperCase() as ExternalChannelCode;
    if (!SUPPORTED_CHANNELS.includes(code)) {
      fail(res, 400, 'CHANNEL_NOT_SUPPORTED', `지원하지 않는 판매 채널입니다: ${raw}`);
      return null;
    }
    return code;
  }

  /**
   * 상품 1건의 O4O 원장 값을 모은다 (복제 아님 — 요청 시점 조회).
   * SPD 는 STORE canonical 만 본다.
   */
  async function loadProductSource(masterId: string, organizationId: string): Promise<O4OProductSource | null> {
    const rows = await dataSource.query(
      `SELECT pm.id, pm.name, pm.regulatory_type, pm.brand_name, pm.manufacturer_name,
              pm.origin_country, pm.specification,
              opl.price AS listing_price
         FROM product_masters pm
         LEFT JOIN organization_product_listings opl
                ON opl.master_id = pm.id AND opl.organization_id = $2
        WHERE pm.id = $1
        LIMIT 1`,
      [masterId, organizationId],
    );
    if (!rows || rows.length === 0) return null;
    const r = rows[0];

    const images = await dataSource.query(
      `SELECT image_url, is_primary
         FROM product_images
        WHERE master_id = $1 AND deleted_at IS NULL
        ORDER BY is_primary DESC, sort_order ASC`,
      [masterId],
    );
    const rep = (images || []).find((i: any) => i.is_primary) ?? (images || [])[0] ?? null;

    // language='ko' 고정 — 네이버는 국내 마켓이다. 이 필터가 없으면 같은 master 의
    // en/zh/ja canonical 이 섞여 나온다 (실측: STORE canonical 이 4개 언어로 존재).
    const spd = await dataSource.query(
      `SELECT content
         FROM shared_product_descriptions
        WHERE master_id = $1
          AND description_type = 'STORE'
          AND status = 'canonical'
          AND language = 'ko'
          AND deleted_at IS NULL
        ORDER BY updated_at DESC
        LIMIT 1`,
      [masterId],
    );

    return {
      masterId: r.id,
      name: r.name,
      regulatoryType: r.regulatory_type,
      brandName: r.brand_name,
      manufacturerName: r.manufacturer_name,
      originCountry: r.origin_country,
      specification: r.specification,
      salePrice: r.listing_price != null ? Number(r.listing_price) : null,
      representativeImageUrl: rep?.image_url ?? null,
      optionalImageUrls: (images || [])
        .filter((i: any) => i !== rep)
        .map((i: any) => i.image_url),
      detailContentHtml: spd?.[0]?.content ?? null,
    };
  }

  // ─── GET /channels — 채널별 연동 요약 ──────────────────────────────────
  router.get('/channels', requireAuth, requireStoreOwner, async (req: Request, res: Response) => {
    try {
      const organizationId = req.organizationId!;
      const rows = await dataSource.query(
        `SELECT channel_code,
                count(*)::int AS total,
                count(*) FILTER (WHERE sync_status = 'LINKED')::int AS linked,
                count(*) FILTER (WHERE sync_status = 'FAILED')::int AS failed,
                max(last_synced_at) AS last_synced_at
           FROM external_channel_product_links
          WHERE organization_id = $1
          GROUP BY channel_code`,
        [organizationId],
      );
      const byCode = new Map(rows.map((r: any) => [r.channel_code, r]));

      res.json({
        success: true,
        data: SUPPORTED_CHANNELS.map((code) => {
          const r: any = byCode.get(code);
          return {
            channelCode: code,
            implemented: IMPLEMENTED_CHANNELS.includes(code),
            // 자격정보가 없으면 실제 전송이 불가능하다 — 화면이 이 상태를 그대로 보여준다.
            credentialConfigured:
              code === 'NAVER'
                ? !!(process.env.NAVER_COMMERCE_CLIENT_ID && process.env.NAVER_COMMERCE_CLIENT_SECRET)
                : false,
            total: r?.total ?? 0,
            linked: r?.linked ?? 0,
            failed: r?.failed ?? 0,
            lastSyncedAt: r?.last_synced_at ?? null,
          };
        }),
      });
    } catch {
      fail(res, 500, 'EXTERNAL_SALES_CHANNELS_FAILED', '판매 채널 정보를 불러오지 못했습니다.');
    }
  });

  // ─── GET /:channelCode/candidates — 연동 가능한 진열 상품 ──────────────
  router.get('/:channelCode/candidates', requireAuth, requireStoreOwner, async (req: Request, res: Response) => {
    const channelCode = validateChannel(req.params.channelCode, res);
    if (!channelCode) return;
    try {
      const organizationId = req.organizationId!;
      // 의약품은 SQL 단계에서 제외한다. 가드와 같은 축(regulatory_type)이며,
      // 최종 판정은 링크 생성 시 가드가 다시 수행한다 (목록 필터는 편의, 가드가 계약).
      const rows = await dataSource.query(
        `SELECT opl.id AS listing_id, opl.price, pm.id AS master_id, pm.name, pm.regulatory_type
           FROM organization_product_listings opl
           JOIN product_masters pm ON pm.id = opl.master_id
          WHERE opl.organization_id = $1
            AND opl.is_active = true
            AND pm.status = 'ACTIVE'
            AND upper(btrim(coalesce(pm.regulatory_type, ''))) NOT IN ('DRUG', '의약품')
            AND btrim(coalesce(pm.regulatory_type, '')) <> ''
            AND NOT EXISTS (
              SELECT 1 FROM external_channel_product_links l
               WHERE l.organization_id = opl.organization_id
                 AND l.master_id = opl.master_id
                 AND l.channel_code = $2
            )
          ORDER BY pm.name
          LIMIT 200`,
        [organizationId, channelCode],
      );
      res.json({
        success: true,
        data: rows.map((r: any) => ({
          masterId: r.master_id,
          listingId: r.listing_id,
          name: r.name,
          price: r.price != null ? Number(r.price) : null,
        })),
      });
    } catch {
      fail(res, 500, 'EXTERNAL_SALES_CANDIDATES_FAILED', '연동 가능한 상품을 불러오지 못했습니다.');
    }
  });

  // ─── GET /:channelCode/links — 연동 목록 ───────────────────────────────
  router.get('/:channelCode/links', requireAuth, requireStoreOwner, async (req: Request, res: Response) => {
    const channelCode = validateChannel(req.params.channelCode, res);
    if (!channelCode) return;
    try {
      const organizationId = req.organizationId!;
      const rows = await dataSource.query(
        `SELECT l.id, l.master_id, l.listing_id, l.channel_code, l.channel_input,
                l.sync_status, l.last_synced_at, l.last_error,
                l.external_origin_product_id, l.external_channel_product_id,
                pm.name AS product_name, opl.price
           FROM external_channel_product_links l
           JOIN product_masters pm ON pm.id = l.master_id
           LEFT JOIN organization_product_listings opl ON opl.id = l.listing_id
          WHERE l.organization_id = $1 AND l.channel_code = $2
          ORDER BY l.created_at DESC`,
        [organizationId, channelCode],
      );

      res.json({
        success: true,
        data: rows.map((r: any) => {
          const input = toNaverChannelInput(r.channel_input);
          // 목록에서는 상품 축(이미지·상세 HTML)을 조회하지 않는다 — 행마다 2쿼리가 더 붙는다.
          // 판매 조건 결손만 보여주고, 전체 실측은 저장(PUT) 응답에서 한다.
          const missing = collectMissingChannelInput(input);

          return {
            id: r.id,
            masterId: r.master_id,
            listingId: r.listing_id,
            productName: r.product_name,
            price: r.price != null ? Number(r.price) : null,
            channelCode: r.channel_code,
            channelInput: r.channel_input,
            syncStatus: r.sync_status,
            lastSyncedAt: r.last_synced_at,
            lastError: r.last_error,
            externalOriginProductId: r.external_origin_product_id,
            externalChannelProductId: r.external_channel_product_id,
            missingRequired: missing,
            readyToSend: missing.length === 0,
          };
        }),
      });
    } catch {
      fail(res, 500, 'EXTERNAL_SALES_LINKS_FAILED', '연동 목록을 불러오지 못했습니다.');
    }
  });

  // ─── POST /:channelCode/links — 연동 생성 ──────────────────────────────
  router.post('/:channelCode/links', requireAuth, requireStoreOwner, async (req: Request, res: Response) => {
    const channelCode = validateChannel(req.params.channelCode, res);
    if (!channelCode) return;
    try {
      const organizationId = req.organizationId!;
      const masterId = (req.body?.masterId ?? '').toString().trim();
      const listingId = (req.body?.listingId ?? '').toString().trim() || null;

      if (!UUID_RE.test(masterId)) {
        return fail(res, 400, 'INVALID_MASTER_ID', '상품 식별자가 올바르지 않습니다.');
      }
      if (listingId && !UUID_RE.test(listingId)) {
        return fail(res, 400, 'INVALID_LISTING_ID', '진열 식별자가 올바르지 않습니다.');
      }

      // ── 등록 시점 가드 (EXTERNAL_PRODUCT_REGISTER) ──
      const eligibility = await assertExternalSalesEligibleById(dataSource, masterId);
      if (!eligibility.allowed) {
        const status =
          eligibility.code === ExternalSalesErrorCode.EXTERNAL_SALES_DRUG_FORBIDDEN ? 403 : 400;
        return fail(res, status, eligibility.code!, eligibility.message!);
      }

      // 매장이 실제로 진열 중인 상품인지 서버에서 확인 (요청값 신뢰 금지)
      const owned = await dataSource.query(
        `SELECT 1 FROM organization_product_listings
          WHERE organization_id = $1 AND master_id = $2 LIMIT 1`,
        [organizationId, masterId],
      );
      if (!owned || owned.length === 0) {
        return fail(res, 404, 'PRODUCT_NOT_IN_STORE', '매장에 진열되지 않은 상품입니다.');
      }

      const inserted = await dataSource.query(
        `INSERT INTO external_channel_product_links
           (organization_id, master_id, listing_id, channel_code, sync_status)
         VALUES ($1, $2, $3, $4, 'NOT_LINKED')
         ON CONFLICT (organization_id, master_id, channel_code) DO NOTHING
         RETURNING id`,
        [organizationId, masterId, listingId, channelCode],
      );
      // UPDATE/INSERT ... RETURNING 은 드라이버에 따라 [rows, count] 로 오는 경우가 있다.
      const rows = Array.isArray(inserted?.[0]) ? inserted[0] : inserted;
      if (!rows || rows.length === 0) {
        return fail(res, 409, 'LINK_ALREADY_EXISTS', '이미 이 채널에 연동된 상품입니다.');
      }

      res.status(201).json({ success: true, data: { id: rows[0].id } });
    } catch {
      fail(res, 500, 'EXTERNAL_SALES_LINK_CREATE_FAILED', '연동 생성에 실패했습니다.');
    }
  });

  // ─── PUT /:channelCode/links/:linkId — 판매 조건 저장 ──────────────────
  router.put('/:channelCode/links/:linkId', requireAuth, requireStoreOwner, async (req: Request, res: Response) => {
    const channelCode = validateChannel(req.params.channelCode, res);
    if (!channelCode) return;
    try {
      const organizationId = req.organizationId!;
      const { linkId } = req.params;
      if (!UUID_RE.test(linkId)) {
        return fail(res, 400, 'INVALID_LINK_ID', '연동 식별자가 올바르지 않습니다.');
      }

      const existing = await dataSource.query(
        `SELECT master_id FROM external_channel_product_links
          WHERE id = $1 AND organization_id = $2 AND channel_code = $3 LIMIT 1`,
        [linkId, organizationId, channelCode],
      );
      if (!existing || existing.length === 0) {
        return fail(res, 404, 'LINK_NOT_FOUND', '연동 정보를 찾을 수 없습니다.');
      }

      // ── 동기화 시점 가드 (EXTERNAL_PRODUCT_SYNC) ──
      // 등록 후 상품 유형이 바뀌었을 수 있다. 저장 때마다 다시 판정한다.
      const eligibility = await assertExternalSalesEligibleById(dataSource, existing[0].master_id);
      if (!eligibility.allowed) {
        const status =
          eligibility.code === ExternalSalesErrorCode.EXTERNAL_SALES_DRUG_FORBIDDEN ? 403 : 400;
        return fail(res, status, eligibility.code!, eligibility.message!);
      }

      const input = toNaverChannelInput(req.body?.channelInput ?? req.body ?? null);

      await dataSource.query(
        `UPDATE external_channel_product_links
            SET channel_input = $1::jsonb, updated_at = now()
          WHERE id = $2 AND organization_id = $3`,
        [JSON.stringify(input), linkId, organizationId],
      );

      const source = await loadProductSource(existing[0].master_id, organizationId);
      const missing = source ? collectMissingRequired(source, input) : [];

      res.json({
        success: true,
        data: {
          id: linkId,
          channelInput: input,
          missingRequired: missing,
          readyToSend: missing.length === 0,
        },
      });
    } catch {
      fail(res, 500, 'EXTERNAL_SALES_INPUT_SAVE_FAILED', '판매 조건 저장에 실패했습니다.');
    }
  });

  // ─── DELETE /:channelCode/links/:linkId — 연동 해제 ────────────────────
  router.delete('/:channelCode/links/:linkId', requireAuth, requireStoreOwner, async (req: Request, res: Response) => {
    const channelCode = validateChannel(req.params.channelCode, res);
    if (!channelCode) return;
    try {
      const organizationId = req.organizationId!;
      const { linkId } = req.params;
      if (!UUID_RE.test(linkId)) {
        return fail(res, 400, 'INVALID_LINK_ID', '연동 식별자가 올바르지 않습니다.');
      }

      const rows = await dataSource.query(
        `SELECT sync_status FROM external_channel_product_links
          WHERE id = $1 AND organization_id = $2 AND channel_code = $3 LIMIT 1`,
        [linkId, organizationId, channelCode],
      );
      if (!rows || rows.length === 0) {
        return fail(res, 404, 'LINK_NOT_FOUND', '연동 정보를 찾을 수 없습니다.');
      }
      // 외부 채널에 살아 있는 등록을 DB 에서만 지우면 고아 상품이 남는다.
      if (rows[0].sync_status === 'LINKED') {
        return fail(
          res,
          409,
          'LINK_STILL_ACTIVE',
          '외부 채널에 등록된 상태입니다. 먼저 판매중지/등록 해제를 수행하세요.',
        );
      }

      await dataSource.query(
        `DELETE FROM external_channel_product_links WHERE id = $1 AND organization_id = $2`,
        [linkId, organizationId],
      );
      res.json({ success: true, data: { id: linkId } });
    } catch {
      fail(res, 500, 'EXTERNAL_SALES_LINK_DELETE_FAILED', '연동 해제에 실패했습니다.');
    }
  });

  return router;
}
