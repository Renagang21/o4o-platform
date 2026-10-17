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
    expect(labels.filter((t) => /매장 HUB|^내 매장$|Neture 커뮤니티|O4O 약국 경영지원 커뮤니티|주요 업무|내가 이용하는 서비스/.test(t))).toEqual([]);
    expect(within(cards()[0]).getByRole('link', { name: /O4O 공통 커뮤니티/ }).getAttribute('href')).toBe('/community');
  });

  it('삭제 대상 PH 매장을 제외하면 단일 약국 버튼만 표시', () => {
    renderPanel(
      user(),
      data({
        services: [svc('neture', 'Neture'), svc('kpa-society', 'KPA Society'), svc('pharmacy-hub', 'Pharmacy Hub')] as unknown as HomeEntryData['services'],
        stores: [
          { serviceKey: 'kpa-society', organizationId: 'o1', name: '테스트 약국', memberRole: 'owner' },
          { serviceKey: 'pharmacy-hub', organizationId: 'o2', name: '테스트 허브약국', memberRole: 'owner' },
        ],
      }),
    );
    const store = cards()[1];
    expect(within(store).getAllByRole('button').map((b) => b.textContent)).toEqual(['테스트 약국']);
    expect(store.querySelector('ul')).toBeNull();
  });

  it('플랫폼 관리자: 「플랫폼 관리」 별도 섹션 · 서비스 운영 카드에는 섞이지 않음 · 섹션 순서', () => {
    renderPanel(user(['platform:super_admin']), data({ operatorServices: [{ serviceKey: 'kpa-society', serviceName: 'kpa-society', scope: 'operator', workspaceMode: 'standard', workspaceAvailable: true }] }), <section><h2>O4O 서비스 소식</h2></section>);
    expect(headings()).toEqual(['내 업무 공간', '플랫폼 관리', '내 서비스', 'O4O 서비스 소식', '가입 가능한 서비스']);
    const operator = cards()[3];
    expect(within(operator).getAllByRole('button').map((b) => b.textContent)).toEqual(['O4O 약국 경영지원']);
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

it('소속 매장·개인 공급자 자격이 없는 운영자도 각 카드에서 기존 운영 화면으로 진입한다', () => {
  renderPanel(user(['neture:admin', 'supplier:admin']), data({
    stores: [],
    operatorServices: ['neture', 'supplier'].map(serviceKey => ({ serviceKey, serviceName: serviceKey, scope: 'admin', workspaceMode: 'standard', workspaceAvailable: true })),
  }));
  expect(within(cards()[1]).getByRole('link', { name: '내 매장 신청 심사' }).getAttribute('href')).toBe('/operator/pharmacy-memberships');
  expect(within(cards()[2]).getByRole('link', { name: '공급자 관리' }).getAttribute('href')).toBe('/admin/supplier-governance');
  expect(within(cards()[1]).queryByText('이용 중인 항목이 없습니다.')).toBeNull();
  expect(within(cards()[2]).queryByText('이용 중인 항목이 없습니다.')).toBeNull();
  expect(within(cards()[2]).queryByRole('link', { name: '공급자 업무' })).toBeNull();
});

describe('My Home available workspace entries', () => {
  const workspace = (d: HomeEntryData, selected?: string) => render(<MemoryRouter><HomeEntryPanel user={user()} data={d} loading={false} error={null} onReload={() => {}} workspaceOnly storeOrganizationId={selected} /></MemoryRouter>);
  it('compact overview keeps one entry per available role and routes additional work to Services', () => {
    render(<MemoryRouter><HomeEntryPanel user={user()} data={data({
      stores: [
        { serviceKey: 'kpa-society', organizationId: 'o1', name: '첫 번째 매장', memberRole: 'owner' },
        { serviceKey: 'kpa-society', organizationId: 'o2', name: '두 번째 매장', memberRole: 'owner' },
      ],
      serviceStates: { supplier: { status: 'active', source: 'neture_suppliers' } },
      operatorServices: [{ serviceKey: 'kpa-society', serviceName: 'kpa-society', scope: 'operator', workspaceMode: 'standard', workspaceAvailable: true }],
    })} loading={false} error={null} onReload={() => {}} workspaceOnly compactWorkspace /></MemoryRouter>);
    expect(screen.getAllByRole('heading', { level: 3 }).map(h => h.textContent)).toEqual(['커뮤니티', '매장', '공급자', '서비스 운영']);
    expect(screen.getByRole('button', { name: /첫 번째 매장/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /두 번째 매장/ })).toBeNull();
    expect(screen.getByRole('link', { name: '공급자 업무' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /약사 커뮤니티/ })).toBeNull();
    expect(screen.getByRole('link', { name: '참여 서비스와 이용 상태 보기 →' }).getAttribute('href')).toBe('/mypage/services');
  });
  it('shows available community and supplier work, but no empty store/operator cards', () => {
    workspace(data({ stores: [], serviceStates: { supplier: { status: 'active', source: 'neture_suppliers' } } }));
    expect(screen.getByRole('heading', { name: '내 업무 바로가기' })).toBeTruthy();
    expect(screen.getByRole('link', { name: '공급자 업무' }).getAttribute('href')).toBe('/supplier/dashboard');
    expect(screen.queryByRole('heading', { name: '매장', exact: true })).toBeNull();
    expect(screen.queryByRole('heading', { name: '서비스 운영', exact: true })).toBeNull();
  });
  it('retains pending membership information without creating an entry', () => {
    workspace(data({ stores: [], communities: [], services: [svc('lecture', 'Study', 'pending')] as HomeEntryData['services'] }));
    expect(screen.getByText('가입 신청 중')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText(/현재 바로 이동할 수 있는 업무가 없습니다/)).toBeTruthy();
  });
  it('offers only the selected store, excluding other stores and inactive/retired services', () => {
    workspace(data({
      stores: [
        { serviceKey: 'kpa-society', organizationId: 'o1', name: '선택 매장', memberRole: 'owner' },
        { serviceKey: 'kpa-society', organizationId: 'o2', name: '다른 매장', memberRole: 'owner' },
        { serviceKey: 'pharmacy-hub', organizationId: 'o1', name: '은퇴한 서비스 매장', memberRole: 'owner' },
      ],
    }), 'o1');
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.getByRole('button', { name: /선택 매장/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /다른 매장|은퇴한/ })).toBeNull();
    expect(screen.queryByRole('link', { name: 'O4O 공통 커뮤니티' })).toBeNull();
  });
  it('offers the selected Store Workspace entry when workspaceStores is provided', () => {
    workspace(data({
      stores: [],
      workspaceStores: [
        { organizationId: 'o1', organizationName: '선택 매장', memberRole: 'owner' },
        { organizationId: 'o2', organizationName: '다른 매장', memberRole: 'owner' },
      ],
    }), 'o1');
    expect(screen.getByText(/선택 매장/)).toBeTruthy();
    expect(screen.queryByText(/다른 매장/)).toBeNull();
    expect(screen.queryByText(/현재 바로 이동할 수 있는 업무가 없습니다/)).toBeNull();
    expect(screen.getByText(/매장이 여러 곳이면/)).toBeTruthy();
  });
});


describe('대표 홈 가입 서비스 표시', () => {
  const mountServices = (d: HomeEntryData | null, error: string | null = null, loading = false) => render(<MemoryRouter><HomeEntryPanel servicesOnly user={user()} data={d} loading={loading} error={error} onReload={() => {}} /></MemoryRouter>);
  it('가입 서비스와 상태를 구분하고 실제 매장 진입을 보존한다', () => {
    mountServices(data({services:[svc('neture','Neture'),{...svc('lecture','강의'),description:'필요한 강의를 학습합니다.'},svc('kpa-branch','분회','pending')], workspaceStores:[{organizationId:'o1',organizationName:'내 약국',memberRole:'owner'}]}));
    expect(screen.getByRole('heading',{name:'가입한 서비스'})).toBeTruthy();
    expect(screen.getByRole('button',{name:'강의'})).toBeTruthy();
    expect(screen.getByText('필요한 강의를 학습합니다.')).toBeTruthy();
    expect(screen.queryByRole('button',{name:'분회'})).toBeNull();
    expect(screen.getByText(/분회 ·/)).toBeTruthy();
    expect(screen.getByRole('button',{name:'내 약국'})).toBeTruthy();
    expect(screen.queryByRole('heading',{name:'My Home'})).toBeNull();
    expect(screen.queryByRole('link',{name:/Neture/})).toBeNull();
  });
  it('빈 상태와 조회 실패를 구분한다', () => {
    const view=mountServices(data({services:[svc('neture','Neture')],stores:[],workspaceStores:[]}));
    expect(screen.getByText(/현재 이용 중인 서비스가 없습니다/)).toBeTruthy();
    view.unmount(); mountServices(null,'조회에 실패했습니다');
    expect(screen.getByRole('button',{name:'다시 불러오기'})).toBeTruthy();
    expect(screen.queryByText(/현재 이용 중인 서비스가 없습니다/)).toBeNull();
  });
});
