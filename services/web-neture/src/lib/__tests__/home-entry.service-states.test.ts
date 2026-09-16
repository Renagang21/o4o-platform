/**
 * WO-O4O-NETURE-MAIN-ACCOUNT-AND-SUPPLIER-PARTNER-SERVICE-SEPARATION-V1
 * WO-O4O-LEGACY-PARTNER-RUNTIME-RETIREMENT-AND-SELLER-RECRUITMENT-EXTRACTION-V1: partner 축 은퇴
 *
 * 대표 홈 모델이 공급자 업무 진입 · 상태 · 신청 안내를 **서비스 이용 상태**로만
 * 판정한다는 계약. role 문자열 · Neture 회원 active 만으로 업무 버튼을 만들지 않는다.
 * Legacy Partner 진입(EntryGroup 'partner' · join:neture-partner · status:neture-partner)은 존재하지 않는다.
 */
import { describe, it, expect, vi } from 'vitest';

// apiClient 는 워크스페이스 패키지 체인을 끌어온다 — 모델 계산만 검증하므로 mock (기존 back-navigation 테스트와 동일)
vi.mock('../apiClient', () => ({ api: { get: vi.fn(), post: vi.fn() } }));

import { buildHomeEntryModel, normalizeServiceStates, type HomeEntryData, type NetureServiceStates } from '../home-entry';
import type { User } from '../../contexts/AuthContext';

const neture = {
  key: 'neture',
  name: 'neture',
  nameKo: 'Neture',
  domain: 'neture.co.kr',
  basePath: '',
  description: '',
  joinEnabled: true,
  membership: { status: 'active' },
};

const user = (roles: string[]): User => ({ id: 'u1', email: 'u1@example.test', name: '회원', roles });

const data = (serviceStates: Partial<NetureServiceStates>): HomeEntryData => ({
  services: [neture] as HomeEntryData['services'],
  stores: [],
  branches: [],
  serviceStates: {
    supplier: { status: 'none', source: 'none' },
    ...serviceStates,
  },
});

const groupIds = (m: ReturnType<typeof buildHomeEntryModel>) => m.groups.map((g) => g.id);
const allIds = (m: ReturnType<typeof buildHomeEntryModel>) => [
  ...groupIds(m),
  ...m.groups.flatMap((g) => g.items.map((i) => i.id)),
  ...m.myServices.map((s) => s.id),
  ...m.statusItems.map((s) => s.id),
  ...m.joinable.map((j) => j.id),
];

describe('buildHomeEntryModel — 공급자 서비스 상태', () => {
  it('일반 O4O 회원(none): 업무 없음 · 상태 없음 · 공급자 서비스 신청 안내만', () => {
    const m = buildHomeEntryModel(user(['user']), data({}));
    expect(groupIds(m)).not.toContain('supplier');
    expect(m.statusItems).toHaveLength(0);
    expect(m.joinable.map((j) => j.id)).toEqual(['join:neture-supplier']);
    expect(m.joinable[0].action).toEqual({ kind: 'internal', to: '/supplier' });
  });

  it('Legacy Partner 진입은 어떤 상태·역할에서도 만들어지지 않는다', () => {
    const m = buildHomeEntryModel(user(['partner', 'neture:partner', 'neture:admin']), data({ supplier: { status: 'active', source: 'neture_suppliers' } }));
    expect(allIds(m).some((id) => id.includes('partner'))).toBe(false);
  });

  it('공급자 role 이 있어도 서비스 상태가 none 이면 업무 버튼을 만들지 않는다', () => {
    const m = buildHomeEntryModel(user(['supplier', 'neture:supplier']), data({}));
    expect(groupIds(m)).not.toContain('supplier');
  });

  it('공급자 active: 공급자 업무 + 내가 이용하는 서비스 · 신청 안내 없음', () => {
    const m = buildHomeEntryModel(user(['supplier']), data({ supplier: { status: 'active', source: 'neture_suppliers' } }));
    expect(groupIds(m)).toContain('supplier');
    expect(m.myServices.map((s) => s.id)).toContain('svc:neture-supplier');
    expect(m.joinable.filter((j) => j.id.startsWith('join:neture-'))).toHaveLength(0);
  });

  it('공급자 정지: 상태 항목만(업무 버튼 없음)', () => {
    const m = buildHomeEntryModel(user(['supplier']), data({ supplier: { status: 'suspended', source: 'neture_suppliers' } }));
    expect(groupIds(m)).not.toContain('supplier');
    const s = m.statusItems.find((x) => x.id === 'status:neture-supplier');
    expect(s?.statusLabel).toBe('이용 정지');
    expect(s?.guide?.href).toBe('/supplier');
  });

  it('신청 중 은 상태 항목 + 안내 링크(업무 버튼 없음)', () => {
    const m = buildHomeEntryModel(user(['user']), data({ supplier: { status: 'pending', source: 'service_memberships' } }));
    expect(groupIds(m)).not.toContain('supplier');
    expect(m.statusItems.map((x) => [x.id, x.statusLabel, x.guide?.label])).toEqual([
      ['status:neture-supplier', '신청 중', '신청 상태 보기'],
    ]);
    expect(m.joinable.filter((j) => j.id.startsWith('join:neture-'))).toHaveLength(0);
  });

  it('관리자는 서비스 상태와 무관하게 업무 진입 가능(운영 목적)', () => {
    const m = buildHomeEntryModel(user(['neture:admin']), data({}));
    expect(groupIds(m)).toContain('supplier');
  });

  it('normalizeServiceStates 는 서버가 partner 를 보내도 무시한다 (응답 계약 = supplier 뿐)', () => {
    const s = normalizeServiceStates({ supplier: { status: 'active', source: 'neture_suppliers' }, partner: { status: 'active', source: 'x' } });
    expect(s).toEqual({ supplier: { status: 'active', source: 'neture_suppliers' } });
  });
});

// WO-O4O-STORE-WORKSPACE-INTEGRATION-AND-MY-SERVICES-V1 §18 — 대표 홈 "내 매장" 진입 = Store Workspace Home
describe('buildHomeEntryModel — 매장 진입 = Store Workspace Home', () => {
  const svc = (key: string, nameKo: string, domain: string) => ({
    ...neture,
    key,
    name: key,
    nameKo,
    domain,
  });
  const storeData = (): HomeEntryData => ({
    services: [
      neture,
      svc('kpa-society', 'KPA Society', 'kpa-society.example'),
      svc('k-cosmetics', 'K-Cosmetics', 'k-cosmetics.example'),
      svc('pharmacy-hub', 'Pharmacy Hub', 'pharmacy-hub.example'),
    ] as HomeEntryData['services'],
    stores: [
      { serviceKey: 'kpa-society', organizationId: 'org-a', name: '매장 A', memberRole: 'owner' },
      { serviceKey: 'k-cosmetics', organizationId: 'org-a', name: '매장 A', memberRole: 'owner' },
      { serviceKey: 'pharmacy-hub', organizationId: 'org-a', name: '매장 A', memberRole: 'owner' },
    ],
    branches: [],
    serviceStates: { supplier: { status: 'none', source: 'none' } },
  });

  it('내 매장 returnPath = <basePath>/workspace (KPA·KCos /store, PH /store-owner) · 매장 HUB = /store-hub', () => {
    const m = buildHomeEntryModel(user(['user']), storeData());
    const myStore = m.groups.find((g) => g.id === 'my-store')!;
    const byKey = Object.fromEntries(myStore.items.map((i) => [i.action.kind === 'handoff' ? i.action.serviceKey : '', i.action]));
    expect(byKey['kpa-society']).toMatchObject({ kind: 'handoff', returnPath: '/store/workspace' });
    expect(byKey['k-cosmetics']).toMatchObject({ kind: 'handoff', returnPath: '/store/workspace' });
    expect(byKey['pharmacy-hub']).toMatchObject({ kind: 'handoff', returnPath: '/store-owner/workspace' });
    const hub = m.groups.find((g) => g.id === 'store-hub')!;
    expect(hub.items.every((i) => i.action.kind === 'handoff' && i.action.returnPath === '/store-hub')).toBe(true);
  });
});
