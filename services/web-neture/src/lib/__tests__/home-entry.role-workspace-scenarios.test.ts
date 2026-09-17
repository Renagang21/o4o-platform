/**
 * WO-O4O-HOME-ROLE-WORKSPACE-ENTRY-REALIGNMENT-V1 — 대표 홈 "내 업무 공간" 시나리오 계약
 *
 * 4대 Role Workspace 카드(커뮤니티 · 매장 · 공급자 · 서비스 운영)는 **항상 4개 · 같은 순서** 이고,
 * 사용자별로 달라지는 것은 카드 안의 진입 버튼뿐이다. Platform Admin 은 카드 밖(`platformAdmin`).
 *
 * 데이터 출처 (모두 기존 API · 새 권한 모델 없음):
 *   커뮤니티 = GET /communities · 매장 = GET /neture/home/entry stores · 공급자 = serviceStates.supplier
 *   서비스 운영 = GET /work-scope/operator-services · 내 서비스 = GET /auth/services
 *
 * 실행: 저장소 루트에서 `npx vitest run --config services/web-neture/vitest.config.mjs`
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('../apiClient', () => ({ api: { get: vi.fn(), post: vi.fn() } }));

import { buildHomeEntryModel, WORKSPACE_CARDS, type HomeEntryData, type EntryOperatorService } from '../home-entry';
import type { User } from '../../contexts/AuthContext';

const svc = (key: string, nameKo: string, status: string | null = 'active') => ({
  key,
  name: key,
  nameKo,
  domain: `${key}.example`,
  basePath: '',
  description: '',
  joinEnabled: true,
  membership: status ? { status } : null,
});

const user = (roles: string[] = ['user']): User => ({ id: 'u', email: 'u@example.test', name: '사용자', roles });

const op = (serviceKey: string, scope: 'admin' | 'operator' = 'operator'): EntryOperatorService => ({
  serviceKey,
  serviceName: serviceKey,
  scope,
  workspaceMode: 'standard',
  workspaceAvailable: true,
});

const base = (over: Partial<HomeEntryData> = {}): HomeEntryData => ({
  services: [svc('neture', 'Neture'), svc('kpa-society', 'KPA Society'), svc('k-cosmetics', 'K-Cosmetics', null), svc('pharmacy-hub', 'Pharmacy Hub', null)] as HomeEntryData['services'],
  stores: [],
  branches: [],
  serviceStates: { supplier: { status: 'none', source: 'none' } },
  operatorServices: [],
  communities: [
    { communityKey: 'o4o-general', name: 'O4O 공통 커뮤니티', canParticipate: true, reason: null, entries: [{ serviceKey: 'neture', path: '/community' }] },
    { communityKey: 'pharmacy', name: '약사 커뮤니티', canParticipate: true, reason: null, entries: [{ serviceKey: 'kpa-society', path: '/forum' }, { serviceKey: 'pharmacy-hub', path: '/forum' }] },
    { communityKey: 'cosmetics', name: '화장품 커뮤니티', canParticipate: false, reason: 'membership_required', entries: [{ serviceKey: 'k-cosmetics', path: '/forum' }] },
  ],
  ...over,
});

type Model = ReturnType<typeof buildHomeEntryModel>;
const card = (m: Model, id: string) => m.groups.find((g) => g.id === id)!;
const activeCards = (m: Model) => m.groups.filter((g) => g.items.length > 0).map((g) => g.id);
const labels = (m: Model) => m.groups.flatMap((g) => g.items.map((i) => i.label));

describe('내 업무 공간 — 4 카드 고정 구조', () => {
  it('카드는 항상 4개 · WORKSPACE_CARDS 순서 · 제목/설명 고정', () => {
    const m = buildHomeEntryModel(user(), base());
    expect(m.groups.map((g) => [g.id, g.title, g.description])).toEqual(WORKSPACE_CARDS.map((c) => [c.id, c.title, c.description]));
    expect(m.groups.map((g) => g.title)).toEqual(['커뮤니티', '매장', '공급자', '서비스 운영']);
  });

  it('커뮤니티 라벨은 Catalog canonical 이름만 — "Neture 커뮤니티 / KPA Society 커뮤니티 / Pharmacy-Hub 커뮤니티" 없음', () => {
    const m = buildHomeEntryModel(user(), base());
    expect(card(m, 'community').items.map((i) => i.label)).toEqual(['O4O 공통 커뮤니티', '약사 커뮤니티']);
    expect(labels(m).some((l) => /Neture 커뮤니티|KPA Society 커뮤니티|Pharmacy-?Hub 커뮤니티|파머시 허브 커뮤니티/i.test(l))).toBe(false);
  });
});

describe('시나리오', () => {
  it('커뮤니티만 이용하는 회원: 커뮤니티 카드만 진입 · 나머지 3 카드는 진입 0 · 플랫폼 관리 없음', () => {
    const m = buildHomeEntryModel(user(), base());
    expect(activeCards(m)).toEqual(['community']);
    expect(m.platformAdmin).toBeNull();
    expect(m.myServices.map((i) => i.id)).toEqual(['svc:neture', 'svc:kpa-society']);
  });

  it('매장 경영자(KPA 1매장): 매장 카드 버튼 = 매장 이름 → Store Workspace Home · 서비스명 보조 정보 없음 · 매장 HUB 최상위 없음', () => {
    const m = buildHomeEntryModel(user(['kpa:store_owner']), base({ stores: [{ serviceKey: 'kpa-society', organizationId: 'o1', name: '테스트 약국', memberRole: 'owner' }] }));
    expect(activeCards(m)).toEqual(['community', 'store']);
    expect(card(m, 'store').items).toEqual([
      { id: 'store:o1:kpa-society', label: '테스트 약국', action: { kind: 'handoff', serviceKey: 'kpa-society', returnPath: '/store/workspace' } },
    ]);
    expect(labels(m).some((l) => /매장 HUB|내 매장/.test(l))).toBe(false);
  });

  it('매장 경영자(복수 매장 · 복수 서비스): 매장마다 버튼 · 서비스 이름은 보조 정보로만', () => {
    const m = buildHomeEntryModel(
      user(),
      base({
        services: [svc('neture', 'Neture'), svc('kpa-society', 'KPA Society'), svc('k-cosmetics', 'K-Cosmetics')] as HomeEntryData['services'],
        stores: [
          { serviceKey: 'kpa-society', organizationId: 'o1', name: '테스트 약국', memberRole: 'owner' },
          { serviceKey: 'k-cosmetics', organizationId: 'o2', name: '테스트 뷰티샵', memberRole: 'owner' },
        ],
      }),
    );
    expect(card(m, 'store').items.map((i) => [i.label, i.note, (i.action as { returnPath?: string }).returnPath])).toEqual([
      ['테스트 약국', 'KPA Society', '/store/workspace'],
      ['테스트 뷰티샵', 'K-Cosmetics', '/store/workspace'],
    ]);
  });

  it('공급자(active): 공급자 카드 "공급자 업무" → /supplier/dashboard · 내 서비스에는 Service Identity(공급자 서비스)만 — 업무 공간 중복 없음', () => {
    const m = buildHomeEntryModel(user(['neture:supplier']), base({ serviceStates: { supplier: { status: 'active', source: 'neture_suppliers' } } }));
    expect(card(m, 'supplier').items).toEqual([{ id: 'supplier:neture', label: '공급자 업무', action: { kind: 'internal', to: '/supplier/dashboard' } }]);
    const supplierSvc = m.myServices.find((i) => i.id === 'svc:neture-supplier')!;
    expect(supplierSvc.label).toBe('공급자 서비스');
    expect(m.myServices.filter((i) => i.label === '공급자 업무')).toHaveLength(0);
  });

  it('단일 서비스 운영자: 서비스 운영 카드 버튼 1개 = 서비스 이름 → /operator', () => {
    const m = buildHomeEntryModel(user(['kpa:operator']), base({ operatorServices: [op('kpa-society')] }));
    expect(card(m, 'operator').items).toEqual([
      { id: 'operator:kpa-society:operator', label: 'KPA Society', note: undefined, action: { kind: 'handoff', serviceKey: 'kpa-society', returnPath: '/operator' } },
    ]);
  });

  it('복수 서비스 운영자: 서비스별 버튼 (프런트 role 파싱 없음 — 목록에 없는 서비스는 role 이 있어도 없음)', () => {
    const m = buildHomeEntryModel(user(['kpa:operator', 'cosmetics:operator', 'pharmacy-hub:operator']), base({ operatorServices: [op('kpa-society'), op('k-cosmetics')] }));
    expect(card(m, 'operator').items.map((i) => i.label)).toEqual(['KPA Society', 'K-Cosmetics']);
  });

  it('플랫폼 관리자: "플랫폼 관리" 별도 · 4 카드에는 섞이지 않음 · 공급자 카드는 bypass 로 열리지 않음', () => {
    const m = buildHomeEntryModel(user(['platform:super_admin']), base());
    expect(m.platformAdmin).toEqual({ id: 'platform:admin', label: '플랫폼 관리', action: { kind: 'internal', to: '/admin' } });
    expect(activeCards(m)).toEqual(['community']);
    expect(labels(m).some((l) => /관리자/.test(l))).toBe(false);
  });

  it('다중 역할(매장 경영자 + 공급자 + KPA 운영자 + 플랫폼 관리자): 카드마다 해당 진입 · 출처 중복 없음', () => {
    const m = buildHomeEntryModel(
      user(['kpa:store_owner', 'neture:supplier', 'kpa:operator', 'platform:super_admin']),
      base({
        stores: [{ serviceKey: 'kpa-society', organizationId: 'o1', name: '테스트 약국', memberRole: 'owner' }],
        serviceStates: { supplier: { status: 'active', source: 'neture_suppliers' } },
        operatorServices: [op('kpa-society', 'admin')],
      }),
    );
    expect(activeCards(m)).toEqual(['community', 'store', 'supplier', 'operator']);
    expect(card(m, 'store').items.map((i) => i.label)).toEqual(['테스트 약국']);
    expect(card(m, 'supplier').items.map((i) => i.label)).toEqual(['공급자 업무']);
    expect(card(m, 'operator').items.map((i) => [i.label, i.note])).toEqual([['KPA Society', '관리자']]);
    expect(m.platformAdmin?.label).toBe('플랫폼 관리');
    // 항목 id 는 전부 유일 (같은 데이터가 두 카드에 실리지 않는다)
    const ids = [...m.groups.flatMap((g) => g.items.map((i) => i.id)), m.platformAdmin!.id, ...m.myServices.map((i) => i.id)];
    expect(new Set(ids).size).toBe(ids.length);
  });
});
