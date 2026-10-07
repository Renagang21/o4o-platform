/**
 * WO-NETURE-PHARMACY-PREDEPLOY-ACCESS-ALIGNMENT-V1 — 옛 KPA HUB 주문 진입의 Neture 약국 안내
 *
 *   N1 판정: kpa-society active · super_admin · 미인증 → 대상 아님 / neture:store_owner 또는 (neture active ∧ isStoreOwner)
 *      이면서 kpa-society 가 active 가 아님(없음 · 정지 · 탈퇴) → 대상
 *   N2 래퍼: 대상이면 새 commerce 안내(store.neture.co.kr 공급 옵션 · 장바구니 · 주문 내역), 아니면 children 그대로
 *
 * 실행: 저장소 루트에서 `npx vitest run --config services/web-kpa-society/vitest.config.mjs`
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

let mockUser: Record<string, unknown> | null = null;
vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser, isAuthenticated: !!mockUser, isLoading: false }),
}));

import { NetureCommerceRedirect } from '../NetureCommerceRedirect';
import { NETURE_COMMERCE_LINKS, isNetureCommerceUser } from '../../../lib/netureCommerce';

const netureUser = (over: Record<string, unknown> = {}) => ({ id: 'u1', roles: ['neture:store_owner'], memberships: [{ serviceKey: 'neture', status: 'active' }], ...over });

beforeEach(() => { mockUser = null; });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('N1 isNetureCommerceUser', () => {
  it.each([
    ['미인증', null, false],
    ['KPA 회원(kpa-society active)', { id: 'u', roles: ['kpa:store_owner'], memberships: [{ serviceKey: 'kpa-society', status: 'active' }] }, false],
    ['KPA active + neture:store_owner 겸유 → KPA 경로 유지', netureUser({ memberships: [{ serviceKey: 'kpa-society', status: 'active' }] }), false],
    ['super_admin', { id: 'u', roles: ['platform:super_admin'], memberships: [] }, false],
    ['Neture 약국(neture:store_owner)', netureUser(), true],
    ['Neture 약국 + KPA 정지', netureUser({ memberships: [{ serviceKey: 'kpa-society', status: 'suspended' }] }), true],
    ['role 미반영이어도 neture active ∧ isStoreOwner', { id: 'u', roles: [], memberships: [{ serviceKey: 'neture', status: 'active' }], isStoreOwner: true }, true],
    ['neture active 이지만 매장 경영자 아님', { id: 'u', roles: [], memberships: [{ serviceKey: 'neture', status: 'active' }], isStoreOwner: false }, false],
  ])('%s → %s', (_name, user, expected) => {
    expect(isNetureCommerceUser(user as never)).toBe(expected);
  });
});

describe('N2 NetureCommerceRedirect', () => {
  const renderWrapped = () =>
    render(
      <MemoryRouter>
        <NetureCommerceRedirect><p>옛 장바구니</p></NetureCommerceRedirect>
      </MemoryRouter>,
    );

  it('KPA 회원 → 기존 화면 그대로', () => {
    mockUser = { id: 'u', roles: ['kpa:store_owner'], memberships: [{ serviceKey: 'kpa-society', status: 'active' }] };
    renderWrapped();
    expect(screen.getByText('옛 장바구니')).toBeTruthy();
  });

  it('미인증 → children(기존 가드가 로그인 처리)', () => {
    renderWrapped();
    expect(screen.getByText('옛 장바구니')).toBeTruthy();
  });

  it('Neture 약국 → 새 commerce 안내 · 버튼은 store.neture.co.kr 절대 URL', () => {
    mockUser = netureUser();
    const assign = vi.fn();
    vi.stubGlobal('location', { ...window.location, assign });
    renderWrapped();
    expect(screen.queryByText('옛 장바구니')).toBeNull();
    expect(screen.getByText('Neture 약국 주문은 내 매장에서 합니다')).toBeTruthy();
    fireEvent.click(screen.getByText(NETURE_COMMERCE_LINKS.cart.label));
    expect(assign).toHaveBeenCalledWith('https://store.neture.co.kr/store/pharmacy/cart');
    fireEvent.click(screen.getByText(NETURE_COMMERCE_LINKS.orders.label));
    expect(assign).toHaveBeenCalledWith('https://store.neture.co.kr/store/pharmacy/orders');
    vi.unstubAllGlobals();
  });
});
