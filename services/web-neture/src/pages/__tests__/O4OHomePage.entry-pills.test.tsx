/**
 * O4O 대표 홈 — 로그인 전 / 후 정보구조
 *
 * WO-O4O-NETURE-HOME-ENTRY-REFRESH-V1 (서비스 진입 = 서브도메인 정본 URL)
 * WO-O4O-NETURE-PUBLIC-HOME-IA-REFRESH-V1 (로그인 전 = O4O 이해 → 서비스 발견 → Google 로 시작 / 로그인 후 = AI + 내 업무)
 *
 * 실행: 저장소 루트에서
 *   npx vitest run --config services/web-neture/vitest.config.mjs
 *
 * mock 은 화면이 의존하는 경계(인증 · 모달 · 업무범위 · 홈 엔트리 · 소식 · 법정정보)에만 둔다.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const auth = {
  user: null as null | { id: string; email: string; name: string; roles: string[] },
  isAuthenticated: false,
  isLoading: false,
  logout: vi.fn(),
  pendingPolicyAcceptances: [] as unknown[],
};
const openLoginModal = vi.fn();
const openRegisterModal = vi.fn();

vi.mock('../../contexts', () => ({
  useAuth: () => auth,
  useLoginModal: () => ({ openLoginModal, openRegisterModal }),
  useWorkScope: () => ({ workScope: null, isResolvingStore: false }),
}));
vi.mock('../../lib/home-entry', () => ({
  useHomeEntry: () => ({ data: null, loading: false, error: null, reload: vi.fn() }),
}));
vi.mock('../../components/home/HomeServiceNews', () => ({
  default: (p: { hideWhenEmpty?: boolean }) => <div data-testid="news" data-hide-when-empty={String(!!p.hideWhenEmpty)} />,
}));
vi.mock('../../components/home/HomeEntryPanel', () => ({ default: () => <div data-testid="entry-panel" /> }));
vi.mock('@o4o/shared-space-ui', () => ({ PublicLegalFooterInfo: () => null }));
vi.mock('../../lib/footerLegal', () => ({ loadFooterLegal: vi.fn() }));

import O4OHomePage from '../O4OHomePage';

function mount() {
  return render(
    <MemoryRouter>
      <O4OHomePage />
    </MemoryRouter>,
  );
}

const linksOf = (navName: string) =>
  within(screen.getByRole('navigation', { name: navName }))
    .getAllByRole('link')
    .map((a) => ({ text: a.textContent ?? '', href: a.getAttribute('href') ?? '', target: a.getAttribute('target'), rel: a.getAttribute('rel') ?? '' }));

/** a 가 문서 순서상 b 보다 앞인가 */
const before = (a: Element, b: Element) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

beforeEach(() => {
  Object.assign(auth, { user: null, isAuthenticated: false, isLoading: false, pendingPolicyAcceptances: [] });
  openLoginModal.mockClear();
  openRegisterModal.mockClear();
  try {
    localStorage.removeItem('neture:automation:intro-seen:v1');
  } catch {
    /* jsdom */
  }
});
afterEach(cleanup);

describe('로그인 전 — AI 우선 및 공개 전체 탐색', () => {
  it('AI 입력 → 전체 서비스 → 소식 순서로 표시한다', () => {
    mount();
    expect(before(screen.getByTestId('home-composer'), screen.getByRole('heading', { name: '전체 서비스' }))).toBe(true);
    expect(before(screen.getByRole('heading', { name: '전체 서비스' }), screen.getByTestId('news'))).toBe(true);
  });

  it('5분류의 정본 서비스 주소를 노출하고 은퇴 호스트를 제외한다', () => {
    mount();
    const groups = ['약국 협력사업 참여', '약국 경영·공급 활동', '커뮤니티·단체활동', '제품·유통 사업 참여', '기타'];
    const links = groups.flatMap(linksOf);
    expect(links.map(l => l.href)).toEqual([
      'https://pharmacy.neture.co.kr/', 'https://store.neture.co.kr/', 'https://supplier.neture.co.kr',
      'https://community.neture.co.kr', 'https://kpa.neture.co.kr/', 'https://study.neture.co.kr/',
      'https://funding.neture.co.kr/', '/services/partner', '/hospital',
    ]);
    for (const link of links.filter(l => l.href.startsWith('https:'))) {
      expect(link.target).toBe('_blank'); expect(link.rel).toContain('noopener');
    }
    for (const host of ['retail.neture.co.kr', 'pharmacyhub.co.kr', 'partner.neture.co.kr']) {
      expect(links.some(l => l.href.includes(host))).toBe(false);
    }
  });

  it('Google 시작 CTA 하나 · 우상단 로그인 하나 — 회원가입 버튼 없음 (같은 Google 흐름)', () => {
    mount();
    expect(screen.queryByRole('button', { name: '회원가입' })).toBeNull();
    fireEvent.click(screen.getByTestId('home-google-start'));
    fireEvent.click(screen.getByTestId('home-login-button'));
    expect(openLoginModal).toHaveBeenCalledTimes(2);
    expect(openRegisterModal).not.toHaveBeenCalled();
  });

  it('세션 복구 중에는 Google 시작 CTA 를 숨긴다', () => {
    auth.isLoading = true;
    mount();
    expect(screen.queryByTestId('home-google-start')).toBeNull();
  });

  it('비로그인 AI 제출은 실행하지 않고 로그인으로 보낸다 · 첫 사용 안내는 보이지 않는다', () => {
    mount();
    expect(screen.queryByTestId('automation-intro')).toBeNull();
    fireEvent.change(screen.getByTestId('home-composer-input'), { target: { value: '안녕하세요' } });
    fireEvent.submit(screen.getByTestId('home-composer'));
    expect(openLoginModal).toHaveBeenCalledTimes(1);
    expect(screen.getAllByTestId('home-composer')).toHaveLength(1);
  });

  it('소식은 글이 있을 때만 (hideWhenEmpty) · HomeEntryPanel 없음', () => {
    mount();
    expect(screen.getByTestId('news').getAttribute('data-hide-when-empty')).toBe('true');
    expect(screen.queryByTestId('entry-panel')).toBeNull();
  });
});

describe('로그인 후 — AI + 내 업무 시작 (구조 불변)', () => {
  beforeEach(() => {
    Object.assign(auth, { user: { id: 'u1', email: 'u1@example.test', name: '회원', roles: ['user'] }, isAuthenticated: true });
  });

  it('워드마크 → 무엇을 도와드릴까요 → Composer → HomeEntryPanel', () => {
    mount();
    const prompt = screen.getByText('무엇을 도와드릴까요?', { selector: 'p' });
    expect(before(prompt, screen.getByTestId('home-composer'))).toBe(true);
    expect(before(screen.getByTestId('home-composer'), screen.getByTestId('entry-panel'))).toBe(true);
    expect(screen.getAllByTestId('home-composer')).toHaveLength(1);
  });

  it('공개 전체 목록은 개인 업무와 별도로 유지하며 로그인 CTA는 숨긴다', () => {
    mount();
    expect(screen.queryByText(/오프라인 매장의 활동으로 연결합니다/)).toBeNull();
    expect(screen.getByRole('heading', { name: '전체 서비스' })).toBeTruthy();
    expect(before(screen.getByTestId('entry-panel'), screen.getByRole('heading', { name: '전체 서비스' }))).toBe(true);
    expect(screen.queryByTestId('home-google-start')).toBeNull();
  });

  it('첫 사용 안내는 로그인 후 아직 보지 않은 사람에게만', () => {
    mount();
    expect(screen.getByTestId('automation-intro')).toBeTruthy();
    fireEvent.click(screen.getByTestId('automation-intro-dismiss'));
    expect(screen.queryByTestId('automation-intro')).toBeNull();
  });
});

 it("약관 미동의 로그인 사용자는 공개 홈으로 돌아오며 개인 업무·AI를 실행하지 않는다", () => {
  Object.assign(auth, { user: { id: "synthetic", name: "샘플", email: "sample@example.test", roles: [] }, isAuthenticated: true, pendingPolicyAcceptances: [{}] });
  mount();
  expect(screen.getByRole("heading", { name: "전체 서비스" })).toBeTruthy();
  expect(screen.queryByTestId("entry-panel")).toBeNull();
  expect(screen.queryByTestId("home-composer")).toBeNull();
  expect(screen.queryByTestId("home-google-start")).toBeNull();
  expect(screen.getByRole("link", { name: "약관 동의하기" }).getAttribute("href")).toBe("/mypage");
});
