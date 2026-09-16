/**
 * WO-O4O-SERVICE-OPERATOR-WORKSPACE-REALIGNMENT-V1 — 표준 Service Operator 사이드바 · 전환 바 렌더 계약
 *
 *   1. DomainIASidebar(기본 IA) 가 KPA UNIFIED_MENU 를 서비스 운영 / 사업 운영 / 운영 관리 로 그린다 (desktop aside)
 *      · approvals 가 item 단위로 두 도메인에 나뉜다 · 구 헤딩(커뮤니티 운영 / 매장 HUB 운영 / 운영 공통) 0
 *   2. 모바일 drawer 도 같은 트리(햄버거 → 3 도메인 헤딩)
 *   3. OperatorServiceSwitcher — operator-services 2건이면 두 서비스 · 목록 밖 서비스(PH) 없음 · 1건이면 미렌더
 *
 * 실행: 저장소 루트에서 `npx vitest run --config services/web-kpa-society/vitest.config.mjs`
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { filterMenuByRole } from '@o4o/ui';
import { DomainIASidebar, OperatorServiceSwitcher, type OperatorServicesApi } from '@o4o/operator-ux-core';
import { UNIFIED_MENU } from '../operatorMenuGroups';
import { ENABLED_CAPABILITIES } from '../operatorCapabilities';

afterEach(() => cleanup());

const DOMAIN_HEADINGS = ['서비스 운영', '사업 운영', '운영 관리'];
const RETIRED_HEADINGS = ['커뮤니티 운영', '매장 HUB 운영', '운영 공통'];

function renderSidebar(pathname = '/operator') {
  return render(
    <MemoryRouter initialEntries={[pathname]}>
      <DomainIASidebar menuItems={filterMenuByRole(UNIFIED_MENU, true)} capabilities={ENABLED_CAPABILITIES} />
    </MemoryRouter>,
  );
}

/** 도메인 헤딩 텍스트 → 그 헤딩 아래(다음 헤딩 전까지) 노출된 링크 라벨 */
function linksByDomain(root: HTMLElement): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  let current: string | null = null;
  const walker = root.querySelectorAll('a, span, button');
  for (const el of Array.from(walker)) {
    const text = el.textContent?.trim() ?? '';
    if (el.tagName === 'SPAN' && DOMAIN_HEADINGS.includes(text)) {
      current = text;
      out[current] = out[current] ?? [];
      continue;
    }
    if (current && (el.tagName === 'A' || el.tagName === 'BUTTON') && text) out[current].push(text);
  }
  return out;
}

describe('DomainIASidebar — 표준 3도메인 (KPA UNIFIED_MENU)', () => {
  it('desktop aside: 서비스 운영 / 사업 운영 / 운영 관리 헤딩만 있고 구 헤딩은 없다', () => {
    renderSidebar();
    const aside = document.querySelector('aside') as HTMLElement;
    expect(aside).toBeTruthy();
    for (const h of DOMAIN_HEADINGS) expect(within(aside).getAllByText(h).length).toBeGreaterThan(0);
    for (const h of RETIRED_HEADINGS) expect(screen.queryAllByText(h)).toHaveLength(0);
    // 헤딩 순서
    const headings = Array.from(aside.querySelectorAll('span'))
      .map((s) => s.textContent?.trim())
      .filter((t): t is string => !!t && DOMAIN_HEADINGS.includes(t));
    expect(headings).toEqual(DOMAIN_HEADINGS);
  });

  it('approvals 는 item 단위로 나뉜다: 제공받은 콘텐츠 승인 → 서비스 운영 · 상품 신청 · 이벤트 오퍼 · 모집 노출 → 사업 운영', async () => {
    renderSidebar('/operator/product-applications');
    const aside = document.querySelector('aside') as HTMLElement;
    const by = linksByDomain(aside);
    // 서비스 운영 안의 approvals 는 항목 1개라 그룹명 대신 항목 라벨로 직접 링크된다
    expect(by['서비스 운영']).toContain('제공받은 콘텐츠 승인');
    expect(by['서비스 운영']).not.toContain('공급 상품 신청 승인');
    // 사업 운영: 활성 경로가 있어 승인 그룹이 자동으로 펼쳐진다
    expect(by['사업 운영']).toEqual(expect.arrayContaining(['공급 상품 신청 승인', '이벤트 오퍼 승인', '판매자 모집 노출 승인']));
    expect(by['사업 운영']).not.toContain('제공받은 콘텐츠 승인');
    // 운영 관리
    expect(by['운영 관리'].join(' ')).toMatch(/분석|시스템/);
  });

  it('회원 · 매장 · 콘텐츠 · 포럼 · 강의 는 서비스 운영, 상품 · 주문 은 사업 운영 그룹으로 표시된다', () => {
    renderSidebar();
    const aside = document.querySelector('aside') as HTMLElement;
    const by = linksByDomain(aside);
    expect(by['서비스 운영']).toEqual(expect.arrayContaining(['회원 관리', '매장', '콘텐츠', '포럼', '강의']));
    expect(by['사업 운영']).toEqual(expect.arrayContaining(['상품 현황', '주문 현황', '승인']));
  });

  it('모바일 drawer 도 같은 3도메인 트리를 그린다 (햄버거 → 헤딩 3개)', async () => {
    renderSidebar();
    const user = userEvent.setup();
    const drawer = document.getElementById('operator-mobile-drawer') as HTMLElement;
    expect(drawer.getAttribute('aria-hidden')).toBe('true');
    const toggle = screen.getByRole('button', { name: '운영자 메뉴 열기' });
    await user.click(toggle);
    await waitFor(() => expect(drawer.getAttribute('aria-hidden')).toBe('false'));
    for (const h of DOMAIN_HEADINGS) expect(within(drawer).getByText(h)).toBeTruthy();
    for (const h of RETIRED_HEADINGS) expect(within(drawer).queryByText(h)).toBeNull();
    // 데스크톱 aside 와 같은 트리: 도메인별 링크 집합이 같다
    const desktop = linksByDomain(document.querySelector('aside') as HTMLElement);
    expect(linksByDomain(drawer)).toEqual(desktop);
    // ESC 로 닫힌다
    await user.keyboard('{Escape}');
    await waitFor(() => expect(drawer.getAttribute('aria-hidden')).toBe('true'));
  });
});

function fakeApi(services: Array<{ serviceKey: string; serviceName: string; workspaceMode?: string }>): OperatorServicesApi & { post: ReturnType<typeof vi.fn> } {
  const post = vi.fn(async (serviceKey: string, returnPath: string) => `https://${serviceKey}.example/?h=1&r=${returnPath}`);
  return {
    post,
    fetchOperatorServices: async () =>
      services.map((s) => ({
        serviceKey: s.serviceKey,
        serviceName: s.serviceName,
        scope: 'operator' as const,
        workspaceMode: (s.workspaceMode ?? 'standard') as 'standard',
        workspaceAvailable: true,
      })),
    resolveServiceEntryUrl: (k, p) => post(k, p),
  };
}

describe('OperatorServiceSwitcher — 합성 Operator X (KPA + K-Cos)', () => {
  it('operator-services 가 2건이면 두 서비스를 그리고 목록 밖(PH)은 없다 · 현재 서비스는 내부 링크', async () => {
    const api = fakeApi([
      { serviceKey: 'kpa-society', serviceName: 'KPA Society' },
      { serviceKey: 'k-cosmetics', serviceName: 'K-Cosmetics' },
    ]);
    render(
      <MemoryRouter>
        <OperatorServiceSwitcher api={api} currentServiceKey="kpa-society" />
      </MemoryRouter>,
    );
    const bar = await screen.findByTestId('operator-service-switcher');
    expect(within(bar).getByRole('link', { name: 'KPA Society' }).getAttribute('href')).toBe('/operator');
    const other = within(bar).getByRole('button', { name: 'K-Cosmetics' });
    expect(within(bar).queryByText(/Pharmacy/)).toBeNull();

    const user = userEvent.setup();
    const assign = vi.fn();
    const original = window.location;
    Object.defineProperty(window, 'location', { value: { ...original, assign }, writable: true });
    await user.click(other);
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('k-cosmetics', '/operator'));
    await waitFor(() => expect(assign).toHaveBeenCalledWith('https://k-cosmetics.example/?h=1&r=/operator'));
    Object.defineProperty(window, 'location', { value: original, writable: true });
  });

  it('운영 가능 서비스가 1건이면 전환 바를 그리지 않는다', async () => {
    const api = fakeApi([{ serviceKey: 'kpa-society', serviceName: 'KPA Society' }]);
    render(
      <MemoryRouter>
        <OperatorServiceSwitcher api={api} currentServiceKey="kpa-society" />
      </MemoryRouter>,
    );
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.queryByTestId('operator-service-switcher')).toBeNull();
  });

  it('kpa-branch(none) 는 이름만 보이고 링크가 없다 (경로 추측 금지)', async () => {
    const api = fakeApi([
      { serviceKey: 'kpa-society', serviceName: 'KPA Society' },
      { serviceKey: 'kpa-branch', serviceName: '분회', workspaceMode: 'none' },
    ]);
    render(
      <MemoryRouter>
        <OperatorServiceSwitcher api={api} currentServiceKey="kpa-society" />
      </MemoryRouter>,
    );
    const bar = await screen.findByTestId('operator-service-switcher');
    expect(within(bar).getByText('분회').tagName).toBe('SPAN');
    expect(within(bar).queryByRole('button', { name: '분회' })).toBeNull();
  });
});
