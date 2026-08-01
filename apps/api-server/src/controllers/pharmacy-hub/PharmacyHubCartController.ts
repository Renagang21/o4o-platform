/**
 * Pharmacy-Hub Store Owner Cart Controller
 *
 * WO-PHARMACY-HUB-B2B-CART-AND-BUYER-ORDER-V1 (Phase 1)
 *
 *   GET    /api/v1/pharmacy-hub/store-owner/cart              장바구니 목록(+공급자별 묶음)
 *   POST   /api/v1/pharmacy-hub/store-owner/cart/items        담기
 *   PATCH  /api/v1/pharmacy-hub/store-owner/cart/items/:id    수량 변경
 *   DELETE /api/v1/pharmacy-hub/store-owner/cart/items/:id    삭제
 *
 * 저장 계층은 canonical `StoreCartService`(`store_cart_items`)를 그대로 재사용한다 —
 * 신규 장바구니 테이블 없음. 경계는 `buyerId(=인증 사용자) + serviceKey='pharmacy-hub'`.
 *
 * 공용 `/api/v1/store/cart/:serviceKey/*` 대신 별도 엔드포인트를 두는 이유:
 *   공용 라우트는 인증만 요구하고 **Pharmacy-Hub 역할·membership 을 확인하지 않는다.**
 *   여기서는 `requirePharmacyHubScope('pharmacy-hub:store_owner')` 를 걸어 서비스 경계를 맞추고,
 *   담는 시점에 **제공 여부(service_keys)까지 서버에서 검증**한다.
 */
import type { Request, Response } from 'express';
import { AppDataSource } from '../../database/connection.js';
import { StoreCartService, CartError } from '../../services/cart/store-cart.service.js';
import { SERVICE_KEYS } from '../../constants/service-keys.js';
import logger from '../../utils/logger.js';

const SERVICE_KEY = SERVICE_KEYS.PHARMACY_HUB;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getBuyerId(req: Request): string | null {
  const id = (req as any).user?.id;
  return typeof id === 'string' && id.length > 0 ? id : null;
}

/**
 * 담기 대상 offer 검증 — 약국 상품 조회와 **같은 노출 게이트**를 쓴다.
 * 조회에 보이는 상품만 담을 수 있고, 서버가 상품명·단가를 되돌려준다
 * (프론트가 보낸 이름/단가를 신뢰하지 않는다).
 */
interface ResolvedOffer {
  ok: boolean;
  /** ok=false 일 때만 채워진다 */
  code?: string;
  message?: string;
  /** ok=true 일 때만 채워진다 */
  supplierId?: string;
  masterId?: string;
  productName?: string;
  unitPrice?: number;
}

async function resolveDeliverableOffer(offerId: string): Promise<ResolvedOffer> {
  const [row] = await AppDataSource.query(
    `SELECT spo.id::text          AS id,
            spo.supplier_id::text AS supplier_id,
            spo.master_id::text   AS master_id,
            spo.price_general,
            pm.name               AS product_name,
            (SELECT osp.unit_price FROM offer_service_prices osp
              WHERE osp.offer_id = spo.id AND osp.service_key = $2) AS service_unit_price
       FROM supplier_product_offers spo
       JOIN neture_suppliers ns ON ns.id = spo.supplier_id
       JOIN product_masters pm  ON pm.id = spo.master_id
      WHERE spo.id = $1::uuid
        AND spo.deleted_at IS NULL
        AND spo.is_active = true
        AND spo.distribution_type <> 'PRIVATE'
        AND $2 = ANY(spo.service_keys)
        AND ns.status = 'ACTIVE'
        AND COALESCE(pm.status, 'ACTIVE') = 'ACTIVE'`,
    [offerId, SERVICE_KEY],
  );

  if (!row) {
    return { ok: false, code: 'NOT_DELIVERABLE', message: '현재 파머시 허브에서 주문할 수 없는 상품입니다.' };
  }
  const unitPrice = row.service_unit_price != null ? Number(row.service_unit_price) : Number(row.price_general);
  if (!(unitPrice > 0)) {
    return { ok: false, code: 'INVALID_PRICE', message: '상품 가격이 올바르지 않습니다.' };
  }
  return {
    ok: true,
    supplierId: row.supplier_id,
    masterId: row.master_id,
    productName: row.product_name,
    unitPrice,
  };
}

export class PharmacyHubCartController {
  private static service(): StoreCartService {
    return new StoreCartService(AppDataSource);
  }

  /** GET /cart — 목록 + 공급자별 묶음 */
  static async list(req: Request, res: Response): Promise<any> {
    const buyerId = getBuyerId(req);
    if (!buyerId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    try {
      const svc = PharmacyHubCartController.service();
      const scope = { buyerId, serviceKey: SERVICE_KEY };
      const [items, groups] = await Promise.all([svc.list(scope), svc.groupBySupplier(scope)]);
      return res.json({
        success: true,
        data: {
          items,
          groups,
          totalItems: items.length,
          totalQuantity: items.reduce((sum, it) => sum + it.quantity, 0),
        },
      });
    } catch (error) {
      return PharmacyHubCartController.fail(res, error, 'list');
    }
  }

  /** POST /cart/items — 담기 (offerId + quantity 만 받는다) */
  static async add(req: Request, res: Response): Promise<any> {
    const buyerId = getBuyerId(req);
    if (!buyerId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const body = (req.body ?? {}) as Record<string, unknown>;
    const offerId = String(body.offerId ?? '');
    if (!UUID_RE.test(offerId)) {
      return res.status(400).json({ success: false, error: '상품 식별자가 올바르지 않습니다.', code: 'INVALID_OFFER_ID' });
    }
    const quantity = body.quantity === undefined ? 1 : Number(body.quantity);
    if (!Number.isInteger(quantity) || quantity <= 0 || quantity > 1000) {
      return res.status(400).json({ success: false, error: '수량이 올바르지 않습니다.', code: 'INVALID_QUANTITY' });
    }

    try {
      const resolved = await resolveDeliverableOffer(offerId);
      if (!resolved.ok) {
        return res.status(400).json({ success: false, error: resolved.message ?? '주문할 수 없는 상품입니다.', code: resolved.code ?? 'NOT_DELIVERABLE' });
      }

      const item = await PharmacyHubCartController.service().add(
        { buyerId, serviceKey: SERVICE_KEY },
        {
          sourceType: 'b2b',
          supplierId: resolved.supplierId ?? null,
          supplierProductOfferId: offerId,
          productMasterId: resolved.masterId ?? null,
          productName: resolved.productName ?? '',   // 서버 값 사용
          quantity,
          priceSnapshot: resolved.unitPrice ?? 0,    // 표시용 — 주문 시 서버에서 재검증된다
        },
      );
      return res.status(201).json({ success: true, data: item });
    } catch (error) {
      return PharmacyHubCartController.fail(res, error, 'add');
    }
  }

  /** PATCH /cart/items/:itemId — 수량 변경 */
  static async update(req: Request, res: Response): Promise<any> {
    const buyerId = getBuyerId(req);
    if (!buyerId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const quantity = Number((req.body ?? {}).quantity);
    if (!Number.isInteger(quantity) || quantity <= 0 || quantity > 1000) {
      return res.status(400).json({ success: false, error: '수량이 올바르지 않습니다.', code: 'INVALID_QUANTITY' });
    }

    try {
      const item = await PharmacyHubCartController.service().update(
        { buyerId, serviceKey: SERVICE_KEY },
        String(req.params.itemId ?? ''),
        { quantity },
      );
      return res.json({ success: true, data: item });
    } catch (error) {
      return PharmacyHubCartController.fail(res, error, 'update');
    }
  }

  /** DELETE /cart/items/:itemId — 삭제 */
  static async remove(req: Request, res: Response): Promise<any> {
    const buyerId = getBuyerId(req);
    if (!buyerId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    try {
      await PharmacyHubCartController.service().remove(
        { buyerId, serviceKey: SERVICE_KEY },
        String(req.params.itemId ?? ''),
      );
      return res.json({ success: true, data: { removed: true } });
    } catch (error) {
      return PharmacyHubCartController.fail(res, error, 'remove');
    }
  }

  private static fail(res: Response, error: unknown, op: string) {
    if (error instanceof CartError) {
      return res.status((error as any).status ?? 400).json({
        success: false,
        error: error.message,
        code: (error as any).code,
      });
    }
    logger.error(`[PharmacyHubCart] ${op} error`, {
      error: error instanceof Error ? error.message : String(error),
    });
    return res.status(500).json({ success: false, error: '장바구니 처리에 실패했습니다.' });
  }
}
