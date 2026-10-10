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
import { MemoryRouter } from 'react-router-dom';

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
  it('확정 Hero 문구 · 주 CTA = 이 화면의 모집 중 목록 · 보조 = 이용 방법', async () => {
    renderAt(<MarketTrialHubPage />);
    expect(h1Text()).toBe('제품의 가능성을유통 참여로 연결합니다');
    expect(screen.getByTestId('funding-hero-primary').getAttribute('href')).toBe('#market-trial-recruiting');
    expect(document.getElementById('market-trial-recruiting')).not.toBeNull();
    expect(screen.getByRole('link', { name: '이용 방법' }).getAttribute('href')).toBe('/guide/features/market-trial');
    // 모집이 없으면 빈 상태를 그대로 보여준다 (가짜 콘텐츠 없음)
    expect(await screen.findByText('현재 모집 중인 유통참여형 펀딩이 없습니다')).toBeTruthy();
    // 은퇴 서비스명 문구 없음
    expect(document.body.textContent).not.toMatch(/K-Cosmetics|KPA-a/);
  });
});
