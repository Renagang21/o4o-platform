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

import { resolveSingleStoreWorkspaceUrl, ServiceEntryError } from '../home-entry';
import type { User } from '../../contexts/AuthContext';

const user: User = { id: 'o1', email: 'owner@example.test', name: '점주', roles: ['kpa:store_owner'] };
const kpa = { key: 'kpa-society', name: 'kpa', nameKo: 'KPA', domain: 'pharmacy.example', basePath: '', description: '', joinEnabled: true, membership: { status: 'active' } };
const store = (organizationId: string) => ({ serviceKey: 'kpa-society', organizationId, name: `매장 ${organizationId}`, memberRole: 'owner' });

function respond(stores: unknown[]) {
  get.mockImplementation(async (url: string) => {
    if (url === '/auth/services') return { data: { data: { services: [kpa] } } };
    if (url === '/neture/home/entry') return { data: { data: { stores, branches: [], serviceStates: { supplier: { status: 'none', source: 'none' } } } } };
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
    post.mockResolvedValue({ data: { data: { targetUrl: 'https://pharmacy.example/auth/handoff?c=1' } } });
    await expect(resolveSingleStoreWorkspaceUrl(user)).resolves.toBe('https://pharmacy.example/auth/handoff?c=1');
    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith('/auth/handoff', { targetServiceKey: 'kpa-society', returnPath: '/store/workspace' });
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
