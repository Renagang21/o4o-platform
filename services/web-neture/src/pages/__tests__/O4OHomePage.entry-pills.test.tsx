/**
 * O4O 대표 홈 — 로그인 전 「서비스 안내」 pill 진입 URL
 *
 * WO-O4O-NETURE-HOME-ENTRY-REFRESH-V1
 *
 * 실행: 저장소 루트에서
 *   npx vitest run --config services/web-neture/vitest.config.mjs
 *
 * 대표 홈의 서비스 진입은 서브도메인 정본 URL 이다(CHECK-O4O-URL-FIRST-CENSUS-V1).
 * 구 호스트(kpa-society.co.kr · k-cosmetics.site · pharmacyhub.co.kr) 와 neture.co.kr 하위경로
 * (/supplier · /community) 로 되돌아가지 않게, 병원약국(/hospital)이 O4O 서비스 진입에 섞이지
 * 않게 못박는다. mock 은 화면이 의존하는 경계(인증 · 모달 · 업무범위 · 홈 엔트리 · 소식 · 법정정보)에만 둔다.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../contexts', () => ({
  useAuth: () => ({ user: null, isAuthenticated: false, isLoading: false, logout: vi.fn() }),
  useLoginModal: () => ({ openLoginModal: vi.fn(), openRegisterModal: vi.fn() }),
  useWorkScope: () => ({ workScope: null, isResolvingStore: false }),
}));
vi.mock('../../lib/home-entry', () => ({
  useHomeEntry: () => ({ data: null, loading: false, error: null, reload: vi.fn() }),
}));
vi.mock('../../components/home/HomeServiceNews', () => ({ default: () => null }));
vi.mock('../../components/home/HomeEntryPanel', () => ({ default: () => null }));
vi.mock('@o4o/shared-space-ui', () => ({ PublicLegalFooterInfo: () => null }));
vi.mock('../../lib/footerLegal', () => ({ loadFooterLegal: vi.fn() }));

import O4OHomePage from '../O4OHomePage';

afterEach(cleanup);

function renderPills() {
  render(
    <MemoryRouter>
      <O4OHomePage />
    </MemoryRouter>,
  );
  const nav = screen.getByRole('navigation', { name: '서비스 안내' });
  return within(nav).getAllByRole('link');
}

describe('O4OHomePage 서비스 안내 pill', () => {
  it('서비스 진입은 서브도메인 정본 URL 로 새 탭에서 연다', () => {
    const links = renderPills();
    expect(links.map((a) => [a.textContent, a.getAttribute('href')])).toEqual([
      ['약국', 'https://pharmacy.neture.co.kr/'],
      ['화장품', 'https://retail.neture.co.kr/'],
      ['공급자', 'https://supplier.neture.co.kr'],
      ['커뮤니티', 'https://community.neture.co.kr'],
    ]);
    for (const a of links) {
      expect(a.getAttribute('target')).toBe('_blank');
      expect(a.getAttribute('rel')).toContain('noopener');
    }
  });

  it('구 호스트 · 하위경로 · 은퇴 진입 · 병원약국을 노출하지 않는다', () => {
    const hrefs = renderPills().map((a) => a.getAttribute('href') ?? '');
    for (const legacy of ['kpa-society.co.kr', 'k-cosmetics.site', 'pharmacyhub.co.kr', '/hospital', 'partner']) {
      expect(hrefs.some((h) => h.includes(legacy))).toBe(false);
    }
    expect(hrefs).not.toContain('/supplier');
    expect(hrefs).not.toContain('/community');
    expect(screen.queryByText('약국 경영')).toBeNull();
  });
});
