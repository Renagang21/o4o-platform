/**
 * Neture 약국 결제 — PG 독립 · 테스트 결제 (DESIGN §8-3)
 *
 * 실제 PG 는 미선정이다(D1). 이 서비스는 결제 묶음(paymentGroupId) ↔ 주문 ↔ 결제 기록(o4o_payments) 대응과
 * 금액 · 소유자 · 수취 주체 검증, 멱등, 공급자 전달 1회를 구현하고, 승인 단계만 모드로 나눈다.
 *   test : PG 를 호출하지 않고 승인한다. payment · 주문 · 공급자 주문에 testPayment=true 를 남긴다(실결제 아님).
 *   live : PG 미선정 — 503 PAYMENT_PROVIDER_NOT_SELECTED. 키 부재를 성공으로 처리하지 않는다.
 *   미설정 : production 은 결제 불가(503 PAYMENT_NOT_CONFIGURED), 그 밖은 test.
 * 결제 완료 ≠ 공급자 지급. 자동 정산 · 지급 없음.
 */
import type { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import {
  NETURE_PHARMACY_PAYMENT_SOURCE,
  NETURE_PHARMACY_SERVICE_KEY,
  NeturePharmacyError,
  rowsOf,
} from '../constants.js';

export type PaymentMode = 'test' | 'live' | 'disabled';

export function resolvePaymentMode(env: Record<string, string | undefined> = process.env): PaymentMode {
  const raw = (env.NETURE_PHARMACY_PAYMENT_MODE ?? '').trim().toLowerCase();
  if (raw === 'test' || raw === 'live') return raw;
  return env.NODE_ENV === 'production' ? 'disabled' : 'test';
}

function assertPayable(mode: PaymentMode): void {
  if (mode === 'disabled') {
    throw new NeturePharmacyError(503, 'PAYMENT_NOT_CONFIGURED', '결제 방식이 설정되지 않았습니다.');
  }
  if (mode === 'live') {
    throw new NeturePharmacyError(503, 'PAYMENT_PROVIDER_NOT_SELECTED', '실제 결제(PG) 연결이 아직 준비되지 않았습니다.');
  }
}

export interface Bridger {
  bridgeCheckoutOrderToNetureFulfillment(params: { checkoutOrderId: string }): Promise<{ bridged: boolean; netureOrderId?: string; skippedReason?: string }>;
}

interface GroupOrder {
  id: string;
  buyer_id: string;
  status: string;
  payment_status: string;
  total_amount: string;
  receiver_key: string | null;
}

/** 주문 id 집합 비교용 결정적 정렬(코드 포인트 순). */
const byId = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

const PAYABLE_STATUSES = ['created', 'pending_payment'];
const PAYABLE_PAYMENT_STATUSES = ['pending', 'failed'];

export class PharmacyPaymentService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly bridger: Bridger,
    private readonly modeResolver: () => PaymentMode = () => resolvePaymentMode(),
  ) {}

  mode(): PaymentMode {
    return this.modeResolver();
  }

  private async lockGroup(m: { query: DataSource['query'] }, paymentGroupId: string) {
    await m.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [`neture-pharmacy-payment:${paymentGroupId}`]);
  }

  private async groupOrders(m: { query: DataSource['query'] }, buyerId: string, paymentGroupId: string): Promise<GroupOrder[]> {
    const orders: GroupOrder[] = await m.query(
      `SELECT id::text AS id, "buyerId"::text AS buyer_id, status::text AS status,
              "paymentStatus"::text AS payment_status, "totalAmount" AS total_amount,
              metadata->>'receiverKey' AS receiver_key
         FROM checkout_orders
        WHERE metadata->>'paymentGroupId' = $1 AND metadata->>'serviceKey' = $2
        ORDER BY id
        FOR UPDATE`,
      [paymentGroupId, NETURE_PHARMACY_SERVICE_KEY],
    );
    // 다른 구매자의 결제 묶음은 존재를 드러내지 않는다.
    if (orders.length === 0 || orders.some((o) => o.buyer_id !== buyerId)) {
      throw new NeturePharmacyError(404, 'PAYMENT_GROUP_NOT_FOUND', '결제할 주문을 찾을 수 없습니다.');
    }
    return orders;
  }

  /** 결제 대상 = 아직 결제되지 않은 결제 가능 주문. 금액은 서버 주문 합계. */
  private payable(orders: GroupOrder[]) {
    if (orders.some((o) => o.payment_status === 'paid' || o.status === 'paid')) {
      throw new NeturePharmacyError(409, 'ALREADY_PAID', '이미 결제된 주문입니다.');
    }
    const targets = orders.filter((o) => PAYABLE_STATUSES.includes(o.status) && PAYABLE_PAYMENT_STATUSES.includes(o.payment_status));
    if (targets.length === 0) throw new NeturePharmacyError(409, 'NOTHING_TO_PAY', '결제할 주문이 없습니다.');
    const receivers = new Set(targets.map((o) => o.receiver_key ?? ''));
    if (receivers.size !== 1) {
      // 수취 주체가 다른 주문을 한 결제로 묶지 않는다(D1).
      throw new NeturePharmacyError(409, 'RECEIVER_MISMATCH', '수취 주체가 다른 주문이 섞여 있습니다.');
    }
    const amount = targets.reduce((s, o) => s + Math.round(Number(o.total_amount)), 0);
    return { targets, amount, receiverKey: [...receivers][0] };
  }

  async prepare(buyerId: string, paymentGroupId: string) {
    const mode = this.mode();
    assertPayable(mode);
    return this.dataSource.transaction(async (m) => {
      await this.lockGroup(m, paymentGroupId);
      const { targets, amount, receiverKey } = this.payable(await this.groupOrders(m, buyerId, paymentGroupId));
      const orderIds = targets.map((o) => o.id).sort(byId);

      // 같은 묶음 · 같은 주문 · 같은 금액의 준비된 결제가 있으면 재사용(중복 준비 방지). 다르면 닫고 새로 만든다.
      const open = await m.query(
        `SELECT id::text AS id, amount, metadata FROM o4o_payments
          WHERE "orderId" = $1 AND "sourceService" = $2 AND status = 'CREATED' FOR UPDATE`,
        [paymentGroupId, NETURE_PHARMACY_PAYMENT_SOURCE],
      );
      for (const p of open) {
        const sameOrders = JSON.stringify([...(p.metadata?.checkoutOrderIds ?? [])].sort(byId)) === JSON.stringify(orderIds);
        if (sameOrders && Math.round(Number(p.amount)) === amount && p.metadata?.mode === mode) {
          return { paymentId: p.id, paymentGroupId, pgOrderId: paymentGroupId, amount, mode, orderIds, reused: true };
        }
        await m.query(
          `UPDATE o4o_payments SET status = 'CANCELLED', "cancelledAt" = NOW(), "updatedAt" = NOW() WHERE id = $1`,
          [p.id],
        );
      }

      const [row] = await m.query(
        `INSERT INTO o4o_payments (status, amount, currency, "transactionId", "orderId", "sourceService", metadata)
         VALUES ('CREATED', $1, 'KRW', $2, $3, $4, $5::jsonb)
         RETURNING id::text AS id`,
        [
          amount, `npc_${randomUUID()}`, paymentGroupId, NETURE_PHARMACY_PAYMENT_SOURCE,
          JSON.stringify({ buyerId, checkoutOrderIds: orderIds, receiverKey, mode, testPayment: mode === 'test' }),
        ],
      );
      return { paymentId: row.id, paymentGroupId, pgOrderId: paymentGroupId, amount, mode, orderIds, reused: false };
    });
  }

  async confirm(buyerId: string, input: { paymentId?: string; paymentGroupId?: string }) {
    const { paymentId, paymentGroupId } = input;
    if (!paymentId || !paymentGroupId) {
      throw new NeturePharmacyError(400, 'INVALID_REQUEST', 'paymentId · paymentGroupId 가 필요합니다.');
    }
    const mode = this.mode();

    const result = await this.dataSource.transaction(async (m) => {
      await this.lockGroup(m, paymentGroupId);
      const [payment] = await m.query(
        `SELECT id::text AS id, status, amount, "orderId" AS order_id, "sourceService" AS source, metadata
           FROM o4o_payments WHERE id = $1::uuid FOR UPDATE`,
        [paymentId],
      );
      // 결제 기록 ↔ 결제 묶음 ↔ 구매자 대응. 다른 묶음의 결제로 이 묶음을 완료할 수 없다.
      if (
        !payment ||
        payment.source !== NETURE_PHARMACY_PAYMENT_SOURCE ||
        payment.order_id !== paymentGroupId ||
        payment.metadata?.buyerId !== buyerId
      ) {
        throw new NeturePharmacyError(404, 'PAYMENT_NOT_FOUND', '결제 정보를 찾을 수 없습니다.');
      }
      const orderIds: string[] = [...(payment.metadata?.checkoutOrderIds ?? [])].sort(byId);
      if (payment.status === 'PAID') {
        return { alreadyPaid: true, orderIds, testPayment: payment.metadata?.testPayment === true };
      }
      if (payment.status !== 'CREATED') {
        throw new NeturePharmacyError(409, 'INVALID_PAYMENT_STATE', '다시 결제를 준비해 주세요.');
      }
      assertPayable(mode);
      if (payment.metadata?.mode !== mode) {
        throw new NeturePharmacyError(409, 'PAYMENT_MODE_CHANGED', '다시 결제를 준비해 주세요.');
      }

      const { targets, amount } = this.payable(await this.groupOrders(m, buyerId, paymentGroupId));
      const currentIds = targets.map((o) => o.id).sort(byId);
      // 금액 · 대상 주문이 준비 시점과 같아야 한다(그 사이 취소 · 변경되면 다시 준비).
      if (Math.round(Number(payment.amount)) !== amount || JSON.stringify(currentIds) !== JSON.stringify(orderIds)) {
        throw new NeturePharmacyError(409, 'AMOUNT_MISMATCH', '주문 금액이 결제 준비 시점과 다릅니다. 다시 결제를 준비해 주세요.');
      }

      // test 모드 승인 — PG 호출 없음.
      await m.query(
        `UPDATE o4o_payments
            SET status = 'PAID', "paidAt" = NOW(), "paidAmount" = amount, "paymentMethod" = 'TEST', "updatedAt" = NOW()
          WHERE id = $1`,
        [paymentId],
      );
      const paid = rowsOf(await m.query(
        `UPDATE checkout_orders
            SET status = 'paid', "paymentStatus" = 'paid', "paidAt" = NOW(), "paymentMethod" = 'TEST',
                metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('paymentId', $2::text, 'testPayment', true),
                "updatedAt" = NOW()
          WHERE id = ANY($1::uuid[]) AND status IN ('created','pending_payment') AND "paymentStatus" IN ('pending','failed')
        RETURNING id::text AS id`,
        [orderIds, paymentId],
      ));
      if (paid.length !== orderIds.length) {
        throw new NeturePharmacyError(409, 'ORDER_STATE_CHANGED', '주문 상태가 바뀌었습니다. 다시 결제를 준비해 주세요.');
      }
      return { alreadyPaid: false, orderIds, testPayment: true };
    });

    // 공급자 전달 — bridge 는 주문별 멱등(advisory lock). 재확인 요청은 누락된 전달만 다시 시도한다.
    const deliveries = [];
    for (const orderId of result.orderIds) {
      const r = await this.bridger.bridgeCheckoutOrderToNetureFulfillment({ checkoutOrderId: orderId });
      deliveries.push({ orderId, netureOrderId: r.netureOrderId ?? null, delivered: r.bridged || r.skippedReason === 'ALREADY_BRIDGED', skippedReason: r.skippedReason ?? null });
    }
    return {
      paymentId,
      paymentGroupId,
      status: 'PAID' as const,
      alreadyPaid: result.alreadyPaid,
      testPayment: result.testPayment,
      deliveries,
    };
  }
}
