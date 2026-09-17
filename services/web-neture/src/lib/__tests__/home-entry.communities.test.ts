/**
 * WO-O4O-COMMUNITY-WORKSPACE-CATALOG-AND-ACCESS-ALIGNMENT-V1
 *
 * 대표 홈 「커뮤니티」 진입은 **`GET /communities`(Catalog + 서버 참여 판정)만** 근거로 만든다.
 * Community ≠ Service: 약사 커뮤니티는 KPA/PH 두 surface 를 가진 하나의 Community 이고,
 * 이용 중인 서비스의 surface 로 들어간다. 프런트에서 membership 으로 커뮤니티를 추론하지 않는다.
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('../apiClient', () => ({ api: { get: vi.fn(), post: vi.fn() } }));

import { buildHomeEntryModel, type EntryCommunity, type HomeEntryData } from '../home-entry';
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
  it('Scenario B: PH 만 가입한 회원 → 약사 커뮤니티는 PH surface 로, KPA membership 을 만들지 않는다', () => {
    const m = buildHomeEntryModel(user(), data([PHARMACY, GENERAL, { ...COSMETICS, canParticipate: false, reason: 'SERVICE_MEMBERSHIP_REQUIRED' }], { 'pharmacy-hub': 'active' }));
    const g = group(m)!;
    expect(g.items.map((i) => [i.id, i.label, i.action])).toEqual([
      ['community:pharmacy', '약사 커뮤니티', { kind: 'handoff', serviceKey: 'pharmacy-hub', returnPath: '/forum' }],
      ['community:o4o-general', 'O4O 공통 커뮤니티', { kind: 'internal', to: '/community' }],
    ]);
    expect(g.items.some((i) => i.id === 'community:cosmetics')).toBe(false);
  });

  it('Scenario E: KPA + KCos 회원 → 약사(KPA surface) · 화장품 · O4O 공통 3개', () => {
    const m = buildHomeEntryModel(user(), data([PHARMACY, COSMETICS, GENERAL], { 'kpa-society': 'active', 'k-cosmetics': 'active' }));
    expect(group(m)!.items.map((i) => [i.id, (i.action as any).serviceKey ?? 'neture'])).toEqual([
      ['community:pharmacy', 'kpa-society'],
      ['community:cosmetics', 'k-cosmetics'],
      ['community:o4o-general', 'neture'],
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
    expect(items[0].note).toBe('KPA Society에서 참여');
  });
});
