import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import type { DataSource } from 'typeorm';

/**
 * 매장의 상품 이미지 쓰기 경계 (2026-11-13 임시 보강).
 *
 * product_images 는 모든 매장 · 공급자가 함께 쓰는 공용 상품(master) 이미지다. 공급자 영역 기준 문서
 * (O4O-SUPPLIER-DOMAIN-BOUNDARY-V1)는 공급자 업로드 · 작성자 · 대표(canonical primary) 이미지 보호를 유지한다.
 * 그래서 매장 계정은
 *  - 자기 매장이 취급하는 상품에만 이미지를 더하고(출처 store_upload · 작성자 기록),
 *  - 자기가 올린 이미지만 정렬 · 삭제 · 대표 지정할 수 있으며,
 *  - 다른 출처의 이미지나 다른 출처의 대표 이미지는 바꾸지 못한다.
 * 매장별 이미지를 따로 둘지 같은 장기 방향은 별도 결정이다.
 */
export const STORE_IMAGE_SOURCE = 'store_upload';
type Query = Pick<DataSource, 'query'>;

export class StoreImageGuardError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string) {
    super(message);
  }
}
const deny = (status: number, code: string, message: string): never => {
  throw new StoreImageGuardError(status, code, message);
};
const UUID = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

/** 이 매장이 취급 등록한 상품(master)인지. */
export async function assertHandledMaster(db: Query, organizationId: string, masterId: string) {
  if (!UUID.test(masterId)) deny(400, 'INVALID_INPUT', 'Invalid product');
  const rows = await db.query(
    `SELECT 1 FROM organization_product_listings WHERE organization_id = $1 AND master_id = $2 LIMIT 1`,
    [organizationId, masterId],
  );
  if (!rows.length) deny(403, 'PRODUCT_NOT_HANDLED', '내 매장에서 취급하는 상품의 이미지만 관리할 수 있습니다.');
}

/** 이 계정이 매장에서 직접 올린 이미지(취급 상품 한정). 아니면 403 · 없으면 404. */
export async function ownStoreImage(db: Query, organizationId: string, userId: string, imageId: string) {
  if (!UUID.test(imageId)) deny(400, 'INVALID_INPUT', 'Invalid image');
  const [row] = await db.query(
    `SELECT i.id, i.master_id, i.gcs_path, i.is_primary, i.source, i.created_by
       FROM product_images i
      WHERE i.id = $1 AND i.deleted_at IS NULL
        AND EXISTS (SELECT 1 FROM organization_product_listings l WHERE l.organization_id = $2 AND l.master_id = i.master_id)`,
    [imageId, organizationId],
  );
  if (!row) deny(404, 'NOT_FOUND', 'Image not found');
  if (row.source !== STORE_IMAGE_SOURCE || row.created_by !== userId)
    deny(403, 'IMAGE_PROTECTED', '공급자 · 운영자가 등록한 이미지나 다른 계정이 올린 이미지는 바꿀 수 없습니다.');
  return row as { id: string; master_id: string; gcs_path: string | null; is_primary: boolean };
}

/** 대표 이미지를 바꿔도 되는지 — 지금 대표가 없거나, 지금 대표도 이 계정이 매장에서 올린 이미지일 때만. */
export async function assertPrimaryReplaceable(db: Query, userId: string, masterId: string) {
  const [current] = await db.query(
    `SELECT source, created_by FROM product_images WHERE master_id = $1 AND is_primary = true AND deleted_at IS NULL LIMIT 1`,
    [masterId],
  );
  if (current && (current.source !== STORE_IMAGE_SOURCE || current.created_by !== userId))
    deny(403, 'PRIMARY_PROTECTED', '공급자 · 운영자가 정한 대표 이미지는 매장에서 바꿀 수 없습니다.');
}

function privateAddress(address: string) {
  const v4 = address.startsWith('::ffff:') ? address.slice(7) : address;
  if (isIP(v4) === 4) {
    const [a, b] = v4.split('.').map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224;
  }
  const v6 = address.toLowerCase();
  return v6 === '::' || v6 === '::1' || v6.startsWith('fc') || v6.startsWith('fd') || v6.startsWith('fe80');
}

/** 외부 이미지 주소만 허용 — http(s) 이고, 이름이 가리키는 모든 주소가 공인 주소여야 한다. */
export async function assertPublicImageUrl(raw: string, resolve: typeof lookup = lookup) {
  let url: URL;
  try { url = new URL(raw); } catch { return deny(400, 'INVALID_URL', 'url is invalid'); }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') deny(400, 'INVALID_URL', 'Only http(s) image URLs are allowed');
  if (url.username || url.password) deny(400, 'INVALID_URL', 'Credentials in URL are not allowed');
  const host = url.hostname.replace(/^\[|\]$/g, '');
  let addresses: string[];
  try {
    addresses = isIP(host) ? [host] : (await resolve(host, { all: true })).map(entry => entry.address);
  } catch {
    return deny(400, 'FETCH_FAILED', 'Could not resolve the image host');
  }
  if (!addresses.length || addresses.some(privateAddress)) deny(400, 'INVALID_URL', 'Image URL must point to a public host');
  return url.toString();
}
