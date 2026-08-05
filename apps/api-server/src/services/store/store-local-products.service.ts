/**
 * Store Local Products Service — "매장 자체 상품" CRUD 공통 로직
 *
 * WO-PHARMACY-HUB-STORE-HANDLED-PRODUCTS-V1 (B안 — service 함수 추출)
 * 원본: routes/platform/store-local-product.routes.ts (WO-STORE-LOCAL-PRODUCT-DISPLAY-V1 외)
 *
 * StoreLocalProduct 는 Commerce Object 가 아니다 — Checkout/EcommerceOrder 와 분리된 Display Domain.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 왜 추출하는가 — store-handled-products.service.ts 의 헤더와 동일한 이유다.
 *   조직 결정만 서비스 경계별로 하고(공통 resolveStoreAccess 무변경), 검증·SQL 계약은 공유한다.
 *
 * 계약
 *   - 인증·조직 결정을 하지 않는다. organizationId 는 호출자가 해석해서 넘긴다.
 *   - 소유 경계는 organization_id 단일 축이다 (Boundary Policy §7 Store Ops).
 *   - 삭제는 **비활성화(soft delete)** 다. 물리 삭제 경로를 새로 만들지 않는다.
 *   - 검증 실패는 예외가 아니라 결과 객체로 돌려준다 (라우트가 상태코드를 그대로 매핑).
 */

import type { DataSource } from 'typeorm';
import { StoreLocalProduct } from '../../routes/platform/entities/store-local-product.entity.js';

export const VALID_BADGE_TYPES = ['none', 'new', 'recommend', 'event'] as const;

/** uuid 형식 가드 (uuid 컬럼 조회 시 캐스팅 오류로 인한 500 방지) */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 검증·부존재 실패. 라우트는 이 값을 상태코드로 그대로 매핑한다. */
export interface ServiceFailure {
  ok: false;
  status: number;
  error: string;
  code: string;
}

export type ServiceResult<T> = { ok: true; data: T } | ServiceFailure;

const NOT_FOUND: ServiceFailure = {
  ok: false,
  status: 404,
  error: 'Product not found',
  code: 'NOT_FOUND',
};

const PRICE_DISPLAY_ERROR: ServiceFailure = {
  ok: false,
  status: 400,
  error: '표시 가격은 숫자만 입력할 수 있습니다. (예: 10000)',
  code: 'VALIDATION_ERROR',
};

/** Strip <script> tags and inline event handlers from HTML */
function sanitizeHtml(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\bon\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
}

/**
 * WO-O4O-KPA-STORE-LOCAL-PRODUCT-PRICE-INPUT-HARDENING-V1
 * price_display 는 numeric(12,2) 컬럼 — "10,000원"·"₩10000" 같은 입력의 캐스팅 500 을 막는다.
 */
function normalizePriceDisplay(raw: unknown): { ok: true; value: number | null } | { ok: false } {
  if (raw == null || raw === '') return { ok: true, value: null };
  if (typeof raw === 'number') {
    return Number.isFinite(raw) && raw >= 0 ? { ok: true, value: raw } : { ok: false };
  }
  if (typeof raw === 'string') {
    const cleaned = raw.replace(/[,\s₩원]/g, '');
    if (cleaned === '') return { ok: false };
    if (!/^\d+(\.\d+)?$/.test(cleaned)) return { ok: false };
    const n = Number(cleaned);
    return Number.isFinite(n) ? { ok: true, value: n } : { ok: false };
  }
  return { ok: false };
}

/** 바코드는 선택 입력. 빈 문자열/공백은 null (숫자 캐스팅 없음 → 앞자리 0 보존). */
function normalizeBarcode(raw: unknown): string | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  return s === '' ? null : s;
}

const SELECT_COLUMNS = `id, name, description, summary, detail_html, images, thumbnail_url, gallery_images,
                  category, barcode, price_display, badge_type, highlight_flag,
                  is_active, sort_order, created_at, updated_at`;

export interface ListLocalProductsOptions {
  page?: unknown;
  limit?: unknown;
  category?: string;
  /** 기본 true (활성만). 'false' 전달 시 비활성 포함 — 기존 라우트 계약 그대로. */
  activeOnly?: boolean;
  highlightOnly?: boolean;
}

export interface LocalProductsPage {
  items: any[];
  total: number;
  page: number;
  limit: number;
}

export async function listLocalProducts(
  dataSource: DataSource,
  organizationId: string,
  options: ListLocalProductsOptions = {},
): Promise<LocalProductsPage> {
  const page = Math.max(1, parseInt(options.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(options.limit as string) || 20));
  const offset = (page - 1) * limit;
  const activeOnly = options.activeOnly !== false;

  let whereClause = `WHERE organization_id = $1`;
  const params: any[] = [organizationId];
  let paramIdx = 2;

  if (activeOnly) {
    whereClause += ` AND is_active = true`;
  }
  if (options.category) {
    whereClause += ` AND category = $${paramIdx}`;
    params.push(options.category);
    paramIdx++;
  }
  if (options.highlightOnly) {
    whereClause += ` AND highlight_flag = true`;
  }

  const [items, countResult] = await Promise.all([
    dataSource.query(
      `SELECT ${SELECT_COLUMNS}
           FROM store_local_products
           ${whereClause}
           ORDER BY sort_order ASC, created_at DESC
           LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, limit, offset],
    ),
    dataSource.query(`SELECT COUNT(*)::int as count FROM store_local_products ${whereClause}`, params),
  ]);

  return { items, total: countResult[0]?.count || 0, page, limit };
}

export async function getLocalProduct(
  dataSource: DataSource,
  organizationId: string,
  productId: string,
): Promise<ServiceResult<any>> {
  // uuid 컬럼에 비-uuid 를 넘기면 Postgres 캐스팅 오류(500) → 형식 검증 후 404.
  if (!UUID_RE.test(productId)) return NOT_FOUND;

  // 다른 조직 상품은 organization_id 조건으로 차단 → 404 (존재 여부 노출 금지).
  const rows = await dataSource.query(
    `SELECT ${SELECT_COLUMNS}
         FROM store_local_products
         WHERE id = $1 AND organization_id = $2
         LIMIT 1`,
    [productId, organizationId],
  );
  if (!rows[0]) return NOT_FOUND;
  return { ok: true, data: rows[0] };
}

export async function createLocalProduct(
  dataSource: DataSource,
  organizationId: string,
  body: any,
): Promise<ServiceResult<StoreLocalProduct>> {
  const {
    name, description, images, category, barcode, priceDisplay, sortOrder,
    summary, detailHtml, usageInfo, cautionInfo,
    thumbnailUrl, galleryImages, badgeType, highlightFlag,
  } = body ?? {};

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return { ok: false, status: 400, error: 'Product name is required', code: 'VALIDATION_ERROR' };
  }
  if (badgeType && !(VALID_BADGE_TYPES as readonly string[]).includes(badgeType)) {
    return {
      ok: false,
      status: 400,
      error: `Invalid badge_type: ${badgeType}. Must be one of: ${VALID_BADGE_TYPES.join(', ')}`,
      code: 'VALIDATION_ERROR',
    };
  }
  const priceResult = normalizePriceDisplay(priceDisplay);
  if (!priceResult.ok) return PRICE_DISPLAY_ERROR;

  const repo = dataSource.getRepository(StoreLocalProduct);
  const product = repo.create({
    organizationId,
    name: name.trim(),
    description: description || null,
    images: Array.isArray(images) ? images : [],
    category: category || null,
    barcode: normalizeBarcode(barcode),
    priceDisplay: priceResult.value != null ? String(priceResult.value) : null,
    sortOrder: typeof sortOrder === 'number' ? sortOrder : 0,
    isActive: true,
    summary: summary || null,
    detailHtml: detailHtml ? sanitizeHtml(String(detailHtml)) : null,
    usageInfo: usageInfo || null,
    cautionInfo: cautionInfo || null,
    thumbnailUrl: thumbnailUrl || null,
    galleryImages: Array.isArray(galleryImages) ? galleryImages : [],
    badgeType: badgeType || 'none',
    highlightFlag: Boolean(highlightFlag),
  });

  const saved = await repo.save(product);
  return { ok: true, data: saved };
}

export async function updateLocalProduct(
  dataSource: DataSource,
  organizationId: string,
  productId: string,
  body: any,
): Promise<ServiceResult<StoreLocalProduct>> {
  const repo = dataSource.getRepository(StoreLocalProduct);
  if (!UUID_RE.test(productId)) return NOT_FOUND;

  const existing = await repo.findOne({ where: { id: productId, organizationId } });
  if (!existing) return NOT_FOUND;

  const {
    name, description, images, category, barcode, priceDisplay, sortOrder, isActive,
    summary, detailHtml, usageInfo, cautionInfo,
    thumbnailUrl, galleryImages, badgeType, highlightFlag,
  } = body ?? {};

  if (badgeType !== undefined && !(VALID_BADGE_TYPES as readonly string[]).includes(badgeType)) {
    return {
      ok: false,
      status: 400,
      error: `Invalid badge_type: ${badgeType}. Must be one of: ${VALID_BADGE_TYPES.join(', ')}`,
      code: 'VALIDATION_ERROR',
    };
  }
  if (priceDisplay !== undefined) {
    const priceResult = normalizePriceDisplay(priceDisplay);
    if (!priceResult.ok) return PRICE_DISPLAY_ERROR;
    existing.priceDisplay = priceResult.value != null ? String(priceResult.value) : null;
  }

  if (name !== undefined) existing.name = String(name).trim();
  if (description !== undefined) existing.description = description;
  if (images !== undefined) existing.images = Array.isArray(images) ? images : existing.images;
  if (category !== undefined) existing.category = category;
  if (barcode !== undefined) existing.barcode = normalizeBarcode(barcode);
  if (sortOrder !== undefined) existing.sortOrder = Number(sortOrder);
  if (isActive !== undefined) existing.isActive = Boolean(isActive);
  if (summary !== undefined) existing.summary = summary || null;
  if (detailHtml !== undefined) existing.detailHtml = detailHtml ? sanitizeHtml(String(detailHtml)) : null;
  if (usageInfo !== undefined) existing.usageInfo = usageInfo || null;
  if (cautionInfo !== undefined) existing.cautionInfo = cautionInfo || null;
  if (thumbnailUrl !== undefined) existing.thumbnailUrl = thumbnailUrl || null;
  if (galleryImages !== undefined) {
    existing.galleryImages = Array.isArray(galleryImages) ? galleryImages : existing.galleryImages;
  }
  if (badgeType !== undefined) existing.badgeType = badgeType;
  if (highlightFlag !== undefined) existing.highlightFlag = Boolean(highlightFlag);

  const saved = await repo.save(existing);
  return { ok: true, data: saved };
}

/** 비활성화(soft delete). 물리 삭제 경로는 만들지 않는다. */
export async function deactivateLocalProduct(
  dataSource: DataSource,
  organizationId: string,
  productId: string,
): Promise<ServiceResult<{ id: string; isActive: false }>> {
  if (!UUID_RE.test(productId)) return NOT_FOUND;

  // TypeORM(postgres) 는 UPDATE 결과를 [rows, rowCount] 로 돌려준다 — 원본 라우트와 동일한 판정.
  const raw: any = await dataSource.query(
    `UPDATE store_local_products SET is_active = false, updated_at = now()
       WHERE id = $1 AND organization_id = $2`,
    [productId, organizationId],
  );
  if (raw?.[1] === 0) return NOT_FOUND;
  return { ok: true, data: { id: productId, isActive: false } };
}
