/**
 * WO-O4O-SERVICE-OPERATOR-WORKSPACE-REALIGNMENT-V1
 *
 * 대표 홈 "서비스 운영자 화면" 진입은 **`GET /work-scope/operator-services` 목록만** 근거로 만든다.
 * role 문자열을 프런트에서 파싱해 서비스를 추측하지 않는다 — 목록에 없는 서비스는 role 이 있어도 진입이 없다.
 * 1개면 바로 진입(버튼 1개), 여러 개면 선택(버튼 N개). platform:super_admin 은 Neture 관리자 진입(별도).
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

const operatorGroup = (m: ReturnType<typeof buildHomeEntryModel>) => m.groups.find((g) => g.id === 'operator');

describe('buildHomeEntryModel — 서비스 운영자 화면 = operator-services 만', () => {
  it('합성 Operator X: KPA + K-Cos 2건 → 두 진입(선택) · PH 없음', () => {
    const m = buildHomeEntryModel(user(['kpa:operator', 'cosmetics:operator', 'pharmacy-hub:operator']), data([op('kpa-society'), op('k-cosmetics')]));
    const g = operatorGroup(m)!;
    expect(g.items.map((i) => i.id)).toEqual(['operator:kpa-society:operator', 'operator:k-cosmetics:operator']);
    expect(g.items.map((i) => i.action)).toEqual([
      { kind: 'handoff', serviceKey: 'kpa-society', returnPath: '/operator' },
      { kind: 'handoff', serviceKey: 'k-cosmetics', returnPath: '/operator' },
    ]);
    expect(g.items.map((i) => i.label)).toEqual(['KPA Society 운영자', 'K-Cosmetics 운영자']);
    // role 만 있고 목록에 없는 PH 는 진입이 없다 (누출 0)
    expect(g.items.some((i) => i.id.includes('pharmacy-hub'))).toBe(false);
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

  it('platform:super_admin 은 Neture 관리자 진입 + 목록의 다른 서비스 (Neture 중복 없음)', () => {
    const m = buildHomeEntryModel(user(['platform:super_admin']), data([op('neture', 'admin', 'special'), op('kpa-society')]));
    const g = operatorGroup(m)!;
    expect(g.items.map((i) => i.id)).toEqual(['operator:platform', 'operator:kpa-society:operator']);
  });
});
