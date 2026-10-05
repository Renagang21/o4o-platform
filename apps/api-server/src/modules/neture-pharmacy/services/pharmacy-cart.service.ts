/**
 * 장바구니 · 주문 확정 — DESIGN §8-1 · §8-2
 *
 * - 장바구니에 선택한 공급 옵션(경로 + 제안 id)을 저장한다. 가격 스냅샷은 표시용 — 확정 시 서버가 다시 판정한다.
 * - 확정: 모든 행을 supply-access SSOT 로 재판정 → 기존 검사(수량 1..1000 · SPO 재고 · 의약품) →
 *   이벤트는 reserveEventOfferListing 원자 차감 → (수취 주체, 공급자) 그룹별 checkoutService.createOrder() 단일 지점.
 * - paymentGroupId 는 수취 주체(receiverKey)별 1개 — 수취 주체가 다른 주문을 한 결제로 묶지 않는다(D1).
 */
import type { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import {
  NETURE_PHARMACY_ORDER_SOURCE,
  NETURE_PHARMACY_SERVICE_KEY,
  NeturePharmacyError,
  SEMI_FRANCHISE_EVENT_SERVICE_KEY,
  SUPPLY_KINDS,
  isReceiverDetermined,
  isValidOrderQuantity,
  receiverKeyOf,
  type SupplyKind,
  rowsOf,
} from '../constants.js';
import { getSupplyOption, type SupplyOption } from './supply-access.js';
import { calculateSupplierShippingFee } from '../../../services/shipping/supplier-shipping.js';
import type { CreateOrderDto } from '../../../services/checkout.service.js';

export interface EventReserver {
  reserveEventOfferListing(
    qr: any,
    params: { listingId: string; serviceKey: string; userId: string; quantity: number },
  ): Promise<{ decrementedQty: number }>;
  incrementListingQuantity(listingId: string, qty: number): Promise<void>;
}

export type OrderCreator = (dto: CreateOrderDto) => Promise<{ id: string; orderNumber: string; totalAmount: number | string; subtotal: number | string; shippingFee: number | string }>;

const SOURCE_TYPE_BY_KIND: Record<SupplyKind, string> = {
  default: 'neture_default',
  proposal: 'neture_proposal',
  event: 'event_offer',
  recruitment: 'seller_recruitment',
};

interface CartRow {
  id: string;
  source_type: string;
  supplier_product_offer_id: string | null;
  supply_proposal_id: string | null;
  event_offer_id: string | null;
  seller_recruitment_id: string | null;
  product_name: string;
  quantity: number;
  price_snapshot: number;
}

function kindOf(row: CartRow): { kind: SupplyKind; optionId: string } | null {
  if (row.supply_proposal_id) return { kind: 'proposal', optionId: row.supply_proposal_id };
  if (row.event_offer_id) return { kind: 'event', optionId: row.event_offer_id };
  if (row.seller_recruitment_id) return { kind: 'recruitment', optionId: row.seller_recruitment_id };
  if (row.supplier_product_offer_id) return { kind: 'default', optionId: row.supplier_product_offer_id };
  return null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: unknown): v is string => typeof v === 'string' && UUID_RE.test(v);

export interface CheckoutLine {
  cartItemId: string;
  option: SupplyOption;
  quantity: number;
}

export interface CheckoutGroup {
  receiverKey: string;
  supplierId: string;
  lines: CheckoutLine[];
}

/** (수취 주체, 공급자) 그룹. 순수 함수 — 단위 테스트 대상. */
export function groupCheckoutLines(lines: CheckoutLine[]): CheckoutGroup[] {
  const groups = new Map<string, CheckoutGroup>();
  for (const line of lines) {
    const receiverKey = receiverKeyOf(line.option.semiFranchiseKey, line.option.paymentReceiverKey);
    const k = `${receiverKey}\u0000${line.option.supplierId}`;
    const g = groups.get(k) ?? { receiverKey, supplierId: line.option.supplierId, lines: [] };
    g.lines.push(line);
    groups.set(k, g);
  }
  return [...groups.values()];
}

export class PharmacyCartService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly eventReserver: EventReserver,
    private readonly createOrder: OrderCreator,
  ) {}

  private async cartRows(buyerId: string, itemIds?: string[]): Promise<CartRow[]> {
    return this.dataSource.query(
      `SELECT id, source_type, supplier_product_offer_id, supply_proposal_id, event_offer_id, seller_recruitment_id,
              product_name, quantity, price_snapshot
         FROM store_cart_items
        WHERE buyer_id = $1 AND service_key = $2 AND ($3::uuid[] IS NULL OR id = ANY($3::uuid[]))
        ORDER BY created_at, id`,
      [buyerId, NETURE_PHARMACY_SERVICE_KEY, itemIds && itemIds.length ? itemIds : null],
    );
  }

  /** 장바구니 — 각 행을 지금 다시 판정해 이용 가능 여부와 현재 단가를 함께 준다. */
  async list(buyerId: string, organizationId: string) {
    const rows = await this.cartRows(buyerId);
    const items = [];
    for (const row of rows) {
      const ref = kindOf(row);
      const option = ref ? await getSupplyOption(this.dataSource, organizationId, ref.kind, ref.optionId) : null;
      items.push({
        id: row.id,
        kind: ref?.kind ?? null,
        optionId: ref?.optionId ?? null,
        productName: option?.productName ?? row.product_name,
        quantity: row.quantity,
        available: !!option,
        unitPrice: option?.unitPrice ?? null,
        option,
      });
    }
    return items;
  }

  async add(buyerId: string, organizationId: string, input: { kind?: string; id?: string; quantity?: number }) {
    const kind = SUPPLY_KINDS.find((k) => k === input.kind);
    if (!kind || !isUuid(input.id)) throw new NeturePharmacyError(400, 'INVALID_SUPPLY_OPTION', '공급 옵션을 선택해 주세요.');
    const quantity = input.quantity === undefined ? 1 : Number(input.quantity);
    if (!isValidOrderQuantity(quantity)) throw new NeturePharmacyError(400, 'INVALID_QUANTITY', '수량이 올바르지 않습니다.');
    const option = await getSupplyOption(this.dataSource, organizationId, kind, input.id);
    if (!option) throw new NeturePharmacyError(404, 'SUPPLY_OPTION_NOT_AVAILABLE', '이용할 수 없는 공급 옵션입니다.');

    const refColumn = { default: 'supplier_product_offer_id', proposal: 'supply_proposal_id', event: 'event_offer_id', recruitment: 'seller_recruitment_id' }[kind];
    const [existing] = await this.dataSource.query(
      `SELECT id, quantity FROM store_cart_items
        WHERE buyer_id = $1 AND service_key = $2 AND source_type = $3 AND ${refColumn} = $4`,
      [buyerId, NETURE_PHARMACY_SERVICE_KEY, SOURCE_TYPE_BY_KIND[kind], input.id],
    );
    if (existing) {
      const merged = Number(existing.quantity) + quantity;
      if (!isValidOrderQuantity(merged)) throw new NeturePharmacyError(400, 'INVALID_QUANTITY', '수량이 올바르지 않습니다.');
      await this.dataSource.query(
        `UPDATE store_cart_items SET quantity = $2, price_snapshot = $3, updated_at = NOW() WHERE id = $1`,
        [existing.id, merged, option.unitPrice],
      );
      return { id: existing.id, quantity: merged };
    }
    const [row] = await this.dataSource.query(
      `INSERT INTO store_cart_items
         (buyer_id, organization_id, service_key, source_type, supplier_id, supplier_product_offer_id,
          supply_proposal_id, event_offer_id, organization_product_listing_id, seller_recruitment_id,
          product_master_id, product_name, quantity, pricing_source, price_snapshot)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8, $9, $10, $11, $12, $13, $14)
       RETURNING id, quantity`,
      [
        buyerId, organizationId, NETURE_PHARMACY_SERVICE_KEY, SOURCE_TYPE_BY_KIND[kind], option.supplierId,
        option.offerId,
        kind === 'proposal' ? option.optionId : null,
        kind === 'event' ? option.optionId : null,
        kind === 'recruitment' ? option.optionId : null,
        option.masterId, option.productName.slice(0, 300), quantity,
        kind === 'event' ? 'event_offer' : 'regular', option.unitPrice,
      ],
    );
    return row;
  }

  async updateQuantity(buyerId: string, itemId: string, quantity: unknown) {
    if (!isValidOrderQuantity(quantity)) throw new NeturePharmacyError(400, 'INVALID_QUANTITY', '수량이 올바르지 않습니다.');
    const rows = rowsOf(await this.dataSource.query(
      `UPDATE store_cart_items SET quantity = $3, updated_at = NOW()
        WHERE id = $1 AND buyer_id = $2 AND service_key = $4 RETURNING id, quantity`,
      [itemId, buyerId, quantity, NETURE_PHARMACY_SERVICE_KEY],
    ));
    if (!rows[0]) throw new NeturePharmacyError(404, 'CART_ITEM_NOT_FOUND', '장바구니 항목을 찾을 수 없습니다.');
    return rows[0];
  }

  async remove(buyerId: string, itemId: string) {
    await this.dataSource.query(
      `DELETE FROM store_cart_items WHERE id = $1 AND buyer_id = $2 AND service_key = $3`,
      [itemId, buyerId, NETURE_PHARMACY_SERVICE_KEY],
    );
    return { id: itemId, removed: true };
  }

  async checkout(buyerId: string, organizationId: string, input: { itemIds?: string[] } = {}) {
    const itemIds = Array.isArray(input.itemIds) ? input.itemIds.filter(isUuid) : undefined;
    const rows = await this.cartRows(buyerId, itemIds);
    if (rows.length === 0) throw new NeturePharmacyError(400, 'CART_EMPTY', '주문할 항목이 없습니다.');

    const failedItems: Array<{ itemId: string; productName: string; code: string; message: string }> = [];
    const fail = (row: CartRow, code: string, message: string) =>
      failedItems.push({ itemId: row.id, productName: row.product_name, code, message });

    // 1. 서버 재판정 · 단가 확정 · 기존 검사
    const lines: CheckoutLine[] = [];
    for (const row of rows) {
      const ref = kindOf(row);
      const option = ref ? await getSupplyOption(this.dataSource, organizationId, ref.kind, ref.optionId) : null;
      if (!option) {
        fail(row, 'SUPPLY_OPTION_NOT_AVAILABLE', '이용할 수 없는 공급 옵션입니다.');
        continue;
      }
      if (!isValidOrderQuantity(row.quantity)) {
        fail(row, 'INVALID_QUANTITY', '수량이 올바르지 않습니다.');
        continue;
      }
      if (option.trackInventory && option.availableStock !== null && option.availableStock < row.quantity) {
        fail(row, 'INSUFFICIENT_STOCK', `재고가 부족합니다 (가용 ${option.availableStock}).`);
        continue;
      }
      lines.push({ cartItemId: row.id, option, quantity: row.quantity });
    }

    const [org] = await this.dataSource.query(
      `SELECT name, phone, address, address_detail FROM organizations WHERE id = $1`,
      [organizationId],
    );
    const ad = (org?.address_detail ?? {}) as { zipCode?: string; baseAddress?: string; detailAddress?: string };
    const shippingAddress = {
      recipientName: org?.name ?? '',
      phone: org?.phone ?? '',
      zipCode: ad.zipCode ?? '',
      address1: ad.baseAddress ?? org?.address ?? '',
      address2: ad.detailAddress ?? '',
    };

    // 2. 그룹 · 수취 주체별 paymentGroupId
    const paymentGroupIds = new Map<string, string>();
    const createdOrders: Array<{ orderId: string; orderNumber: string; supplierId: string; receiverKey: string; paymentGroupId: string; totalAmount: number }> = [];

    for (const group of groupCheckoutLines(lines)) {
      // 2a. 이벤트 수량 원자 차감 (기존 함수 그대로)
      const eventLines = group.lines.filter((l) => l.option.kind === 'event');
      const reservations: Array<{ listingId: string; qty: number }> = [];
      if (eventLines.length > 0) {
        const qr = this.dataSource.createQueryRunner();
        await qr.connect();
        await qr.startTransaction();
        try {
          for (const l of eventLines) {
            const { decrementedQty } = await this.eventReserver.reserveEventOfferListing(qr, {
              listingId: l.option.optionId,
              serviceKey: SEMI_FRANCHISE_EVENT_SERVICE_KEY,
              userId: buyerId,
              quantity: l.quantity,
            });
            reservations.push({ listingId: l.option.optionId, qty: decrementedQty });
          }
          await qr.commitTransaction();
        } catch (e: any) {
          if (qr.isTransactionActive) await qr.rollbackTransaction();
          for (const l of group.lines) {
            failedItems.push({
              itemId: l.cartItemId,
              productName: l.option.productName,
              code: e?.code || 'RESERVATION_FAILED',
              message: e?.message || '이벤트 수량 확인에 실패했습니다.',
            });
          }
          continue;
        } finally {
          await qr.release();
        }
      }

      // 2b. 주문 생성 — 단일 지점
      const paymentGroupId = paymentGroupIds.get(group.receiverKey) ?? randomUUID();
      paymentGroupIds.set(group.receiverKey, paymentGroupId);
      const first = group.lines[0].option;
      const items = group.lines.map((l) => ({
        // productId = SPO id — 공급자 스코프 계약(neture_order_items.product_id = spo.id)
        productId: l.option.offerId,
        productName: l.option.productName,
        quantity: l.quantity,
        unitPrice: l.option.unitPrice,
        subtotal: l.option.unitPrice * l.quantity,
        metadata: {
          supplyKind: l.option.kind,
          supplyOptionId: l.option.optionId,
          ...(l.option.kind === 'proposal' ? { supplyProposalId: l.option.optionId } : {}),
          ...(l.option.kind === 'recruitment' ? { sellerRecruitmentId: l.option.optionId } : {}),
          ...(l.option.kind === 'event'
            ? { eventOfferId: l.option.optionId, organizationProductListingId: l.option.optionId, productListingId: l.option.optionId }
            : {}),
          semiFranchiseKey: l.option.semiFranchiseKey,
          receiverKey: group.receiverKey,
          unitPrice: l.option.unitPrice,
          cartItemId: l.cartItemId,
          conditions: {
            startAt: l.option.startAt,
            endAt: l.option.endAt,
            perStoreLimit: l.option.perStoreLimit,
            perOrderLimit: l.option.perOrderLimit,
            targetOrganizationId: l.option.targetOrganizationId,
          },
        },
      }));
      const groupSubtotal = items.reduce((s, it) => s + it.subtotal, 0);
      const shippingPolicy = { baseShippingFee: first.baseShippingFee, freeShippingThreshold: first.freeShippingThreshold };
      const shipping = calculateSupplierShippingFee(groupSubtotal, shippingPolicy);
      try {
        const saved = await this.createOrder({
          buyerId,
          sellerId: organizationId,
          sellerOrganizationId: organizationId,
          supplierId: group.supplierId,
          items,
          shippingAddress,
          shippingPolicy,
          shippingFeeSnapshot: shipping.shippingFee,
          metadata: {
            source: NETURE_PHARMACY_ORDER_SOURCE,
            serviceKey: NETURE_PHARMACY_SERVICE_KEY,
            orderType: 'STORE_RESTOCK',
            paymentGroupId,
            receiverKey: group.receiverKey,
            receiverDetermined: isReceiverDetermined(group.receiverKey),
            sellerOrganizationId: organizationId,
            buyerOrganizationName: org?.name ?? null,
            supplierId: group.supplierId,
            cartItemIds: group.lines.map((l) => l.cartItemId),
            fulfillmentVisibility: 'hidden_until_paid',
          },
        });
        await this.dataSource.query(
          `DELETE FROM store_cart_items WHERE id = ANY($1::uuid[]) AND buyer_id = $2 AND service_key = $3`,
          [group.lines.map((l) => l.cartItemId), buyerId, NETURE_PHARMACY_SERVICE_KEY],
        );
        createdOrders.push({
          orderId: saved.id,
          orderNumber: saved.orderNumber,
          supplierId: group.supplierId,
          receiverKey: group.receiverKey,
          paymentGroupId,
          totalAmount: Number(saved.totalAmount),
        });
      } catch (e: any) {
        for (const r of reservations) await this.eventReserver.incrementListingQuantity(r.listingId, r.qty);
        for (const l of group.lines) {
          failedItems.push({
            itemId: l.cartItemId,
            productName: l.option.productName,
            code: e?.code || 'ORDER_CREATE_FAILED',
            message: e?.message || '주문 생성에 실패했습니다.',
          });
        }
      }
    }

    const paymentGroups = [...paymentGroupIds.entries()]
      .map(([receiverKey, paymentGroupId]) => {
        const orders = createdOrders.filter((o) => o.paymentGroupId === paymentGroupId);
        return {
          paymentGroupId,
          receiverKey,
          receiverDetermined: isReceiverDetermined(receiverKey),
          orderIds: orders.map((o) => o.orderId),
          totalAmount: orders.reduce((s, o) => s + o.totalAmount, 0),
        };
      })
      .filter((g) => g.orderIds.length > 0);

    return { createdOrders, paymentGroups, failedItems };
  }
}
