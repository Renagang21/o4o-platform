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
  Object.assign(auth, { user: null, isAuthenticated: false, isLoading: false });
  openLoginModal.mockClear();
  openRegisterModal.mockClear();
  try {
    localStorage.removeItem('neture:automation:intro-seen:v1');
  } catch {
    /* jsdom */
  }
});
afterEach(cleanup);

describe('로그인 전 — O4O 이해 → 서비스 발견 → Google 로 시작', () => {
  it('O4O 소개 문구가 AI 입력보다 먼저 나온다', () => {
    mount();
    const intro = screen.getByText(/오프라인 매장의 활동으로 연결합니다/);
    expect(before(intro, screen.getByTestId('home-composer'))).toBe(true);
    expect(screen.queryByText('무엇을 도와드릴까요?', { selector: 'p' })).toBeNull();
  });

  it('순서: 소개 → 주요 서비스 → O4O AI → 참여 · 학습 → 소식', () => {
    mount();
    const order = [
      screen.getByText(/오프라인 매장의 활동으로 연결합니다/),
      screen.getByRole('navigation', { name: '주요 서비스' }),
      screen.getByRole('heading', { name: 'O4O AI' }),
      screen.getByRole('navigation', { name: '참여 · 학습' }),
      screen.getByTestId('news'),
    ];
    for (let i = 0; i < order.length - 1; i += 1) expect(before(order[i], order[i + 1])).toBe(true);
  });

  it('주요 서비스 3개 — 설명형 · 서브도메인 정본 URL · 새 탭', () => {
    mount();
    const links = linksOf('주요 서비스');
    expect(links.map((l) => l.href)).toEqual([
      'https://pharmacy.neture.co.kr/',
      'https://retail.neture.co.kr/',
      'https://supplier.neture.co.kr',
    ]);
    ['약국', '리테일', '공급자'].forEach((label, i) => expect(links[i].text.startsWith(label)).toBe(true));
    for (const l of links) {
      expect(l.text).toContain('서비스 보기');
      expect(l.target).toBe('_blank');
      expect(l.rel).toContain('noopener');
    }
  });

  it('참여 · 학습 3개 — 커뮤니티 · O4O 강의 · 유통참여형 펀딩 (보조 진입)', () => {
    mount();
    expect(linksOf('참여 · 학습').map((l) => l.href)).toEqual([
      'https://community.neture.co.kr',
      'https://study.neture.co.kr',
      'https://funding.neture.co.kr',
    ]);
    const text = linksOf('참여 · 학습').map((l) => l.text).join(' ');
    expect(text).toContain('커뮤니티');
    expect(text).toContain('O4O 강의');
    expect(text).toContain('유통참여형 펀딩');
    // 동적 사실을 정적 문구로 박지 않는다
    for (const claim of ['지금 참여', '모집 중', '지금 학습', '수강하세요']) expect(text).not.toContain(claim);
  });

  it('구 호스트 · 하위경로 · 은퇴 진입 · 병원약국 · 내 매장 · 「화장품」 분류명을 노출하지 않는다', () => {
    mount();
    const hrefs = [...linksOf('주요 서비스'), ...linksOf('참여 · 학습')].map((l) => l.href);
    for (const bad of ['kpa-society.co.kr', 'k-cosmetics.site', 'pharmacyhub.co.kr', '/hospital', 'partner', 'store.neture.co.kr']) {
      expect(hrefs.some((h) => h.includes(bad))).toBe(false);
    }
    expect(hrefs).not.toContain('/supplier');
    expect(hrefs).not.toContain('/community');
    expect(screen.queryByText('약국 경영')).toBeNull();
    expect(screen.queryByText('화장품')).toBeNull();
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

  it('공개 소개 · 서비스 안내 · Google 시작은 보이지 않는다', () => {
    mount();
    expect(screen.queryByText(/오프라인 매장의 활동으로 연결합니다/)).toBeNull();
    expect(screen.queryByRole('navigation', { name: '주요 서비스' })).toBeNull();
    expect(screen.queryByTestId('home-google-start')).toBeNull();
  });

  it('첫 사용 안내는 로그인 후 아직 보지 않은 사람에게만', () => {
    mount();
    expect(screen.getByTestId('automation-intro')).toBeTruthy();
    fireEvent.click(screen.getByTestId('automation-intro-dismiss'));
    expect(screen.queryByTestId('automation-intro')).toBeNull();
  });
});
