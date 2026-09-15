/**
 * Screen Set 운영 조작 (DB DI · 관리 라우터와 현장 runtime 라우터가 공유)
 *
 * WO-O4O-STORE-TABLET-LOCATION-CONTENT-RUNTIME-MANAGEMENT-V1
 *   - applyScreenSetProductList: 빠른 상품 수정(추가/제거/순서). product_list block 의 canonical config
 *     (`{ source: 'selected_products', products: [{ productType, productId, qrCodeId }] }`) 만 갱신한다.
 *     새 상품 저장 형식을 만들지 않는다 — 공개 resolver(parseSelectedProducts)와 같은 계약.
 *   - duplicateScreenSetRows: 이름/설명/blocks 복제 → 새 ID. 현재 적용·위치 연결·runtime 상태·QR 은 복사하지 않는다.
 */
import type { DataSource, EntityManager } from 'typeorm';

export type ProductListItem = { productType: 'supplier' | 'local'; productId: string; qrCodeId: string | null };

export class ScreenSetOpsError extends Error {
  constructor(public status: number, public code: string, message: string, public data?: Record<string, unknown>) {
    super(message);
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_PRODUCTS = 200;

/** 요청 본문의 products 배열을 canonical 형태로 정규화(중복 제거·순서 보존). */
export function normalizeProductListInput(raw: unknown): ProductListItem[] {
  if (!Array.isArray(raw)) throw new ScreenSetOpsError(400, 'VALIDATION_ERROR', 'products must be an array');
  if (raw.length > MAX_PRODUCTS) throw new ScreenSetOpsError(400, 'VALIDATION_ERROR', `too many products (max ${MAX_PRODUCTS})`);
  const seen = new Set<string>();
  const out: ProductListItem[] = [];
  for (const it of raw) {
    if (!it || typeof it !== 'object') throw new ScreenSetOpsError(400, 'VALIDATION_ERROR', 'invalid product item');
    const pt = (it as any).productType;
    const pid = (it as any).productId;
    const qid = (it as any).qrCodeId;
    if (pt !== 'supplier' && pt !== 'local') throw new ScreenSetOpsError(400, 'VALIDATION_ERROR', 'productType must be supplier|local');
    if (typeof pid !== 'string' || !UUID_RE.test(pid)) throw new ScreenSetOpsError(400, 'VALIDATION_ERROR', 'productId must be uuid');
    const key = `${pt}:${pid}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ productType: pt, productId: pid, qrCodeId: typeof qid === 'string' && UUID_RE.test(qid) ? qid : null });
  }
  return out;
}

/** product_list block config 에서 현재 선택 목록을 읽는다(legacy config → []). */
export function readProductListSelection(config: unknown): ProductListItem[] {
  if (!config || typeof config !== 'object' || Array.isArray(config)) return [];
  const cfg = config as Record<string, unknown>;
  if (cfg.source !== 'selected_products' || !Array.isArray(cfg.products)) return [];
  try { return normalizeProductListInput(cfg.products); } catch { return []; }
}

/**
 * 빠른 상품 수정: 매장 소유 set 의 product_list block 선택 목록을 통째로 교체한다.
 *  - 선택 상품은 이 매장의 것만 허용(supplier=organization_product_listings.id, local=store_local_products.id).
 *  - product_list block 이 없으면 마지막 순서로 새로 만든다(그 외 block 무변경).
 */
export async function applyScreenSetProductList(
  dataSource: DataSource,
  organizationId: string,
  screenSetId: string,
  products: ProductListItem[],
): Promise<{ screenSetId: string; blockId: string; products: ProductListItem[] }> {
  const owned = await dataSource.query(
    `SELECT id FROM store_tablet_screen_sets
      WHERE id = $1 AND organization_id = $2 AND origin = 'store' AND deleted_at IS NULL LIMIT 1`,
    [screenSetId, organizationId],
  );
  if (!owned?.[0]) throw new ScreenSetOpsError(404, 'SCREEN_SET_NOT_FOUND', 'Screen set not found');

  const supplierIds = products.filter((p) => p.productType === 'supplier').map((p) => p.productId);
  const localIds = products.filter((p) => p.productType === 'local').map((p) => p.productId);
  if (supplierIds.length > 0) {
    const rows = await dataSource.query(
      `SELECT id FROM organization_product_listings WHERE organization_id = $1 AND id = ANY($2::uuid[])`,
      [organizationId, supplierIds],
    );
    const found = new Set((rows ?? []).map((r: any) => String(r.id)));
    const missing = supplierIds.filter((id) => !found.has(id));
    if (missing.length > 0) throw new ScreenSetOpsError(400, 'PRODUCT_NOT_IN_STORE', 'supplier product not in this store', { missing });
  }
  if (localIds.length > 0) {
    const rows = await dataSource.query(
      `SELECT id FROM store_local_products WHERE organization_id = $1 AND id = ANY($2::uuid[])`,
      [organizationId, localIds],
    );
    const found = new Set((rows ?? []).map((r: any) => String(r.id)));
    const missing = localIds.filter((id) => !found.has(id));
    if (missing.length > 0) throw new ScreenSetOpsError(400, 'PRODUCT_NOT_IN_STORE', 'local product not in this store', { missing });
  }

  let blockId = '';
  await dataSource.transaction(async (m: EntityManager) => {
    const blocks = await m.query(
      `SELECT id, config FROM store_tablet_screen_blocks
        WHERE screen_set_id = $1 AND block_type = 'product_list' ORDER BY sort_order ASC, created_at ASC LIMIT 1`,
      [screenSetId],
    );
    if (blocks?.[0]) {
      blockId = String(blocks[0].id);
      const prev = (blocks[0].config && typeof blocks[0].config === 'object' && !Array.isArray(blocks[0].config)) ? blocks[0].config : {};
      const next = { ...prev, source: 'selected_products', products };
      await m.query(
        `UPDATE store_tablet_screen_blocks SET config = $1::jsonb, updated_at = NOW() WHERE id = $2 AND screen_set_id = $3`,
        [JSON.stringify(next), blockId, screenSetId],
      );
    } else {
      const ins = await m.query(
        `INSERT INTO store_tablet_screen_blocks (screen_set_id, block_type, sort_order, is_visible, config)
         VALUES ($1, 'product_list', COALESCE((SELECT MAX(sort_order) + 10 FROM store_tablet_screen_blocks WHERE screen_set_id = $1), 0), TRUE, $2::jsonb)
         RETURNING id`,
        [screenSetId, JSON.stringify({ source: 'selected_products', products })],
      );
      blockId = String(ins[0].id);
    }
    await m.query(`UPDATE store_tablet_screen_sets SET updated_at = NOW() WHERE id = $1 AND organization_id = $2`, [screenSetId, organizationId]);
  });
  return { screenSetId, blockId, products };
}

/**
 * Screen Set 복제. 같은 트랜잭션 안에서 set row + blocks 를 복사한다.
 *  - 복사: name(지정 없으면 "원본명 (복사)"), description, template_key, blocks(block_type/sort_order/is_visible/config).
 *  - 미복사: tablet_id(legacy 적용), current 적용, 위치 연결(corner_contents), public_qr_slug, runtime 상태.
 *  - status 는 draft 로 시작(원본이 active 여도). origin='store'·supplier_id=NULL.
 * QR 자동 확보는 호출부(withQrLink)가 같은 트랜잭션에서 이어서 수행한다.
 */
export async function duplicateScreenSetRows(
  m: EntityManager,
  organizationId: string,
  sourceId: string,
  opts: { name?: string | null; userId?: string | null; returningCols: string },
): Promise<Record<string, any> | null> {
  const src = await m.query(
    `SELECT id, name, description, template_key AS "templateKey" FROM store_tablet_screen_sets
      WHERE id = $1 AND organization_id = $2 AND origin = 'store' AND deleted_at IS NULL LIMIT 1`,
    [sourceId, organizationId],
  );
  if (!src?.[0]) return null;
  const baseName = String(src[0].name || '');
  const name = (opts.name && opts.name.trim()) ? opts.name.trim().slice(0, 120) : `${baseName} (복사)`.slice(0, 120);
  const ins = await m.query(
    `INSERT INTO store_tablet_screen_sets (organization_id, service_key, supplier_id, tablet_id, name, description, origin, status, template_key, created_by_user_id)
     VALUES ($1, NULL, NULL, NULL, $2, $3, 'store', 'draft', $4, $5)
     RETURNING ${opts.returningCols}`,
    [organizationId, name, src[0].description ?? null, src[0].templateKey ?? null, opts.userId ?? null],
  );
  const created = ins[0];
  await m.query(
    `INSERT INTO store_tablet_screen_blocks (screen_set_id, block_type, sort_order, is_visible, config)
     SELECT $1, block_type, sort_order, is_visible, config
       FROM store_tablet_screen_blocks WHERE screen_set_id = $2
      ORDER BY sort_order ASC, created_at ASC`,
    [created.id, sourceId],
  );
  return created;
}
