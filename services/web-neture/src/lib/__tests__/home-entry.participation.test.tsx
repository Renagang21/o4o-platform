import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, renderHook, waitFor } from '@testing-library/react';
const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('../apiClient', () => ({ api: { get } }));
import { buildHomeEntryModel, useHomeEntry, type HomeEntryData } from '../home-entry';
import type { User } from '../../contexts/AuthContext';

afterEach(() => { cleanup(); get.mockReset(); });
const user = { id: 'member', roles: [], email: 'member@example.test' } as User;
const data = (): HomeEntryData => ({ services: [], stores: [], branches: [], communities: [],
  serviceStates: { supplier: { status: 'none', source: 'none' } },
  businesses: [{ key: 'carepharm', name: '합성 사업', canParticipate: true }],
  cooperatives: [{ id: 'coop', slug: 'sample', name: '합성 조합', status: 'active' }],
});

it('shows approved business and cooperative entries even when /communities has neither', () => {
  const input = data();
  expect(buildHomeEntryModel(user, input).myServices.map(item => item.id)).toEqual(['business:carepharm', 'cooperative:coop']);
  input.businesses![0].canParticipate = false;
  input.cooperatives![0].status = 'suspended';
  const next = buildHomeEntryModel(user, input);
  expect(next.myServices).toEqual([]);
  expect(next.statusItems).toContainEqual(expect.objectContaining({ id: 'status:cooperative:coop', status: 'suspended' }));
});

it('refreshes on return from another service and reports a later fetch failure', async () => {
  const input = data(); input.cooperatives = [];
  get.mockImplementation(async (path: string) => ({ data: { data:
    path === '/auth/services' || path === '/work-scope/operator-services' ? { services: [] } :
    path === '/communities' ? { communities: [] } :
    path === '/work-scope/accessible-stores' ? { stores: [] } : input,
  } }));
  const { result } = renderHook(() => useHomeEntry(true, 'member'));
  await waitFor(() => expect(result.current.data).not.toBeNull());
  input.cooperatives = data().cooperatives;
  fireEvent.focus(window);
  fireEvent(document, new Event('visibilitychange'));
  await waitFor(() => expect(result.current.data?.cooperatives).toHaveLength(1));
  expect(get.mock.calls.filter(([path]) => path === '/auth/services')).toHaveLength(2);
  get.mockRejectedValue(new Error('offline'));
  fireEvent.focus(window);
  await waitFor(() => expect(result.current.error).toBeTruthy());
  expect(result.current.data).toBeNull();
});

it('does not publish an earlier account response after switching accounts', async () => {
  let finishFirst!: (value: unknown) => void;
  let entryReads = 0;
  const second = { ...data(), cooperatives: [] };
  get.mockImplementation((path: string) => {
    if (path === '/neture/home/entry' && entryReads++ === 0) return new Promise(resolve => { finishFirst = resolve; });
    return Promise.resolve({ data: { data:
      path === '/auth/services' || path === '/work-scope/operator-services' ? { services: [] } :
      path === '/communities' ? { communities: [] } :
      path === '/work-scope/accessible-stores' ? { stores: [] } : second,
    } });
  });
  const { result, rerender } = renderHook(({ id }) => useHomeEntry(true, id), { initialProps: { id: 'first' } });
  rerender({ id: 'second' });
  await waitFor(() => expect(result.current.data?.cooperatives).toEqual([]));
  finishFirst({ data: { data: data() } });
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.data?.cooperatives).toEqual([]);
});
