/**
 * useStoreCart — 매장 장바구니 상태 Core (headless)
 *
 * WO-O4O-STORE-HUB-PRODUCT-APPLICATION-AND-CART-COMMONIZATION-V1
 *
 * KPA-Society / K-Cosmetics / GlycoPharm 의 `StoreCartPage` 3벌이 동일하게 갖고 있던
 * 상태 기계만 담는다.
 *   공급자별 묶음 조회 · 수량 변경 · 항목 삭제 · 비우기 · 주문 확정 ·
 *   loading/busy/confirming · 합계(상품/배송비/총액/개수)
 *
 * 담지 않는 것:
 *   - 화면(디자인 시스템 · accent · 빈 상태 문구) — KPA 는 자체 뷰, KCos/GP 는 공통 `StoreCartView`.
 *   - http client — `api` adapter 로 주입한다 (서비스별 coreApiClient / authClient.api).
 *
 * 계약 보존:
 *   - 금액은 backend 가 준 `displaySubtotal` / `shipping.shippingFee` / `displayTotal` 만 합산한다.
 *     단가 재계산 · 배송 정책 재판정을 frontend 에서 하지 않는다.
 *   - 주문 확정 경로는 장바구니에 담긴 축이 결정한다:
 *       event_offer 축 → `checkout-confirm`,  b2b/regular 축 → `checkout-confirm-b2b`.
 *     (WO-O4O-CROSSSERVICE-B2B-CHECKOUT-CONFIRM-SERVICE-AGNOSTIC-ADOPTION-V1 §24 —
 *      두 경로를 하나의 URL 로 통일하지 않는다. 서버는 같은 공통 Core 를 쓴다.)
 *     결제/정산 정책은 backend 소관이다.
 *   - Pharmacy-Hub 는 자체 controller/route 를 유지하므로 이 Core 를 쓰지 않는다.
 */

import { useCallback, useEffect, useState } from 'react';
import { toast } from '@o4o/error-handling';
import type { CheckoutConfirmResult, StoreCartApi, SupplierGroup } from './storeCartTypes';

/** 장바구니에 b2b/regular(공급자 offer 직접 구매) 항목이 있으면 B2B 확정 경로를 쓴다. */
const B2B_SOURCE_TYPES = new Set(['b2b', 'regular']);

/** 이벤트오퍼 축 — 별도 확정 경로(`checkout-confirm`)와 별도 재고 예약 계약을 갖는다. */
const EVENT_SOURCE_TYPES = new Set(['event_offer']);

/**
 * 축 혼재 안내 문구 (WO-O4O-B2B-REMAINING-DEBT-FINAL-CLOSURE-V1 §8).
 *
 * 한 장바구니에 두 축이 섞이면 어느 경로로 보내도 반대 축 항목은 서버에서 항목 단위로
 * 탈락한다(`UNSUPPORTED_CART_ITEM_SOURCE`). 서버는 이미 fail-closed 라 오염은 없지만
 * 사용자에게는 "일부만 주문됨" 으로 보인다. 그래서 **확정 자체를 막고** 축을 나눠
 * 주문하도록 안내한다 — 새 cart 구조를 만들지 않는 최소 처리다.
 */
export const MIXED_CART_AXIS_MESSAGE =
  '이벤트 상품과 공급자 상품은 함께 주문할 수 없습니다. 한 축씩 나눠 주문해 주세요.';

export interface UseStoreCartOptions {
  api: StoreCartApi;
  /** cart 경계 키 (URL 경로 파라미터). 예: 'kpa-society' · 'k-cosmetics' · 'glycopharm' */
  serviceKey: string;
}

export interface UseStoreCartResult {
  groups: SupplierGroup[];
  loading: boolean;
  /** 수량 변경 · 삭제 · 비우기 진행 중 */
  busy: boolean;
  confirming: boolean;
  /** 마지막 주문 확정 결과 (없으면 null) */
  confirmResult: CheckoutConfirmResult | null;

  reload: () => Promise<void>;
  changeQty: (id: string, quantity: number) => Promise<void>;
  remove: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  confirmCheckout: () => Promise<void>;

  /** 상품 금액 합계 (배송비 제외) */
  itemsSubtotal: number;
  shippingTotal: number;
  grandTotal: number;
  itemCount: number;
}

const message = (err: unknown, fallback: string) =>
  (err as { message?: string })?.message || fallback;

export function useStoreCart({ api, serviceKey }: UseStoreCartOptions): UseStoreCartResult {
  const [groups, setGroups] = useState<SupplierGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmResult, setConfirmResult] = useState<CheckoutConfirmResult | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.groupBySupplier(serviceKey);
      setGroups(res.data.groups);
    } catch (err) {
      toast.error(message(err, '장바구니를 불러오지 못했습니다.'));
    } finally {
      setLoading(false);
    }
  }, [api, serviceKey]);

  useEffect(() => {
    load();
  }, [load]);

  const changeQty = useCallback(
    async (id: string, quantity: number) => {
      if (quantity < 1 || busy) return;
      setBusy(true);
      try {
        await api.updateQuantity(serviceKey, id, quantity);
        await load();
      } catch (err) {
        toast.error(message(err, '수량 변경에 실패했습니다.'));
      } finally {
        setBusy(false);
      }
    },
    [api, serviceKey, busy, load],
  );

  const remove = useCallback(
    async (id: string) => {
      if (busy) return;
      setBusy(true);
      try {
        await api.removeItem(serviceKey, id);
        await load();
      } catch (err) {
        toast.error(message(err, '삭제에 실패했습니다.'));
      } finally {
        setBusy(false);
      }
    },
    [api, serviceKey, busy, load],
  );

  const clearAll = useCallback(async () => {
    if (busy || groups.length === 0) return;
    setBusy(true);
    try {
      await api.clear(serviceKey);
      await load();
    } catch (err) {
      toast.error(message(err, '비우기에 실패했습니다.'));
    } finally {
      setBusy(false);
    }
  }, [api, serviceKey, busy, groups.length, load]);

  const confirmCheckout = useCallback(async () => {
    if (confirming || busy || groups.length === 0) return;
    setConfirming(true);
    setConfirmResult(null);
    try {
      // 담긴 축이 경로를 결정한다.
      const items = groups.flatMap((g) => g.items);
      const hasB2B = items.some((i) => B2B_SOURCE_TYPES.has(i.sourceType));
      const hasEvent = items.some((i) => EVENT_SOURCE_TYPES.has(i.sourceType));
      // 축 혼재는 확정하지 않는다 — 반쪽 주문 대신 사용자에게 분리 주문을 안내한다.
      if (hasB2B && hasEvent) {
        toast.error(MIXED_CART_AXIS_MESSAGE);
        return;
      }
      const data: CheckoutConfirmResult =
        hasB2B && api.checkoutConfirmB2B
          ? await api.checkoutConfirmB2B(serviceKey).then((res) => ({
              serviceKey: res.data.serviceKey,
              createdOrders: res.data.createdOrders,
              // 화면 계약(`message`)을 유지한다 — 서버 code 는 표시하지 않는다.
              failedItems: res.data.failedItems.map((f) => ({
                itemId: f.itemId,
                reason: f.code,
                message: f.reason,
              })),
              removedCartItemIds: res.data.removedCartItemIds,
            }))
          : await api.checkoutConfirm(serviceKey).then((res) => res.data);

      setConfirmResult(data);
      if (data.createdOrders.length > 0) {
        toast.success(`${data.createdOrders.length}개 공급자 주문이 생성되었습니다.`);
      }
      if (data.failedItems.length > 0) {
        toast.error(`${data.failedItems.length}개 항목은 주문하지 못했습니다.`);
      }
      await load(); // 성공 항목 제거 반영
    } catch (err) {
      toast.error(message(err, '주문 확정에 실패했습니다.'));
    } finally {
      setConfirming(false);
    }
  }, [api, serviceKey, confirming, busy, groups, load]);

  // WO-O4O-STORE-CART-SUPPLIER-GROUP-SHIPPING-PREVIEW-V1: 상품/배송비/총액 분리 (서버 값 합산만).
  const itemsSubtotal = groups.reduce((sum, g) => sum + g.displaySubtotal, 0);
  const shippingTotal = groups.reduce((sum, g) => sum + (g.shipping?.shippingFee ?? 0), 0);
  const grandTotal = itemsSubtotal + shippingTotal;
  const itemCount = groups.reduce((sum, g) => sum + g.itemCount, 0);

  return {
    groups,
    loading,
    busy,
    confirming,
    confirmResult,
    reload: load,
    changeQty,
    remove,
    clearAll,
    confirmCheckout,
    itemsSubtotal,
    shippingTotal,
    grandTotal,
    itemCount,
  };
}
