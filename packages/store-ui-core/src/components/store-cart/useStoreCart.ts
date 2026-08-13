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
 *   - 주문 확정은 `checkout-confirm` 단일 경로. 결제/정산 정책은 backend 소관이다.
 *   - Pharmacy-Hub 는 결제 그룹(paymentGroupId) 기반의 **다른 주문 계약**이므로 이 Core 를 쓰지 않는다.
 */

import { useCallback, useEffect, useState } from 'react';
import { toast } from '@o4o/error-handling';
import type { CheckoutConfirmResult, StoreCartApi, SupplierGroup } from './storeCartTypes';

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
      const res = await api.checkoutConfirm(serviceKey);
      setConfirmResult(res.data);
      if (res.data.createdOrders.length > 0) {
        toast.success(`${res.data.createdOrders.length}개 공급자 주문이 생성되었습니다.`);
      }
      if (res.data.failedItems.length > 0) {
        toast.error(`${res.data.failedItems.length}개 항목은 주문하지 못했습니다.`);
      }
      await load(); // 성공 항목 제거 반영
    } catch (err) {
      toast.error(message(err, '주문 확정에 실패했습니다.'));
    } finally {
      setConfirming(false);
    }
  }, [api, serviceKey, confirming, busy, groups.length, load]);

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
