import { createHash } from 'node:crypto';
import type { DataSource, EntityManager } from 'typeorm';
import { OperationError, recordOperation } from '../../../services/operations/operation-audit.js';

const MAX = 10000;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function changed(): never { throw new OperationError(409, 'TRASH_CHANGED', '휴지통 대상이 변경됐습니다. 다시 미리보기해 주세요.'); }
type SnapshotRow = { id: string; version: string };
function fingerprint(rows: SnapshotRow[], actor: string, cutoff: string, reason: string) {
  return createHash('sha256').update(JSON.stringify([actor, cutoff, reason, rows.map(r => [r.id, r.version])])).digest('hex');
}

/** One server request for all selected offers or the confirmed trash snapshot. Never deletes Masters. */
export class ProductTrashBatchService {
  constructor(private readonly db: DataSource) {}

  async move(ids: unknown, actor: string) {
    if (!Array.isArray(ids) || !ids.length || ids.length > MAX || ids.some(id => typeof id !== 'string' || !uuid.test(id)) || new Set(ids).size !== ids.length)
      throw new OperationError(400, 'INVALID_IDS', `상품을 1~${MAX}개 선택해 주세요.`);
    return this.db.transaction(async manager => {
      await this.limits(manager);
      const rows = await manager.query('SELECT id,deleted_at FROM supplier_product_offers WHERE id=ANY($1::uuid[]) ORDER BY id FOR UPDATE', [ids]);
      if (rows.length !== ids.length || rows.some((row: any) => row.deleted_at)) changed();
      await manager.query('UPDATE supplier_product_offers SET deleted_at=NOW(),deleted_by=$2,is_active=false,delete_reason=$3 WHERE id=ANY($1::uuid[])', [ids, actor, '운영자 선택 삭제']);
      await recordOperation(manager, 'neture', actor, 'product.operator.batch_trash', { offerIds: ids, count: ids.length, isActive: false });
      return { moved: ids.length };
    });
  }

  private async limits(manager: EntityManager) {
    await manager.query("SET LOCAL lock_timeout='3s'");
    await manager.query("SET LOCAL statement_timeout='30s'");
  }
  private async rows(manager: EntityManager, cutoff: string, lock: boolean): Promise<SnapshotRow[]> {
    const rows = await manager.query(`SELECT id,xmin::text AS version FROM supplier_product_offers
      WHERE deleted_at IS NOT NULL AND deleted_at<=$1::timestamptz ORDER BY id LIMIT ${MAX + 1}${lock ? ' FOR UPDATE' : ''}`, [cutoff]);
    if (rows.length > MAX) throw new OperationError(400, 'TOO_MANY', `휴지통 비우기는 한 번에 ${MAX}개까지 처리합니다.`);
    return rows;
  }
  async preview(actor: string) {
    const reason = '관리자 휴지통 비우기';
    return this.db.transaction(async manager => {
      const [{ cutoff }] = await manager.query('SELECT clock_timestamp()::text AS cutoff');
      const rows = await this.rows(manager, cutoff, false);
      return { count: rows.length, cutoff, fingerprint: fingerprint(rows, actor, cutoff, reason) };
    });
  }
  async empty(actor: string, body: any) {
    const reason = '관리자 휴지통 비우기';
    if (typeof body?.cutoff !== 'string' || !Number.isFinite(Date.parse(body.cutoff)) || typeof body?.fingerprint !== 'string' || !/^[a-f0-9]{64}$/.test(body.fingerprint) || !Number.isInteger(body?.count) || body.count < 1 || body.count > MAX)
      throw new OperationError(400, 'PREVIEW_REQUIRED', '휴지통 미리보기를 먼저 확인해 주세요.');
    return this.db.transaction(async manager => {
      await this.limits(manager);
      const [{ age }] = await manager.query('SELECT EXTRACT(EPOCH FROM (clock_timestamp()-$1::timestamptz)) AS age', [body.cutoff]);
      if (Number(age) < 0 || Number(age) > 600) changed();
      const rows = await this.rows(manager, body.cutoff, true);
      if (rows.length !== body.count || fingerprint(rows, actor, body.cutoff, reason) !== body.fingerprint) changed();
      // Same protection predicates as the existing single hard-delete. Check again under offer locks.
      const links = await manager.query(`SELECT o.id,
        EXISTS(SELECT 1 FROM organization_product_listings WHERE offer_id=o.id AND is_active=true) AS listings,
        EXISTS(SELECT 1 FROM service_products WHERE offer_id=o.id) AS products,
        EXISTS(SELECT 1 FROM neture.neture_order_items WHERE product_id=o.id) AS orders,
        EXISTS(SELECT 1 FROM checkout_orders WHERE items @> jsonb_build_array(jsonb_build_object('productId', o.id::text))) AS checkouts,
        EXISTS(SELECT 1 FROM store_cart_items WHERE supplier_product_offer_id=o.id) AS carts
        FROM supplier_product_offers o WHERE o.id=ANY($1::uuid[])`, [rows.map(r => r.id)]);
      const blocked = links.filter((row: any) => row.listings || row.products || row.orders || row.checkouts || row.carts)
        .map((row: any) => ({ id: row.id, reason: row.orders || row.checkouts || row.carts ? '주문·장바구니 연결' : '활성 매장·서비스 상품 연결' }));
      const blockedIds = new Set(blocked.map((row: any) => row.id));
      const ids = rows.filter(row => !blockedIds.has(row.id)).map(row => row.id);
      if (ids.length) {
        await manager.query('DELETE FROM spot_price_policies WHERE offer_id=ANY($1::uuid[])', [ids]);
        await manager.query('DELETE FROM supplier_product_offers WHERE id=ANY($1::uuid[])', [ids]);
      }
      await recordOperation(manager, 'neture', actor, 'product.admin.empty_trash', { offerIds: ids, deleted: ids.length, blockedCount: blocked.length, reason });
      return { deleted: ids.length, blocked };
    });
  }
}
