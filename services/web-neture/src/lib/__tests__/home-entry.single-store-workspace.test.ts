/**
 * WO-O4O-DEMO-LOGIN-ENTRY-AND-EXPERIENCE-UX-V1 — 로그인 직후 Store Workspace 자동 진입
 *
 *   - 홈 매장 카드와 같은 계산 · 같은 handoff(POST /auth/handoff) — 새 경로 없음
 *   - 매장이 정확히 하나일 때만 이동 (0 · 복수 → throw, handoff 호출 0)
 *
 * 실행: 저장소 루트에서 `npx vitest run --config services/web-neture/vitest.config.mjs`
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const get = vi.fn();
const post = vi.fn();
vi.mock('../apiClient', () => ({ api: { get: (...a: unknown[]) => get(...a), post: (...a: unknown[]) => post(...a) } }));

import { resolveSingleStoreWorkspaceUrl, resolveHomeEntryUrl, buildHomeEntryModel, fetchHomeEntryData, ServiceEntryError } from '../home-entry';
import type { User } from '../../contexts/AuthContext';

const user: User = { id: 'o1', email: 'owner@example.test', name: '점주', roles: ['kpa:store_owner'] };
const kpa = { key: 'kpa-society', name: 'kpa', nameKo: 'KPA', domain: 'pharmacy.example', basePath: '', description: '', joinEnabled: true, membership: { status: 'active' } };
const store = (organizationId: string) => ({ organizationId, organizationName: `매장 ${organizationId}`, memberRole: 'owner' });

function respond(stores: unknown[]) {
  get.mockImplementation(async (url: string) => {
    if (url === '/work-scope/accessible-stores') return { data: { data: { stores } } };
    if (url === '/auth/services') return { data: { data: { services: [kpa] } } };
    if (url === '/neture/home/entry') return { data: { data: { stores: [], branches: [], serviceStates: { supplier: { status: 'none', source: 'none' } } } } };
    if (url === '/work-scope/operator-services') return { data: { data: { services: [] } } };
    if (url === '/communities') return { data: { data: { communities: [] } } };
    throw new Error(`unexpected ${url}`);
  });
}

beforeEach(() => {
  get.mockReset();
  post.mockReset();
});

describe('resolveSingleStoreWorkspaceUrl', () => {
  it('매장 하나 → 홈 매장 버튼과 같은 handoff 요청', async () => {
    respond([store('org-1')]);
    post.mockResolvedValue({ data: { data: { targetUrl: 'https://store.neture.co.kr/handoff?token=synthetic' } } });
    await expect(resolveSingleStoreWorkspaceUrl(user)).resolves.toBe('https://store.neture.co.kr/handoff?token=synthetic');
    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith('/auth/handoff', { targetWorkspace: 'store', returnPath: '/store' });
  });

  it.each([[[]], [[store('org-1'), store('org-2')]]])('매장 %j → 이동하지 않는다', async (stores) => {
    respond(stores);
    await expect(resolveSingleStoreWorkspaceUrl(user)).rejects.toBeInstanceOf(ServiceEntryError);
    expect(post).not.toHaveBeenCalled();
  });

  it('홈 진입 조회 실패 → throw · handoff 0', async () => {
    get.mockRejectedValue(new Error('500'));
    await expect(resolveSingleStoreWorkspaceUrl(user)).rejects.toThrow();
    expect(post).not.toHaveBeenCalled();
  });
});


describe('조직 기반 대표 홈 매장 진입', () => {
  it('서비스 membership이 없고 기존 홈 API에 매장이 없어도 Store 목록을 사용한다', async () => {
    respond([store('org-1')]);
    const data = await fetchHomeEntryData();
    data.services = [{ ...kpa, membership: null }];
    const model = buildHomeEntryModel({ ...user, roles: ['neture:store_owner'] }, data);
    expect(model.groups.find(g => g.id === 'store')?.items).toEqual([
      { id: 'workspace-store:org-1', label: '매장 org-1', note: undefined, action: { kind: 'workspace', returnPath: '/store' } },
    ]);
    expect(model.myServices).toEqual([]); // 매장 연결로 서비스 가입을 만들어내지 않는다.
  });

  it('빈 Store 목록을 옛 서비스별 매장 목록으로 대체하지 않는다', async () => {
    respond([]);
    const data = await fetchHomeEntryData();
    data.stores = [{ serviceKey: 'kpa-society', organizationId: 'old', name: '옛 매장', memberRole: 'owner' }];
    expect(buildHomeEntryModel(user, data).groups.find(g => g.id === 'store')?.items).toEqual([]);
  });

  it('복수 매장은 선택 화면으로 보내고 자동 선택하지 않는다', async () => {
    respond([store('org-1'), store('org-2')]);
    const data = await fetchHomeEntryData();
    const items = buildHomeEntryModel(user, data).groups.find(g => g.id === 'store')!.items;
    expect(items.map(i => i.action)).toEqual([
      { kind: 'workspace', returnPath: '/select-store' }, { kind: 'workspace', returnPath: '/select-store' },
    ]);
    await expect(resolveSingleStoreWorkspaceUrl(user)).rejects.toBeInstanceOf(ServiceEntryError);
    expect(post).not.toHaveBeenCalled();
  });

  it('Store 목록의 잘못된 응답을 미가입 상태로 숨기지 않는다', async () => {
    respond([]);
    const getOriginal = get.getMockImplementation()!;
    get.mockImplementation((url: string) => url === '/work-scope/accessible-stores' ? Promise.resolve({ data: { data: {} } }) : getOriginal(url));
    await expect(fetchHomeEntryData()).rejects.toThrow('bad response');
  });

  it.each(['https://untrusted.example/handoff', 'https://store.neture.co.kr/other', 'http://store.neture.co.kr/handoff'])('잘못된 Workspace 인계 주소를 거부한다: %s', async targetUrl => {
    post.mockResolvedValue({ data: { data: { targetUrl } } });
    await expect(resolveHomeEntryUrl({ kind: 'workspace', returnPath: '/store' })).rejects.toBeInstanceOf(ServiceEntryError);
  });
});
