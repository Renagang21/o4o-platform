/**
 * WO-O4O-CROSS-SERVICE-PUBLIC-DESIGN-AND-BRAND-REFRESH-V1 — 하위 host 대표 화면 Hero · CTA 계약
 *
 * supplier · funding · community `/` 는 공통 O4OPublicHero 로 확정 문구를 보여주고,
 * 주 CTA 는 실제로 동작하는 대상만 가리킨다. h1 은 화면에 하나.
 *
 * 실행: 저장소 루트에서 `npx vitest run --config services/web-neture/vitest.config.mjs`
 */
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const auth = vi.hoisted(() => ({ isAuthenticated: false }));
const openLoginModal = vi.hoisted(() => vi.fn());

vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ isAuthenticated: auth.isAuthenticated, user: null }) }));
vi.mock('../../contexts/LoginModalContext', () => ({ useLoginModal: () => ({ openLoginModal }) }));
vi.mock('../../components/auth/ServiceApplyPanel', () => ({
  ServiceApplyPanel: ({ service }: { service: string }) => <div data-testid={`apply-panel-${service}`} />,
}));
vi.mock('../../api/trial', () => ({ getTrials: vi.fn(async () => []), getMyParticipations: vi.fn(async () => []) }));

vi.mock('../../lib/apiClient', () => ({ api: { get: vi.fn(async () => ({ data: { data: { communities: [
  { communityKey: 'pharmacy', name: '약사 커뮤니티', kind: 'independent', allowed: false },
  { communityKey: 'business', name: '사업 회원 게시판', kind: 'semi-franchise', allowed: true },
] } } })) } }));

import SupplierLandingPage from '../SupplierLandingPage';
import CommunityHostHomePage from '../community/CommunityHostHomePage';
import { getTrials } from '../../api/trial';
import { MarketTrialHubPage } from '../market-trial/MarketTrialHubPage';

const renderAt = (ui: ReactNode) => render(<MemoryRouter>{ui}</MemoryRouter>);
const h1Text = () => {
  const h1s = screen.getAllByRole('heading', { level: 1 });
  expect(h1s).toHaveLength(1);
  return h1s[0].textContent;
};

afterEach(() => {
  cleanup();
  auth.isAuthenticated = false;
});

describe('supplier `/`', () => {
  it('비로그인 — 확정 Hero 문구 · 주 CTA = /register · 보조 = 공급자 로그인', () => {
    renderAt(<SupplierLandingPage />);
    expect(h1Text()).toBe('제품과 콘텐츠를매장과 연결합니다');
    expect(screen.getByText('상품 등록부터 매장 연결과 운영까지')).toBeTruthy();
    expect(screen.getByTestId('supplier-hero-primary').getAttribute('href')).toBe('/register');
    screen.getByRole('button', { name: '공급자 로그인' }).click();
    expect(openLoginModal).toHaveBeenCalledWith('/supplier');
  });

  it('로그인 — 서비스 이용 상태 패널(ServiceApplyPanel)을 그대로 보여준다', () => {
    auth.isAuthenticated = true;
    renderAt(<SupplierLandingPage />);
    expect(screen.getByTestId('apply-panel-supplier')).toBeTruthy();
    expect(screen.queryByTestId('supplier-hero-primary')).toBeNull();
  });
});

describe('community `/`', () => {
  it('서비스 소개 없이 독립 커뮤니티 목록으로 시작하고 사업 게시판을 섞지 않는다', async () => {
    renderAt(<CommunityHostHomePage />);
    expect(h1Text()).toBe('커뮤니티 · 단체활동');
    expect((await screen.findByRole('link', { name: /약사 커뮤니티/ })).getAttribute('href')).toBe('/communities/pharmacy/forum');
    expect(screen.queryByText('사업 회원 게시판')).toBeNull();
  });
});

describe('funding `/`', () => {
  it('비로그인은 목록 API 호출 전에 로그인으로 이동한다', async () => {
    vi.mocked(getTrials).mockClear();
    render(<MemoryRouter initialEntries={['/market-trial?status=recruiting']}><Routes>
      <Route path="/market-trial" element={<MarketTrialHubPage />} />
      <Route path="/login" element={<h1>로그인</h1>} />
    </Routes></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: '로그인' })).toBeTruthy();
    expect(getTrials).not.toHaveBeenCalled();
  });

  it('로그인 후 소개 배너 없이 모집 목록으로 진입한다', async () => {
    auth.isAuthenticated = true;
    renderAt(<MarketTrialHubPage />);
    expect(h1Text()).toBe('유통참여형 펀딩');
    expect(screen.queryByTestId('funding-hero-primary')).toBeNull();
    expect(screen.queryByRole('link', { name: '이용 방법' })).toBeNull();
    expect(await screen.findByText('현재 모집 중인 유통참여형 펀딩이 없습니다')).toBeTruthy();
  });
});
