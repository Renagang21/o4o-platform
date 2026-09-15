/**
 * WO-O4O-NETURE-MAIN-ACCOUNT-AND-SUPPLIER-PARTNER-SERVICE-SEPARATION-V1
 *
 * 대표 홈 모델이 공급자 · 파트너 업무 진입 · 상태 · 신청 안내를 **서비스별 이용 상태**로만
 * 판정한다는 계약. role 문자열 · Neture 회원 active 만으로 업무 버튼을 만들지 않는다.
 */
import { describe, it, expect, vi } from 'vitest';

// apiClient 는 워크스페이스 패키지 체인을 끌어온다 — 모델 계산만 검증하므로 mock (기존 back-navigation 테스트와 동일)
vi.mock('../apiClient', () => ({ api: { get: vi.fn(), post: vi.fn() } }));

import { buildHomeEntryModel, type HomeEntryData, type NetureServiceStates } from '../home-entry';
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
    partner: { status: 'none', source: 'none' },
    ...serviceStates,
  },
});

const groupIds = (m: ReturnType<typeof buildHomeEntryModel>) => m.groups.map((g) => g.id);

describe('buildHomeEntryModel — 공급자 · 파트너 서비스 상태', () => {
  it('일반 O4O 회원(둘 다 none): 업무 없음 · 상태 없음 · 두 서비스 신청 안내', () => {
    const m = buildHomeEntryModel(user(['user']), data({}));
    expect(groupIds(m)).not.toContain('supplier');
    expect(groupIds(m)).not.toContain('partner');
    expect(m.statusItems).toHaveLength(0);
    expect(m.joinable.map((j) => j.id)).toEqual(['join:neture-supplier', 'join:neture-partner']);
    expect(m.joinable[0].action).toEqual({ kind: 'internal', to: '/supplier' });
  });

  it('공급자 role 이 있어도 서비스 상태가 none 이면 업무 버튼을 만들지 않는다', () => {
    const m = buildHomeEntryModel(user(['supplier', 'neture:supplier']), data({}));
    expect(groupIds(m)).not.toContain('supplier');
  });

  it('공급자만 active: 공급자 업무 + 내가 이용하는 서비스, 파트너는 신청 안내', () => {
    const m = buildHomeEntryModel(user(['supplier']), data({ supplier: { status: 'active', source: 'neture_suppliers' } }));
    expect(groupIds(m)).toContain('supplier');
    expect(groupIds(m)).not.toContain('partner');
    expect(m.myServices.map((s) => s.id)).toContain('svc:neture-supplier');
    expect(m.joinable.map((j) => j.id)).toEqual(['join:neture-partner']);
  });

  it('파트너만 active: 파트너 업무만', () => {
    const m = buildHomeEntryModel(user(['partner']), data({ partner: { status: 'active', source: 'neture_partners' } }));
    expect(groupIds(m)).toContain('partner');
    expect(groupIds(m)).not.toContain('supplier');
  });

  it('둘 다 active: 둘 다 업무 + 신청 안내 없음', () => {
    const m = buildHomeEntryModel(
      user(['supplier', 'partner']),
      data({ supplier: { status: 'active', source: 'neture_suppliers' }, partner: { status: 'active', source: 'neture_partners' } }),
    );
    expect(groupIds(m)).toEqual(expect.arrayContaining(['supplier', 'partner']));
    expect(m.joinable.filter((j) => j.id.startsWith('join:neture-'))).toHaveLength(0);
  });

  it('공급자 정지 + 파트너 active: 공급자는 상태 항목만, 파트너 업무는 유지', () => {
    const m = buildHomeEntryModel(
      user(['supplier', 'partner']),
      data({ supplier: { status: 'suspended', source: 'neture_suppliers' }, partner: { status: 'active', source: 'neture_partners' } }),
    );
    expect(groupIds(m)).not.toContain('supplier');
    expect(groupIds(m)).toContain('partner');
    const s = m.statusItems.find((x) => x.id === 'status:neture-supplier');
    expect(s?.statusLabel).toBe('이용 정지');
    expect(s?.guide?.href).toBe('/supplier');
  });

  it('신청 중 · 반려 는 상태 항목 + 안내 링크(업무 버튼 없음)', () => {
    const m = buildHomeEntryModel(
      user(['user']),
      data({ supplier: { status: 'pending', source: 'service_memberships' }, partner: { status: 'rejected', source: 'neture_partners' } }),
    );
    expect(groupIds(m)).not.toContain('supplier');
    expect(groupIds(m)).not.toContain('partner');
    expect(m.statusItems.map((x) => [x.id, x.statusLabel, x.guide?.label])).toEqual([
      ['status:neture-supplier', '신청 중', '신청 상태 보기'],
      ['status:neture-partner', '신청 반려', '다시 신청하기'],
    ]);
    expect(m.joinable.filter((j) => j.id.startsWith('join:neture-'))).toHaveLength(0);
  });

  it('관리자는 서비스 상태와 무관하게 업무 진입 가능(운영 목적)', () => {
    const m = buildHomeEntryModel(user(['neture:admin']), data({}));
    expect(groupIds(m)).toEqual(expect.arrayContaining(['supplier', 'partner']));
  });
});
