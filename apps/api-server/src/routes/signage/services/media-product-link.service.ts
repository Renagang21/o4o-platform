/**
 * 사이니지 영상 ↔ 제품 연결 — 「이 영상의 제품」(WO-O4O-STORE-QR-TABLET-CHANNEL-SEPARATION-V1 D6 · T4).
 *
 * signage_media."productMasterId" 한 칸만 쓴다. 설명서 본문은 건드리지 않는다.
 * 누가 무엇을 연결하는가(쓰는 쪽이 범위를 확인한다 — 외래 키 없음):
 *   - 매장: 자기 매장 영상(source='store')만. 제품은 **자기 매장이 취급하는 제품**(organization_product_listings)으로만 고른다.
 *   - 운영자(HQ): 서비스 공용 영상(source='hq')만. 표준 제품 마스터 아무거나.
 *   - 공급자: 자기 영상만. 제품은 **자기가 공급하는 제품**(supplier_product_offers)만 — 공급자 컨트롤러가 이 파일의 검사를 쓴다.
 * Boundary(O4O-BOUNDARY-POLICY-V1): 매장 = organizationId, 공용 = serviceKey. UUID 단독 조회 없음 · parameter binding.
 */
import type { DataSource } from 'typeorm';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class MediaProductLinkError extends Error {
  constructor(public readonly code: string, public readonly statusCode: number, message: string) { super(message); }
}
const fail = (code: string, statusCode: number, message: string): never => { throw new MediaProductLinkError(code, statusCode, message); };

export interface MediaProductLink { mediaId: string; productMasterId: string | null; productName: string | null }

function nullableUuid(value: unknown, field: string): string | null {
  if (value === null) return null;
  if (typeof value !== 'string' || !UUID.test(value)) fail('VALIDATION_ERROR', 400, `${field} 는 UUID 또는 null 이어야 합니다.`);
  return value as string;
}

async function productName(db: Pick<DataSource, 'query'>, masterId: string | null): Promise<string | null> {
  if (!masterId) return null;
  const [row] = await db.query('SELECT name FROM product_masters WHERE id = $1', [masterId]);
  return row?.name ?? null;
}

async function apply(db: Pick<DataSource, 'query'>, where: string, params: unknown[], mediaId: string, masterId: string | null): Promise<MediaProductLink> {
  const rows = await db.query(
    `UPDATE signage_media SET "productMasterId" = $1, "updatedAt" = NOW(), version = version + 1
     WHERE id = $2 AND "deletedAt" IS NULL AND ${where} RETURNING id`,
    [masterId, mediaId, ...params],
  );
  if (!rows.length) fail('MEDIA_NOT_FOUND', 404, '이 영상을 찾을 수 없거나 연결할 수 없는 영상입니다.');
  return { mediaId, productMasterId: masterId, productName: await productName(db, masterId) };
}

/** 매장: listingId(매장 취급 제품) → 제품 마스터. null 이면 연결 해제. */
export async function linkStoreMediaProduct(
  db: Pick<DataSource, 'query'>,
  scope: { serviceKey: string; organizationId?: string | null },
  mediaId: string,
  listingIdInput: unknown,
): Promise<MediaProductLink> {
  if (!scope.organizationId) fail('ORGANIZATION_REQUIRED', 403, '매장을 확인할 수 없습니다.');
  if (!UUID.test(mediaId)) fail('VALIDATION_ERROR', 400, '영상 ID 가 올바르지 않습니다.');
  const listingId = nullableUuid(listingIdInput, 'listingId');
  let masterId: string | null = null;
  if (listingId) {
    const [listing] = await db.query(
      'SELECT master_id FROM organization_product_listings WHERE id = $1 AND organization_id = $2 LIMIT 1',
      [listingId, scope.organizationId],
    );
    if (!listing) fail('PRODUCT_NOT_HANDLED', 404, '이 매장에서 취급하는 제품이 아닙니다.');
    if (!listing.master_id) fail('PRODUCT_HAS_NO_MASTER', 409, '표준 제품 정보가 없는 제품이라 연결할 수 없습니다.');
    masterId = listing.master_id;
  }
  return apply(db, `"serviceKey" = $3 AND "organizationId" = $4 AND source = 'store'`, [scope.serviceKey, scope.organizationId], mediaId, masterId);
}

/** 운영자: 서비스 공용(HQ) 영상에 표준 제품 마스터를 직접 지정. null 이면 해제. */
export async function linkHqMediaProduct(
  db: Pick<DataSource, 'query'>,
  serviceKey: string,
  mediaId: string,
  productMasterIdInput: unknown,
): Promise<MediaProductLink> {
  if (!UUID.test(mediaId)) fail('VALIDATION_ERROR', 400, '영상 ID 가 올바르지 않습니다.');
  const masterId = nullableUuid(productMasterIdInput, 'productMasterId');
  if (masterId && !(await productName(db, masterId))) fail('PRODUCT_NOT_FOUND', 404, '표준 제품을 찾을 수 없습니다.');
  return apply(db, `"serviceKey" = $3 AND source = 'hq'`, [serviceKey], mediaId, masterId);
}

/** 공급자: 자기가 공급하는 제품인지 확인한다. 공급자 PATCH 가 쓴다. */
export async function assertSupplierProduct(db: Pick<DataSource, 'query'>, supplierId: string, productMasterIdInput: unknown): Promise<string | null> {
  const masterId = nullableUuid(productMasterIdInput, 'productMasterId');
  if (!masterId) return null;
  const [offer] = await db.query('SELECT 1 FROM supplier_product_offers WHERE master_id = $1 AND supplier_id = $2 LIMIT 1', [masterId, supplierId]);
  if (!offer) fail('PRODUCT_NOT_SUPPLIED', 404, '내가 공급하는 제품만 연결할 수 있습니다.');
  return masterId;
}

/**
 * 매장 영상 목록 옆에 보일 「연결 제품」. 공용 영상을 가져온 사본(parentMediaId)은 원본의 연결을 따른다(inherited).
 * listingId 는 이 매장의 취급 제품 중 그 마스터의 것(다시 고를 때 선택 표시용) — 없으면 null.
 */
export async function listStoreMediaProducts(db: Pick<DataSource, 'query'>, scope: { serviceKey: string; organizationId?: string | null }) {
  if (!scope.organizationId) fail('ORGANIZATION_REQUIRED', 403, '매장을 확인할 수 없습니다.');
  return db.query(
    `SELECT sm.id AS "mediaId", eff.master_id AS "productMasterId", pm.name AS "productName",
       (sm."productMasterId" IS NULL) AS inherited,
       (SELECT opl.id FROM organization_product_listings opl WHERE opl.master_id = eff.master_id AND opl.organization_id = $2
         ORDER BY opl.created_at DESC LIMIT 1) AS "listingId"
     FROM signage_media sm
     LEFT JOIN signage_media parent ON parent.id = sm."parentMediaId" AND parent."serviceKey" = sm."serviceKey" AND parent."deletedAt" IS NULL
     CROSS JOIN LATERAL (SELECT COALESCE(sm."productMasterId", parent."productMasterId") AS master_id) eff
     JOIN product_masters pm ON pm.id = eff.master_id
     WHERE sm."serviceKey" = $1 AND sm."organizationId" = $2 AND sm."deletedAt" IS NULL`,
    [scope.serviceKey, scope.organizationId],
  );
}
