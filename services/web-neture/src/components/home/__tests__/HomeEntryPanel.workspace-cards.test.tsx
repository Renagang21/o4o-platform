/**
 * WO-O4O-HOME-ROLE-WORKSPACE-ENTRY-REALIGNMENT-V1 — 대표 홈 개인화 영역 표현 계약
 *
 * - 「내 업무 공간」 = 4 카드(커뮤니티 · 매장 · 공급자 · 서비스 운영) 항상 · 같은 순서
 * - 카드 = 제목 / 짧은 설명 / 실제 사용 가능한 진입 버튼만 (없으면 "이용 중인 항목이 없습니다.")
 * - 「매장 HUB」 · 서비스별 「내 매장」 최상위 그룹 0 · "Neture 커뮤니티" 라벨 0
 * - 「플랫폼 관리」 는 카드 밖 별도 섹션 (해당 사용자만)
 * - 섹션 순서: 내 업무 공간 → (플랫폼 관리) → 내 서비스 → O4O 서비스 소식 → 가입 · 이용 상태 → 가입 가능한 서비스
 *
 * 실행: 저장소 루트에서 `npx vitest run --config services/web-neture/vitest.config.mjs`
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../../lib/apiClient', () => ({
  api: { get: vi.fn(), post: vi.fn() },
  API_BASE_URL: 'https://api.neture.co.kr',
}));

import HomeEntryPanel from '../HomeEntryPanel';
import type { HomeEntryData } from '../../../lib/home-entry';
import type { User } from '../../../contexts/AuthContext';

afterEach(cleanup);

const svc = (key: string, nameKo: string, status: string | null = 'active') =>
  ({ key, name: key, nameKo, domain: `${key}.example`, basePath: '', description: '', joinEnabled: true, membership: status ? { status } : null });

const data = (over: Partial<HomeEntryData> = {}): HomeEntryData =>
  ({
    services: [svc('neture', 'Neture'), svc('kpa-society', 'KPA Society'), svc('k-cosmetics', 'K-Cosmetics', null)],
    stores: [{ serviceKey: 'kpa-society', organizationId: 'o1', name: '테스트 약국', memberRole: 'owner' }],
    branches: [],
    serviceStates: { supplier: { status: 'none', source: 'none' } },
    operatorServices: [],
    communities: [
      { communityKey: 'o4o-general', name: 'O4O 공통 커뮤니티', canParticipate: true, reason: null, entries: [{ serviceKey: 'neture', path: '/community' }] },
      { communityKey: 'pharmacy', name: '약사 커뮤니티', canParticipate: true, reason: null, entries: [{ serviceKey: 'kpa-society', path: '/forum' }] },
    ],
    ...over,
  }) as unknown as HomeEntryData;

const user = (roles: string[] = ['user']): User => ({ id: 'u', email: 'u@example.test', name: '사용자', roles });

function renderPanel(u: User, d: HomeEntryData, news?: React.ReactNode) {
  return render(
    <MemoryRouter>
      <HomeEntryPanel user={u} data={d} loading={false} error={null} onReload={() => {}} newsSlot={news} />
    </MemoryRouter>,
  );
}

const headings = () => screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
const cards = () => Array.from(document.querySelectorAll<HTMLElement>('[data-workspace]'));

describe('HomeEntryPanel — 내 업무 공간 4 카드', () => {
  it('매장 경영자: 4 카드 고정 · 매장 버튼 = 매장 이름 · 매장 HUB / 내 매장 / Neture 커뮤니티 문구 0', () => {
    renderPanel(user(['kpa:store_owner']), data());
    expect(headings()).toEqual(['내 업무 공간', '내 서비스', '가입 가능한 서비스']);
    expect(cards().map((c) => c.dataset.workspace)).toEqual(['community', 'store', 'supplier', 'operator']);
    expect(cards().map((c) => within(c).getByRole('heading', { level: 3 }).textContent)).toEqual(['커뮤니티', '매장', '공급자', '서비스 운영']);

    const store = cards()[1];
    expect(within(store).getAllByRole('button').map((b) => b.textContent)).toEqual(['테스트 약국']);
    expect(within(cards()[2]).queryAllByRole('button')).toHaveLength(0);
    expect(within(cards()[2]).getByText('이용 중인 항목이 없습니다.')).toBeTruthy();

    // 최상위 그룹 제목(h2/h3) · 진입 버튼/링크 라벨에 "매장 HUB" · "내 매장" · "Neture 커뮤니티" 가 없다
    // (카드 설명문 "내 매장을 운영합니다" 는 그룹이 아니다)
    const labels = [
      ...screen.getAllByRole('heading').map((h) => h.textContent ?? ''),
      ...screen.getAllByRole('button').map((b) => b.textContent ?? ''),
      ...screen.getAllByRole('link').map((l) => l.textContent ?? ''),
    ];
    expect(labels.filter((t) => /매장 HUB|^내 매장$|Neture 커뮤니티|KPA Society 커뮤니티|주요 업무|내가 이용하는 서비스/.test(t))).toEqual([]);
    expect(within(cards()[0]).getByRole('link', { name: /O4O 공통 커뮤니티/ }).getAttribute('href')).toBe('/community');
  });

  it('복수 매장이면 버튼 안 보조 정보로 서비스 이름 · 반복 note 목록 없음', () => {
    renderPanel(
      user(),
      data({
        services: [svc('neture', 'Neture'), svc('kpa-society', 'KPA Society'), svc('k-cosmetics', 'K-Cosmetics')] as unknown as HomeEntryData['services'],
        stores: [
          { serviceKey: 'kpa-society', organizationId: 'o1', name: '테스트 약국', memberRole: 'owner' },
          { serviceKey: 'k-cosmetics', organizationId: 'o2', name: '테스트 뷰티샵', memberRole: 'owner' },
        ],
      }),
    );
    const store = cards()[1];
    expect(within(store).getAllByRole('button').map((b) => b.textContent)).toEqual(['테스트 약국KPA Society', '테스트 뷰티샵K-Cosmetics']);
    expect(store.querySelector('ul')).toBeNull();
  });

  it('플랫폼 관리자: 「플랫폼 관리」 별도 섹션 · 서비스 운영 카드에는 섞이지 않음 · 섹션 순서', () => {
    renderPanel(user(['platform:super_admin']), data({ operatorServices: [{ serviceKey: 'kpa-society', serviceName: 'kpa-society', scope: 'operator', workspaceMode: 'standard', workspaceAvailable: true }] }), <section><h2>O4O 서비스 소식</h2></section>);
    expect(headings()).toEqual(['내 업무 공간', '플랫폼 관리', '내 서비스', 'O4O 서비스 소식', '가입 가능한 서비스']);
    const operator = cards()[3];
    expect(within(operator).getAllByRole('button').map((b) => b.textContent)).toEqual(['KPA Society']);
    expect(within(operator).queryByText(/관리자/)).toBeNull();
    const platform = screen.getByRole('heading', { level: 2, name: '플랫폼 관리' }).parentElement!;
    expect(within(platform).getByRole('link', { name: /플랫폼 관리/ }).getAttribute('href')).toBe('/admin');
  });

  it('공급자(active): 공급자 카드 「공급자 업무」 → /supplier/dashboard · 내 서비스에는 「공급자 서비스」 (업무 공간 중복 없음)', () => {
    renderPanel(user(['neture:supplier']), data({ stores: [], serviceStates: { supplier: { status: 'active', source: 'neture_suppliers' } } }));
    expect(within(cards()[2]).getByRole('link', { name: /공급자 업무/ }).getAttribute('href')).toBe('/supplier/dashboard');
    const my = screen.getByRole('heading', { level: 2, name: '내 서비스' }).parentElement!;
    expect(within(my).getByRole('link', { name: /공급자 서비스/ })).toBeTruthy();
    expect(within(my).queryByRole('link', { name: /공급자 업무/ })).toBeNull();
  });
});
