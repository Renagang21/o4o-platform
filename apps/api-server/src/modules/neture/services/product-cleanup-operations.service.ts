import type { DataSource } from 'typeorm';
import { OperationError, operationReason, recordOperation } from '../../../services/operations/operation-audit.js';

/** Final state/link checks and the durable audit use the mutation's transaction. */
export class ProductCleanupOperationsService {
  constructor(private readonly db: DataSource) {}

  async merge(sourceId: string, targetId: string, actorId: string, inputReason: unknown) {
    const reason = operationReason(inputReason);
    if (!sourceId || !targetId || sourceId === targetId) throw new OperationError(400, 'INVALID_MASTER_IDS', '서로 다른 원본·대상 상품을 선택해 주세요.');
    return this.db.transaction(async manager => {
      // Stable lock order also covers simultaneous reversed merge requests.
      const masters = await manager.query('SELECT id FROM product_masters WHERE id=ANY($1::uuid[]) ORDER BY id FOR UPDATE', [[sourceId, targetId]]);
      if (masters.length !== 2) throw new OperationError(409, 'MASTER_CHANGED', '병합 대상이 변경됐습니다. 다시 조회해 주세요.');
      const offers = await manager.query('UPDATE supplier_product_offers SET master_id=$1 WHERE master_id=$2 RETURNING id', [targetId, sourceId]);
      const images = await manager.query('UPDATE product_images SET master_id=$1 WHERE master_id=$2 RETURNING id', [targetId, sourceId]);
      await manager.query('DELETE FROM product_masters WHERE id=$1', [sourceId]);
      const data = { offersMigrated: offers[0]?.length ?? 0, imagesMigrated: images[0]?.length ?? 0 };
      // TypeORM PostgreSQL UPDATE raw results are [rows, affectedCount].
      await recordOperation(manager, 'neture', actorId, 'product.admin.merge', { sourceId, targetId, reason, ...data });
      return data;
    });
  }

  async remove(offerId: string, mode: 'pending' | 'trash', actorId: string, inputReason?: unknown) {
    // Trash deletion is explicitly confirmed; manual free text is optional for existing clients.
    const reason = mode === 'trash' && (inputReason == null || inputReason === '')
      ? '관리자 휴지통 완전 삭제' : operationReason(inputReason);
    return this.db.transaction(async manager => {
      const [offer] = await manager.query('SELECT id,approval_status,deleted_at FROM supplier_product_offers WHERE id=$1 FOR UPDATE', [offerId]);
      if (!offer) throw new OperationError(404, 'OFFER_NOT_FOUND', '상품을 찾을 수 없습니다.');
      if (mode === 'pending' && offer.approval_status !== 'PENDING') throw new OperationError(409, 'NOT_PENDING', '승인 신청 상태가 변경됐습니다.');
      if (mode === 'trash' && !offer.deleted_at) throw new OperationError(409, 'NOT_SOFT_DELETED', '휴지통으로 옮긴 상품만 완전 삭제할 수 있습니다.');
      const [links] = await manager.query(`SELECT
        (SELECT COUNT(*)::int FROM organization_product_listings WHERE offer_id=$1 AND is_active=true) AS listings,
        (SELECT COUNT(*)::int FROM service_products WHERE offer_id=$1) AS products,
        (SELECT COUNT(*)::int FROM offer_service_approvals WHERE offer_id=$1 AND approval_status='approved') AS approvals,
        (SELECT COUNT(*)::int FROM neture.neture_order_items WHERE product_id=$1) AS order_items,
        (SELECT COUNT(*)::int FROM checkout_orders WHERE items @> jsonb_build_array(jsonb_build_object('productId', $1::text))) AS checkout_orders,
        (SELECT COUNT(*)::int FROM store_cart_items WHERE supplier_product_offer_id=$1) AS carts`, [offerId]);
      if (links.order_items || links.checkout_orders || links.carts) throw new OperationError(409, 'HAS_COMMERCE_REFERENCES', '주문 또는 장바구니 연결이 있어 완전 삭제할 수 없습니다.');
      if (links.listings || links.products || (mode === 'pending' && links.approvals)) throw new OperationError(409, 'HARD_DELETE_BLOCKED', '활성 매장 연결·서비스 상품 또는 승인 이력을 먼저 확인해 주세요.');
      await manager.query('DELETE FROM spot_price_policies WHERE offer_id=$1', [offerId]);
      await manager.query('DELETE FROM supplier_product_offers WHERE id=$1', [offerId]);
      await recordOperation(manager, 'neture', actorId, 'product.admin.hard_delete', { offerId, mode, reason });
      return mode === 'pending' ? { deleted: true } : { hardDeleted: true };
    });
  }

  async changeTrash(offerId: string, actorId: string, restore: boolean, inputReason?: unknown) {
    // Soft deletion has existing clients without a reason; preserve that daily contract.
    const reason = inputReason == null || inputReason === '' ? null : operationReason(inputReason);
    return this.db.transaction(async manager => {
      const [offer] = await manager.query('SELECT id,deleted_at FROM supplier_product_offers WHERE id=$1 FOR UPDATE', [offerId]);
      if (!offer) throw new OperationError(404, 'OFFER_NOT_FOUND', '상품을 찾을 수 없습니다.');
      if (!!offer.deleted_at !== restore) throw new OperationError(409, 'STATUS_CHANGED', '휴지통 상태가 변경됐습니다. 다시 조회해 주세요.');
      if (restore) {
        // Restoring the record never republishes it.
        await manager.query('UPDATE supplier_product_offers SET deleted_at=NULL,deleted_by=NULL,delete_reason=NULL,is_active=false WHERE id=$1', [offerId]);
      } else {
        await manager.query('UPDATE supplier_product_offers SET deleted_at=NOW(),deleted_by=$2,delete_reason=$3,is_active=false WHERE id=$1', [offerId, actorId, reason]);
      }
      await recordOperation(manager, 'neture', actorId, restore ? 'product.operator.restore' : 'product.operator.trash', { offerId, reason, isActive: false });
      return restore ? { restored: true } : { softDeleted: true };
    });
  }
}
