/**
 * WO-O4O-SERVICE-OPERATOR-WORKSPACE-REALIGNMENT-V1
 *
 * 대표 홈 "서비스 운영자 화면" 진입은 **`GET /work-scope/operator-services` 목록만** 근거로 만든다.
 * role 문자열을 프런트에서 파싱해 서비스를 추측하지 않는다 — 목록에 없는 서비스는 role 이 있어도 진입이 없다.
 * 1개면 바로 진입(버튼 1개), 여러 개면 선택(버튼 N개).
 * WO-O4O-HOME-ROLE-WORKSPACE-ENTRY-REALIGNMENT-V1: 카드 제목 "서비스 운영" · 버튼 라벨 = 서비스 이름(admin scope 는 "관리자" 보조).
 * platform:super_admin 은 이 카드가 아니라 `platformAdmin`("플랫폼 관리") — Platform Admin ≠ Service Operator.
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('../apiClient', () => ({ api: { get: vi.fn(), post: vi.fn() } }));

import { buildHomeEntryModel, type EntryOperatorService, type HomeEntryData } from '../home-entry';
import type { User } from '../../contexts/AuthContext';

const svc = (key: string, nameKo: string, domain: string) => ({
  key,
  name: key,
  nameKo,
  domain,
  basePath: '',
  description: '',
  joinEnabled: true,
  membership: { status: 'active' },
});

const user = (roles: string[]): User => ({ id: 'x', email: 'x@example.test', name: '운영자 X', roles });

const data = (operatorServices: EntryOperatorService[] | undefined, branches: HomeEntryData['branches'] = []): HomeEntryData => ({
  services: [
    svc('neture', 'Neture', 'neture.co.kr'),
    svc('kpa-society', 'KPA Society', 'kpa-society.example'),
    svc('k-cosmetics', 'K-Cosmetics', 'k-cosmetics.example'),
    svc('pharmacy-hub', 'Pharmacy Hub', 'pharmacy-hub.example'),
  ] as HomeEntryData['services'],
  stores: [],
  branches,
  serviceStates: { supplier: { status: 'none', source: 'none' } },
  operatorServices,
});

const op = (serviceKey: string, scope: 'admin' | 'operator' = 'operator', workspaceMode: EntryOperatorService['workspaceMode'] = 'standard', workspaceAvailable = true): EntryOperatorService => ({
  serviceKey,
  serviceName: serviceKey,
  scope,
  workspaceMode,
  workspaceAvailable,
});

// 4 카드는 항상 있다 — "그룹 없음" 은 진입 0개로 본다
const operatorGroup = (m: ReturnType<typeof buildHomeEntryModel>) => {
  const g = m.groups.find((x) => x.id === 'operator');
  return g && g.items.length > 0 ? g : undefined;
};

describe('buildHomeEntryModel — 서비스 운영 카드 = operator-services 만', () => {
  it('합성 Operator X: KPA + PH 2건 → 두 진입(선택) · 목록에 없는 K-Cos 는 role 이 있어도 없음', () => {
    const m = buildHomeEntryModel(user(['kpa:operator', 'cosmetics:operator', 'pharmacy-hub:operator']), data([op('kpa-society'), op('pharmacy-hub')]));
    const g = operatorGroup(m)!;
    expect(g.items.map((i) => i.id)).toEqual(['operator:kpa-society:operator', 'operator:pharmacy-hub:operator']);
    expect(g.items.map((i) => i.action)).toEqual([
      { kind: 'handoff', serviceKey: 'kpa-society', returnPath: '/operator' },
      { kind: 'handoff', serviceKey: 'pharmacy-hub', returnPath: '/operator' },
    ]);
    expect(g.title).toBe('서비스 운영');
    expect(g.items.map((i) => [i.label, i.note])).toEqual([['KPA Society', undefined], ['Pharmacy Hub', undefined]]);
    // role 만 있고 목록에 없는 K-Cos 는 진입이 없다 (누출 0)
    expect(g.items.some((i) => i.id.includes('k-cosmetics'))).toBe(false);
  });

  it('운영 종료된 K-Cosmetics 는 목록에 있어도(workspaceAvailable 무관) 운영자 진입을 만들지 않는다 — WO-O4O-KCOSMETICS-RETIREMENT-PHASE1B-STORE-API-ADMIN-V1', () => {
    for (const available of [false, true]) {
      const m = buildHomeEntryModel(user(['kpa:operator', 'cosmetics:operator']), data([op('kpa-society'), op('k-cosmetics', 'operator', 'standard', available)]));
      expect(operatorGroup(m)!.items.map((i) => i.id)).toEqual(['operator:kpa-society:operator']);
    }
  });

  it('1건이면 바로 진입 버튼 1개', () => {
    const m = buildHomeEntryModel(user(['kpa:operator']), data([op('kpa-society')]));
    expect(operatorGroup(m)!.items).toHaveLength(1);
  });

  it('role 이 있어도 operator-services 가 비어 있으면 운영자 그룹이 없다 (프런트 role 파싱 없음)', () => {
    const m = buildHomeEntryModel(user(['kpa:operator', 'cosmetics:admin', 'neture:operator']), data([]));
    expect(operatorGroup(m)).toBeUndefined();
    const m2 = buildHomeEntryModel(user(['kpa:operator']), data(undefined));
    expect(operatorGroup(m2)).toBeUndefined();
  });

  it('admin scope 는 관리자 경로(/admin) · Neture 는 내부 링크', () => {
    const m = buildHomeEntryModel(user([]), data([op('neture', 'operator', 'special'), op('kpa-society', 'admin')]));
    const g = operatorGroup(m)!;
    expect(g.items.map((i) => [i.id, i.action])).toEqual([
      ['operator:neture', { kind: 'internal', to: '/operator' }],
      ['operator:kpa-society:admin', { kind: 'handoff', serviceKey: 'kpa-society', returnPath: '/admin' }],
    ]);
    expect(g.items.map((i) => [i.label, i.note])).toEqual([['Neture', undefined], ['KPA Society', '관리자']]);
    expect(m.platformAdmin).toBeNull();
  });

  it('workspaceAvailable=false(undecided) 는 진입을 만들지 않고, kpa-branch 는 내 분회 slug 가 있을 때만', () => {
    const m = buildHomeEntryModel(
      user([]),
      data([op('cafe24-b2b', 'operator', 'undecided', false), op('kpa-branch', 'operator', 'none')], [
        { organizationId: 'b1', slug: 'seoul', name: '서울분회' },
        { organizationId: 'b2', slug: null, name: 'slug 없음' },
      ]),
    );
    const g = operatorGroup(m)!;
    expect(g.items.map((i) => [i.id, i.action])).toEqual([
      ['operator:kpa-branch:b1', { kind: 'handoff', serviceKey: 'kpa-branch', returnPath: '/seoul/operator/site' }],
    ]);
  });

  it('platform:super_admin 은 "플랫폼 관리" 로 분리 — 서비스 운영 카드에는 operator-services 목록만', () => {
    const m = buildHomeEntryModel(user(['platform:super_admin']), data([op('neture', 'admin', 'special'), op('kpa-society')]));
    expect(m.platformAdmin).toEqual({ id: 'platform:admin', label: '플랫폼 관리', action: { kind: 'internal', to: '/admin' } });
    const g = operatorGroup(m)!;
    // 목록에 neture:admin 이 있으면 그것은 Service Operator(Neture) 자격 — 카드에 그대로 남는다
    expect(g.items.map((i) => i.id)).toEqual(['operator:neture', 'operator:kpa-society:operator']);
    expect(g.items.some((i) => i.id === 'operator:platform' || /관리자$/.test(i.label))).toBe(false);
  });

  it('platform:super_admin 만 있고 operator-services 가 비면: 플랫폼 관리만 · 서비스 운영 카드 진입 0', () => {
    const m = buildHomeEntryModel(user(['platform:super_admin']), data([]));
    expect(m.platformAdmin?.label).toBe('플랫폼 관리');
    expect(operatorGroup(m)).toBeUndefined();
  });

  it('kpa-branch 운영자 버튼 = 분회 이름 · 보조 정보 = 서비스 이름', () => {
    const m = buildHomeEntryModel(user([]), data([op('kpa-branch', 'operator', 'none')], [{ organizationId: 'b1', slug: 'seoul', name: '서울분회' }]));
    expect(operatorGroup(m)!.items.map((i) => [i.label, i.note])).toEqual([['서울분회', 'kpa-branch']]);
  });
});

// WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 — 서브도메인 운영자 화면은 이 앱 안(내부 이동)이다.
describe('buildHomeEntryModel — supplier · funding · community 운영 카드', () => {
  it('supplier admin → 공급자 상태 관리 (내부 이동)', () => {
    const m = buildHomeEntryModel(user(['supplier:admin']), data([op('supplier', 'admin', 'none')]));
    expect(operatorGroup(m)!.items.map((i) => [i.id, i.action])).toEqual([
      ['operator:supplier:admin', { kind: 'internal', to: '/admin/supplier-governance' }],
    ]);
  });

  // WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 (잔여 gap): 승인 콘솔(/operator/suppliers)이
  // supplier:operator 축으로 정렬되면서 이 scope 도 들어갈 화면이 생겼다 — 카드가 있어야 한다.
  it('supplier operator → 공급자 승인 콘솔 (내부 이동)', () => {
    const m = buildHomeEntryModel(user(['supplier:operator']), data([op('supplier', 'operator', 'none')]));
    expect(operatorGroup(m)!.items.map((i) => [i.id, i.action])).toEqual([
      ['operator:supplier:operator', { kind: 'internal', to: '/operator/suppliers' }],
    ]);
  });

  it('funding admin · operator → 펀딩 운영 화면 (내부 이동)', () => {
    for (const scope of ['admin', 'operator'] as const) {
      const m = buildHomeEntryModel(user([`funding:${scope}`]), data([op('funding', scope, 'none')]));
      expect(operatorGroup(m)!.items.map((i) => i.action)).toEqual([{ kind: 'internal', to: '/operator/market-trial' }]);
    }
  });

  it('community admin → 커뮤니티 서비스 관리 (개설 심사 · 커뮤니티 운영자 지정, 내부 이동)', () => {
    const m = buildHomeEntryModel(user(['community:admin']), data([op('community', 'admin', 'none')]));
    expect(operatorGroup(m)!.items.map((i) => [i.id, i.action])).toEqual([
      ['operator:community:admin', { kind: 'internal', to: '/admin/communities' }],
    ]);
  });
});
