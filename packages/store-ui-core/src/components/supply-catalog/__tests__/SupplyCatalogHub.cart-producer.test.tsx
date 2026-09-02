/**
 * SupplyCatalogHub — canonical B2B 장바구니 producer (opt-in) 계약
 *
 * WO-O4O-GLYCOPHARM-CANONICAL-B2B-CART-PRODUCER-UI-ADOPTION-V1 (§10 · §38 · §41)
 *
 * 고정하는 것
 *   1. `cart` prop 이 없으면 화면은 종전과 완전히 동일하다 — KPA-Society / K-Cosmetics 회귀 0.
 *   2. `cart` prop 이 있으면 카탈로그 행을 그대로 producer 에 넘긴다.
 *   3. 담기는 신청(ProductApproval)과 다른 액션이다 — 담기 버튼이 신청 API 를 부르지 않는다.
 *   4. 실패는 서버 사유를 그대로 보여주고, frontend 가 자격을 임의 판단하지 않는다.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { SupplyCatalogHub } from '../SupplyCatalogHub';
import type { SupplyCatalogProduct } from '../SupplyCatalogHub';

interface Row extends SupplyCatalogProduct {
  id: string;
  name: string;
}

const rows: Row[] = [
  { id: 'offer-1', name: '상품 A', supplierName: '공급자 A', priceGeneral: 10000, isAdded: false },
  { id: 'offer-2', name: '상품 B', supplierName: '공급자 B', priceGeneral: 20000, isAdded: false },
];

function makeApi() {
  return {
    getCatalog: vi.fn(async () => ({
      data: rows,
      pagination: { total: rows.length, limit: 20, offset: 0 },
    })),
    applyBySupplyProductId: vi.fn(async () => ({})),
    cancelProductByOfferId: vi.fn(async () => ({})),
  };
}

const baseProps = { accent: 'teal' as const, tableId: 'test-catalog' };

const cartButtons = () => screen.queryAllByTitle('장바구니에 담기');

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe('cart prop 미지정 — 기존 서비스 회귀 0 (§41)', () => {
  it('장바구니 컬럼도 버튼도 렌더하지 않는다', async () => {
    const api = makeApi();
    render(<SupplyCatalogHub<Row> {...baseProps} api={api} />);

    await waitFor(() => expect(screen.getByText('상품 A')).toBeTruthy());
    expect(cartButtons()).toHaveLength(0);
    expect(screen.queryByText('장바구니')).toBeNull();
  });
});

describe('cart prop 지정 — canonical producer (§10 · §38)', () => {
  it('행 담기는 그 행을 그대로 producer 에 넘긴다', async () => {
    const api = makeApi();
    const addToCart = vi.fn(async () => {});
    render(
      <SupplyCatalogHub<Row> {...baseProps} api={api} cart={{ addToCart, cartHref: '/store-hub/cart' }} />,
    );

    await waitFor(() => expect(screen.getByText('상품 A')).toBeTruthy());
    expect(cartButtons()).toHaveLength(2);

    fireEvent.click(cartButtons()[0]);
    await waitFor(() => expect(addToCart).toHaveBeenCalledTimes(1));
    expect(addToCart).toHaveBeenCalledWith(rows[0]);
  });

  it('담기는 공급 상품 신청(ProductApproval)을 호출하지 않는다 — 담기 ≠ 신청 ≠ 주문', async () => {
    const api = makeApi();
    const addToCart = vi.fn(async () => {});
    render(
      <SupplyCatalogHub<Row> {...baseProps} api={api} cart={{ addToCart, cartHref: '/store-hub/cart' }} />,
    );

    await waitFor(() => expect(screen.getByText('상품 A')).toBeTruthy());
    fireEvent.click(cartButtons()[1]);

    await waitFor(() => expect(addToCart).toHaveBeenCalledWith(rows[1]));
    expect(api.applyBySupplyProductId).not.toHaveBeenCalled();
    expect(api.cancelProductByOfferId).not.toHaveBeenCalled();
  });

  it('성공하면 장바구니로 이동할 수 있는 안내를 보여준다 (확정은 장바구니에서)', async () => {
    const api = makeApi();
    const addToCart = vi.fn(async () => {});
    render(
      <SupplyCatalogHub<Row> {...baseProps} api={api} cart={{ addToCart, cartHref: '/store-hub/cart' }} />,
    );

    await waitFor(() => expect(screen.getByText('상품 A')).toBeTruthy());
    fireEvent.click(cartButtons()[0]);

    const link = await screen.findByText('장바구니로 이동 →');
    expect(link.getAttribute('href')).toBe('/store-hub/cart');
  });

  it('실패 사유는 서버 문구를 그대로 보여준다 — frontend 가 자격을 판단하지 않는다', async () => {
    const api = makeApi();
    const addToCart = vi.fn(async () => {
      throw new Error('선택한 매장에 대한 권한이 없습니다.');
    });
    render(
      <SupplyCatalogHub<Row> {...baseProps} api={api} cart={{ addToCart, cartHref: '/store-hub/cart' }} />,
    );

    await waitFor(() => expect(screen.getByText('상품 A')).toBeTruthy());
    fireEvent.click(cartButtons()[0]);

    expect(await screen.findByText('선택한 매장에 대한 권한이 없습니다.')).toBeTruthy();
  });
});
