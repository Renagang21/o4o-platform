/**
 * WO-O4O-COMMUNITY-WORKSPACE-CATALOG-AND-ACCESS-ALIGNMENT-V1
 *
 * 대표 홈 「커뮤니티」 진입은 **`GET /communities`(Catalog + 서버 참여 판정)만** 근거로 만든다.
 * Community ≠ Service: 약사 커뮤니티는 KPA/PH 두 surface 를 가진 하나의 Community 이고,
 * 이용 중인 서비스의 surface 로 들어간다. 프런트에서 membership 으로 커뮤니티를 추론하지 않는다.
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('../apiClient', () => ({ api: { get: vi.fn(), post: vi.fn() } }));

import { fetchHomeEntryData, buildHomeEntryModel, type EntryCommunity, type HomeEntryData } from '../home-entry';
import type { User } from '../../contexts/AuthContext';

const svc = (key: string, nameKo: string, status = 'active') => ({
  key, name: key, nameKo, domain: `${key}.example`, basePath: '', description: '', joinEnabled: true,
  membership: status === 'none' ? null : { status },
});
const user = (): User => ({ id: 'u', email: 'u@example.test', name: '회원', roles: ['user'] });

const PHARMACY: EntryCommunity = {
  communityKey: 'pharmacy', name: '약사 커뮤니티', canParticipate: true, reason: null,
  entries: [{ serviceKey: 'kpa-society', path: '/forum' }, { serviceKey: 'pharmacy-hub', path: '/forum' }],
};
const COSMETICS: EntryCommunity = {
  communityKey: 'cosmetics', name: '화장품 커뮤니티', canParticipate: true, reason: null,
  entries: [{ serviceKey: 'k-cosmetics', path: '/forum' }],
};
const GENERAL: EntryCommunity = {
  communityKey: 'o4o-general', name: 'O4O 공통 커뮤니티', canParticipate: true, reason: null,
  entries: [{ serviceKey: 'neture', path: '/community' }],
};

const data = (communities: EntryCommunity[] | undefined, memberships: Record<string, string>): HomeEntryData => ({
  services: [
    svc('neture', 'Neture', memberships.neture ?? 'none'),
    svc('kpa-society', 'KPA Society', memberships['kpa-society'] ?? 'none'),
    svc('pharmacy-hub', '파머시 허브', memberships['pharmacy-hub'] ?? 'none'),
    svc('k-cosmetics', 'K-Cosmetics', memberships['k-cosmetics'] ?? 'none'),
  ] as HomeEntryData['services'],
  stores: [], branches: [],
  serviceStates: { supplier: { status: 'none', source: 'none' } },
  communities,
});
// WO-O4O-HOME-ROLE-WORKSPACE-ENTRY-REALIGNMENT-V1: 4 카드는 항상 있다 — 진입 0개인 카드는 "없음" 으로 본다
const group = (m: ReturnType<typeof buildHomeEntryModel>) => {
  const g = m.groups.find((x) => x.id === 'community');
  return g && g.items.length > 0 ? g : undefined;
};

describe('buildHomeEntryModel — 커뮤니티 = /communities 만', () => {
  it('Scenario B: PH 가입 이력과 무관하게 활성 커뮤니티 진입만 유지한다', () => {
    const m = buildHomeEntryModel(user(), data([PHARMACY, GENERAL, { ...COSMETICS, canParticipate: false, reason: 'SERVICE_MEMBERSHIP_REQUIRED' }], { 'pharmacy-hub': 'active' }));
    const g = group(m)!;
    expect(g.items.map((i) => [i.id, i.label, i.action])).toEqual([
      ['community:pharmacy', '약사 커뮤니티', { kind: 'handoff', serviceKey: 'kpa-society', returnPath: '/forum' }],
      ['community:o4o-general', 'O4O 공통 커뮤니티', { kind: 'internal', to: '/community' }],
    ]);
    expect(g.items.some((i) => i.id === 'community:cosmetics')).toBe(false);
  });

  it('Scenario E: KPA + KCos 회원 → 약사(KPA surface) · O4O 공통 2개 — 운영 종료된 K-Cos 화장품 커뮤니티는 없다 (WO-O4O-KCOSMETICS-RETIREMENT-PHASE1B-STORE-API-ADMIN-V1)', () => {
    const m = buildHomeEntryModel(user(), data([PHARMACY, COSMETICS, GENERAL], { 'kpa-society': 'active', 'k-cosmetics': 'active' }));
    expect(group(m)!.items.map((i) => [i.id, (i.action as any).serviceKey ?? 'neture'])).toEqual([
      ['community:pharmacy', 'kpa-society'],
      ['community:o4o-general', 'neture'],
    ]);
  });

  it('운영 종료 — K-Cos membership 이 active 여도 K-Cos 커뮤니티 · 내 서비스 진입이 없고, 다른 서비스는 그대로다', () => {
    const m = buildHomeEntryModel(user(), data([PHARMACY, COSMETICS], { 'pharmacy-hub': 'active', 'k-cosmetics': 'active' }));
    expect(group(m)!.items.map((i) => i.id)).toEqual(['community:pharmacy']);
    const handoffs = [...m.groups.flatMap((g) => g.items), ...m.myServices]
      .map((i) => i.action as { serviceKey?: string })
      .filter((a) => a.serviceKey === 'k-cosmetics');
    expect(handoffs).toEqual([]);
    expect(m.myServices.map((i) => i.id)).toEqual([]);
  });

  it('운영 종료 서비스 surface 만 빠진다 — 다른 surface 가 남은 Community 는 그 surface 로 들어간다', () => {
    const MIXED: EntryCommunity = { ...PHARMACY, entries: [{ serviceKey: 'k-cosmetics', path: '/forum' }, ...PHARMACY.entries] };
    const m = buildHomeEntryModel(user(), data([MIXED], { 'k-cosmetics': 'active', 'kpa-society': 'active', 'pharmacy-hub': 'active' }));
    expect(group(m)!.items.map((i) => [i.id, i.action, i.note])).toEqual([
      ['community:pharmacy', { kind: 'handoff', serviceKey: 'kpa-society', returnPath: '/forum' }, undefined],
    ]);
  });

  it('Scenario D: 서비스 membership 이 없어도 O4O 공통 커뮤니티는 들어간다 (Neture membership 불요)', () => {
    const m = buildHomeEntryModel(user(), data([
      { ...PHARMACY, canParticipate: false, reason: 'SERVICE_MEMBERSHIP_REQUIRED' },
      { ...COSMETICS, canParticipate: false, reason: 'SERVICE_MEMBERSHIP_REQUIRED' },
      GENERAL,
    ], {}));
    expect(group(m)!.items.map((i) => i.id)).toEqual(['community:o4o-general']);
  });

  it('목록이 비면 커뮤니티 그룹이 없다 — membership 이 있어도 프런트가 추론하지 않는다', () => {
    const m = buildHomeEntryModel(user(), data([], { 'kpa-society': 'active', neture: 'active' }));
    expect(group(m)).toBeUndefined();
    expect(group(buildHomeEntryModel(user(), data(undefined, { 'kpa-society': 'active' })))).toBeUndefined();
  });

  it('KPA + PH 둘 다 가입해도 약사 커뮤니티 진입은 하나다 (Community 데이터 하나)', () => {
    const m = buildHomeEntryModel(user(), data([PHARMACY], { 'kpa-society': 'active', 'pharmacy-hub': 'active' }));
    const items = group(m)!.items.filter((i) => i.id.startsWith('community:pharmacy'));
    expect(items).toHaveLength(1);
    expect(items[0].note).toBeUndefined();
  });
});

describe('사업 참여자 공간은 해당 사업 서비스로 진입한다', () => {
  it('공통 커뮤니티 목록에 섞지 않고 서버 허용된 사업만 내 서비스에서 연결한다', () => {
    const business: EntryCommunity = { communityKey: 'members', businessKey: 'pharmacy', kind: 'semi-franchise',
      name: '약국 협력사업', canParticipate: true, reason: null, entries: [{ serviceKey: 'community', path: '/communities/members/forum' }] };
    const model = buildHomeEntryModel(user(), data([GENERAL, business, { ...business, businessKey: 'blocked', canParticipate: false }], {}));
    expect(model.groups.find(g => g.id === 'community')!.items.map(item => item.id)).toEqual(['community:o4o-general']);
    expect(model.myServices.find(item => item.id === 'business:pharmacy')?.action).toEqual({ kind: 'handoff', serviceKey: 'kpa-society', returnPath: '/businesses/pharmacy/forum' });
    expect(model.myServices.some(item => item.id === 'business:blocked')).toBe(false);
  });
});


describe('현행 workspace 응답과 조회 실패 처리', () => {
  const setupResponses = async (communities: unknown, status?: number) => {
    const { api } = await import('../apiClient');
    vi.mocked(api.get).mockImplementation(async path => {
      if (path === '/communities') {
        if (status) throw { response: { status } };
        return { data: { data: { communities } } } as never;
      }
      if (path === '/neture/home/entry') return { data: { data: { serviceStates: { supplier: { status: 'none', source: 'none' } } } } } as never;
      return { data: { data: { services: [] } } } as never;
    });
  };
  it('allowed 판정을 보존하고 사업 identity와 독립 커뮤니티 진입을 정규화한다', async () => {
    await setupResponses([{ communityKey: 'public', name: '공통', kind: 'independent', allowed: true },
      { communityKey: 'members', name: '사업', kind: 'semi-franchise', businessKey: 'pharmacy', allowed: false }]);
    const result = await fetchHomeEntryData();
    expect(result.communities?.[0]).toMatchObject({ canParticipate: true, entries: [{ serviceKey: 'community', path: '/communities/public/forum' }] });
    expect(result.communities?.[1]).toMatchObject({ canParticipate: false, businessKey: 'pharmacy' });
  });
  it.each([404, 503])('404 배포 간극만 허용하고 %s 오류를 미가입으로 만들지 않는다', async status => {
    await setupResponses([], status);
    if (status === 404) expect((await fetchHomeEntryData()).communities).toEqual([]);
    else await expect(fetchHomeEntryData()).rejects.toMatchObject({ response: { status: 503 } });
  });
});
