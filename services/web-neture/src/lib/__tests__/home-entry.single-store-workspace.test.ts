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

import { resolveSingleStoreWorkspaceUrl, resolveServiceEntryUrl, ServiceEntryError } from '../home-entry';
import type { User } from '../../contexts/AuthContext';

const user: User = { id: 'o1', email: 'owner@example.test', name: '점주', roles: ['neture:store_owner'] };
const kpa = { key: 'kpa-society', name: 'kpa', nameKo: 'KPA', domain: 'pharmacy.example', basePath: '', description: '', joinEnabled: true, membership: { status: 'active' } };
const store = (organizationId: string) => ({ serviceKey: 'kpa-society', organizationId, name: `매장 ${organizationId}`, memberRole: 'owner' });

function respond(stores: unknown[], services: unknown[] = [kpa]) {
  get.mockImplementation(async (url: string) => {
    if (url === '/auth/services') return { data: { data: { services } } };
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
    post.mockResolvedValue({ data: { data: { targetUrl: 'https://store.example/handoff?token=1' } } });
    await expect(resolveSingleStoreWorkspaceUrl(user)).resolves.toBe('https://store.example/handoff?token=1');
    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith('/auth/handoff', { targetWorkspace: 'store', returnPath: '/' });
  });

  it.each([
    { services: [] },
    { services: [{ ...kpa, membership: null }] },
    { services: [{ ...kpa, membership: { status: 'suspended' } }] },
  ])(
    '승인 원장으로 반환된 약국은 KPA 개인 가입 $services와 무관하게 Store로 이동한다', async ({ services }) => {
      respond([store('org-1')], services);
      post.mockResolvedValue({ data: { data: { targetUrl: 'https://store.example/handoff?token=1' } } });
      await expect(resolveSingleStoreWorkspaceUrl(user)).resolves.toBe('https://store.example/handoff?token=1');
      expect(post).toHaveBeenCalledWith('/auth/handoff', { targetWorkspace: 'store', returnPath: '/' });
    },
  );

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

  it('약사 커뮤니티는 Store로 우회하지 않고 서비스 handoff를 유지한다', async () => {
    post.mockResolvedValue({ data: { data: { targetUrl: 'https://pharmacy.example/handoff?token=1' } } });
    await expect(resolveServiceEntryUrl('kpa-society', '/forum')).resolves.toBe('https://pharmacy.example/handoff?token=1');
    expect(post).toHaveBeenCalledWith('/auth/handoff', { targetServiceKey: 'kpa-society', returnPath: '/forum' });
  });
});

it('관리 링크는 단일 매장 자동 진입을 늘리거나 없는 매장을 선택하게 하지 않는다', async () => {
  const operator = { ...user, roles: ['platform:super_admin'] };
  respond([store('org-1')]);
  post.mockResolvedValue({ data: { data: { targetUrl: 'https://store.example/handoff?token=1' } } });
  await expect(resolveSingleStoreWorkspaceUrl(operator)).resolves.toBe('https://store.example/handoff?token=1');
  expect(post).toHaveBeenCalledWith('/auth/handoff', { targetWorkspace: 'store', returnPath: '/' });
  post.mockClear();
  respond([]);
  await expect(resolveSingleStoreWorkspaceUrl(operator)).rejects.toBeInstanceOf(ServiceEntryError);
  expect(post).not.toHaveBeenCalled();
});
