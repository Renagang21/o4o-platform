/**
 * CheckoutFulfillmentBridgeService — paid checkout_order → neture_order fulfillment record (P2c)
 *
 * WO-O4O-CHECKOUT-ORDER-TO-NETURE-FULFILLMENT-BRIDGE-V1
 * 상위: CHECK-O4O-NETURE-B2B-PAYMENT-FIRST-CANONICAL-FLOW-CORRECTION-V1
 *
 * 결제 완료(paymentStatus='paid')된 Neture B2B checkout_order 만 공급자 fulfillment 흐름
 * (neture_orders + neture_order_items)으로 bridge 한다. 공급자 workspace 는 neture_orders 를
 * neture_order_items.product_id(=SPO id) → supplier_product_offers.supplier_id 로 스코프하므로,
 * bridge 된 주문이 기존 주문처럼 공급자 주문 리스트에 노출된다.
 *
 * 절대 기준 (payment-first):
 *   - paymentStatus='paid' & status='paid' & paidAt not null 인 주문만 bridge. pending bridge 금지.
 *   - collectionStatus 사용 안 함.
 *   - idempotent: metadata.checkoutOrderId 로 기존 bridge 확인 후 중복 생성 금지.
 *   - bridge 된 neture_order 는 status=PAID, paid_at, metadata.paymentReady=true →
 *     fulfillment guard / settlement readiness guard 가 paid 로 인식.
 */
import { DataSource } from 'typeorm';
import {
  NetureOrder,
  NetureOrderStatus,
  NetureOrderType,
} from '../../routes/neture/entities/neture-order.entity.js';
import { NetureOrderItem } from '../../routes/neture/entities/neture-order-item.entity.js';
import logger from '../../utils/logger.js';
// WO-O4O-SUPPLIER-FULFILLMENT-SERVICE-SCOPE-V1
import { NETURE_FULFILLMENT_SERVICE_KEY } from '../../modules/neture/constants/fulfillment-service-scope.js';

const NETURE_B2B_ORDER_SOURCE = 'neture_b2b_checkout';

/**
 * WO-PHARMACY-HUB-PAYMENT-AND-SUPPLIER-FULFILLMENT-V1:
 *   bridge 대상 checkout_order 의 `metadata.source` 별 기술자(registry).
 *
 * Neture 는 기존 값과 **완전히 동일**하다(무회귀 — 등록만 옮겼을 뿐 값·동작 불변).
 * Pharmacy-Hub 는 자기 항목을 추가해 같은 bridge 를 탄다. 공급자 workspace 는
 * `neture_orders.service_key` 로 스코프하므로 두 서비스 주문은 섞이지 않는다.
 */
interface BridgeSourceDescriptor {
  /** payment sourceService 라벨 (metadata.sourceService 로 기록) */
  sourceService: string;
}

const BRIDGE_SOURCES: Record<string, BridgeSourceDescriptor> = {
  [NETURE_B2B_ORDER_SOURCE]: { sourceService: 'neture-b2b' },
  pharmacy_hub_cart: { sourceService: 'pharmacy-hub' },
  // WO-O4O-CROSSSERVICE-B2B-CHECKOUT-CONFIRM-SERVICE-AGNOSTIC-ADOPTION-V1:
  //   승인축 서비스(glycopharm / kpa-society / k-cosmetics)의 공통 B2B confirm.
  //   등록하지 않으면 주문은 생성되고 결제까지 되지만 공급자에게 영원히 보이지 않는다
  //   (UNSUPPORTED_SOURCE 로 조용히 skip). 서비스 스코프는 metadata.serviceKey 가 담당한다.
  store_b2b_cart: { sourceService: 'store-b2b' },
};

export interface BridgeResult {
  bridged: boolean;
  netureOrderId?: string;
  skippedReason?: string;
}

function genNetureOrderNumber(): string {
  const d = new Date();
  const prefix = `NTR${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${random}`;
}

/** checkout_order.shippingAddress → neture shipping jsonb 매핑 */
function mapShipping(addr: any): Record<string, any> | null {
  if (!addr || typeof addr !== 'object') return null;
  return {
    recipient_name: addr.recipientName ?? null,
    phone: addr.phone ?? null,
    postal_code: addr.zipCode ?? null,
    address: addr.address1 ?? null,
    address_detail: addr.address2 ?? null,
    delivery_note: addr.memo ?? null,
  };
}

export class CheckoutFulfillmentBridgeService {
  constructor(private dataSource: DataSource) {}

  /**
   * paid checkout_order 를 neture_order fulfillment record 로 bridge.
   * 이미 bridge 되었으면 기존 netureOrderId 반환(idempotent).
   */
  async bridgeCheckoutOrderToNetureFulfillment(params: {
    checkoutOrderId: string;
  }): Promise<BridgeResult> {
    const { checkoutOrderId } = params;

    // 1. checkout_order 로드 (canonical 테이블 — raw query 로 의존 최소화)
    const rows = await this.dataSource.query(
      `SELECT id::text AS id, "orderNumber", "buyerId"::text AS buyer_id, "supplierId" AS supplier_id,
              subtotal, "shippingFee" AS shipping_fee, "totalAmount" AS total_amount,
              status::text AS status, "paymentStatus"::text AS payment_status,
              "paymentMethod" AS payment_method, "paidAt" AS paid_at,
              "shippingAddress" AS shipping_address, items, metadata
       FROM checkout_orders WHERE id = $1 LIMIT 1`,
      [checkoutOrderId],
    );
    const co = rows[0];
    if (!co) return { bridged: false, skippedReason: 'NOT_FOUND' };

    const md = co.metadata && typeof co.metadata === 'object' ? co.metadata : {};
    const descriptor =
      typeof md.source === 'string' ? BRIDGE_SOURCES[md.source as string] : undefined;
    if (!descriptor) {
      return { bridged: false, skippedReason: 'UNSUPPORTED_SOURCE' };
    }

    // 2. payment-first guard — paid 아니면 bridge 금지
    if (co.payment_status !== 'paid' || co.status !== 'paid' || !co.paid_at) {
      return { bridged: false, skippedReason: 'PAYMENT_NOT_READY' };
    }

    // 3. idempotency — 이미 bridge 된 주문이면 기존 반환
    const existing = await this.dataSource.query(
      `SELECT id::text AS id FROM neture_orders WHERE metadata->>'checkoutOrderId' = $1 LIMIT 1`,
      [checkoutOrderId],
    );
    if (existing[0]) {
      return { bridged: false, netureOrderId: existing[0].id, skippedReason: 'ALREADY_BRIDGED' };
    }

    const items: any[] = Array.isArray(co.items) ? co.items : [];
    if (items.length === 0) return { bridged: false, skippedReason: 'NO_ITEMS' };

    const totalAmount = Math.trunc(Number(co.subtotal) || 0);
    const shippingFee = Math.trunc(Number(co.shipping_fee) || 0);
    const finalAmount = Math.trunc(Number(co.total_amount) || totalAmount + shippingFee);
    const shipping = mapShipping(co.shipping_address);
    const orderNumber = genNetureOrderNumber();

    // 4. 트랜잭션: neture_order + items 생성 (status=PAID — 이미 결제 완료)
    try {
      const netureOrderId = await this.dataSource.transaction(async (manager) => {
        const orderRepo = manager.getRepository(NetureOrder);
        const itemRepo = manager.getRepository(NetureOrderItem);

        const order = orderRepo.create({
          orderNumber,
          userId: co.buyer_id,
          status: NetureOrderStatus.PAID,
          totalAmount,
          discountAmount: 0,
          shippingFee,
          finalAmount,
          paymentMethod: co.payment_method ?? null,
          paidAt: co.paid_at ? new Date(co.paid_at) : new Date(),
          shipping: shipping as any,
          ordererName: shipping?.recipient_name ?? null,
          ordererPhone: shipping?.phone ?? null,
          orderType: NetureOrderType.STORE_RESTOCK,
          // WO-O4O-SUPPLIER-FULFILLMENT-SERVICE-SCOPE-V1:
          //   bridge 된 주문에 **발생 서비스**를 기입한다. 공급자 조회·통계가 이 값으로 스코프한다.
          //   checkout_order 의 metadata.serviceKey 를 그대로 승계하고, 미표기면 'neture'(레거시 규칙).
          serviceKey: (md.serviceKey as string) || NETURE_FULFILLMENT_SERVICE_KEY,
          metadata: {
            // P2c bridge 계약 — fulfillment/settlement guard 가 paid 로 인식
            source: 'checkout_order',
            sourceOrderType: 'checkout_order',
            checkoutOrderId: co.id,
            checkoutOrderNumber: co.orderNumber,
            sourceService: descriptor.sourceService,
            originalSource: md.source as string,
            paymentStatus: 'paid',
            paymentReady: true,
            paidAt: co.paid_at ? new Date(co.paid_at).toISOString() : null,
            supplierId: co.supplier_id ?? null,
            // 취소·환불 추적축 — 그룹 결제는 PG 취소가 그룹 전체 단위로 일어난다.
            paymentGroupId: (md.paymentGroupId as string) ?? null,
          },
        });
        const savedOrder = await orderRepo.save(order);

        const orderItems = items.map((it) =>
          itemRepo.create({
            orderId: savedOrder.id,
            productId: it.productId,
            productName: it.productName ?? 'Neture 상품',
            quantity: Math.trunc(Number(it.quantity) || 1),
            unitPrice: Math.trunc(Number(it.unitPrice) || 0),
            totalPrice: Math.trunc(Number(it.subtotal) || 0),
            options: it.metadata ?? null,
          }),
        );
        await itemRepo.save(orderItems);

        return savedOrder.id;
      });

      logger.info('[CheckoutFulfillmentBridge] bridged paid checkout_order → neture_order', {
        checkoutOrderId: co.id,
        netureOrderId,
        orderNumber,
      });
      return { bridged: true, netureOrderId };
    } catch (error) {
      // paid 전이는 유지(공급자 미노출). bridge 재시도/수동 복구는 후속.
      logger.error('[CheckoutFulfillmentBridge] bridge failed (order remains paid, supplier hidden)', {
        checkoutOrderId: co.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return { bridged: false, skippedReason: 'BRIDGE_FAILED' };
    }
  }
}
