/**
 * useStoreCart — 확정 경로의 축 분리 계약
 *
 * WO-O4O-B2B-REMAINING-DEBT-FINAL-CLOSURE-V1 §7 · §8
 *
 * 고정하는 것:
 *   · b2b/regular 만 담긴 장바구니 → `checkout-confirm-b2b`
 *   · event_offer 만 담긴 장바구니 → `checkout-confirm`
 *   · 두 축이 섞인 장바구니 → **어느 경로도 호출하지 않는다** (반쪽 주문 금지)
 *
 * 서버는 이미 항목 단위 fail-closed 라 축 오염은 없다. 이 테스트는 "일부만 주문되는
 * 사용자 경험"이 다시 생기지 않게 frontend 경로 선택을 고정한다.
 */
import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MIXED_CART_AXIS_MESSAGE, useStoreCart } from '../useStoreCart';
import type { StoreCartApi, SupplierGroup } from '../storeCartTypes';

vi.mock('@o4o/error-handling', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const group = (sourceTypes: string[]): SupplierGroup =>
  ({
    supplierId: 'sup-1',
    supplierName: '공급사',
    items: sourceTypes.map((sourceType, i) => ({
      id: `item-${i}`,
      sourceType,
      productName: '상품',
      quantity: 1,
      priceSnapshot: 1000,
    })),
    itemCount: sourceTypes.length,
    displaySubtotal: 1000 * sourceTypes.length,
    shipping: null,
  }) as unknown as SupplierGroup;

function makeApi(groups: SupplierGroup[]) {
  const confirmResult = {
    data: {
      serviceKey: 'kpa-society',
      createdOrders: [],
      failedItems: [],
      removedCartItemIds: [],
    },
  };
  const api = {
    groupBySupplier: vi.fn(async () => ({ data: { groups } })),
    updateQuantity: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    checkoutConfirm: vi.fn(async () => confirmResult),
    checkoutConfirmB2B: vi.fn(async () => confirmResult),
  } as unknown as StoreCartApi & {
    checkoutConfirm: ReturnType<typeof vi.fn>;
    checkoutConfirmB2B: ReturnType<typeof vi.fn>;
  };
  return api;
}

async function confirmWith(groups: SupplierGroup[]) {
  const api = makeApi(groups);
  const { result } = renderHook(() => useStoreCart({ api, serviceKey: 'kpa-society' }));
  await waitFor(() => expect(result.current.loading).toBe(false));
  await act(async () => {
    await result.current.confirmCheckout();
  });
  return api;
}

describe('확정 경로는 담긴 축이 결정한다', () => {
  it('b2b 항목만 있으면 B2B 확정 경로를 쓴다', async () => {
    const api = await confirmWith([group(['b2b'])]);
    expect(api.checkoutConfirmB2B).toHaveBeenCalledTimes(1);
    expect(api.checkoutConfirm).not.toHaveBeenCalled();
  });

  it('event_offer 항목만 있으면 이벤트오퍼 확정 경로를 쓴다', async () => {
    const api = await confirmWith([group(['event_offer'])]);
    expect(api.checkoutConfirm).toHaveBeenCalledTimes(1);
    expect(api.checkoutConfirmB2B).not.toHaveBeenCalled();
  });
});

describe('축 혼재 장바구니는 확정하지 않는다 (§8)', () => {
  it('두 축이 섞이면 어떤 확정 API 도 호출하지 않는다', async () => {
    const api = await confirmWith([group(['b2b', 'event_offer'])]);
    expect(api.checkoutConfirm).not.toHaveBeenCalled();
    expect(api.checkoutConfirmB2B).not.toHaveBeenCalled();
  });

  it('공급자 그룹이 달라도 축 혼재는 동일하게 막는다', async () => {
    const api = await confirmWith([group(['b2b']), group(['event_offer'])]);
    expect(api.checkoutConfirm).not.toHaveBeenCalled();
    expect(api.checkoutConfirmB2B).not.toHaveBeenCalled();
  });

  it('안내 문구는 분리 주문을 지시한다', () => {
    expect(MIXED_CART_AXIS_MESSAGE).toContain('나눠 주문');
  });
});
