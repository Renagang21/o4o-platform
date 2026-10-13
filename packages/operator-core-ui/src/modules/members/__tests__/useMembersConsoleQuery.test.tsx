import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, renderHook, waitFor, act } from '@testing-library/react';
import { useMembersConsoleQuery } from '../useMembersConsoleQuery';
import type { MembersConsoleClient, UserData } from '../types';

afterEach(cleanup);
const users: UserData[] = [{ id: 'fixture-member', email: 'member@example.invalid', status: 'active', createdAt: '2026-01-01', role: 'member' }];
const pagination = { page: 2, limit: 20, total: 21, totalPages: 2 };
function fixture() {
  const client: MembersConsoleClient = {
    list: vi.fn(async () => ({ users, pagination })),
    updateStatus: vi.fn(async () => {}),
  };
  return { client, roleTabs: [{ key: 'members', label: '회원', roleFilter: ['member'] }],
    statusTabs: [{ key: 'stopped', label: '정지', status: 'suspended' }],
    activeTab: 'all', page: 2, searchQuery: '', serverSort: false,
    sortBy: 'createdAt', sortOrder: 'desc' as const,
    getPrimaryRole: (user: UserData) => user.role ?? '-' };
}

describe('member console read contracts', () => {
  it('keeps status, search and optional server sorting in list requests', async () => {
    const options = fixture();
    const { result, rerender } = renderHook(p => useMembersConsoleQuery(p), { initialProps: options });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(options.client.list).toHaveBeenLastCalledWith({ page: 2, limit: 20 });
    expect(result.current.users).toEqual(users);
    expect(result.current.pagination).toEqual(pagination);
    rerender({ ...options, activeTab: 'stopped', searchQuery: '찾기', serverSort: true });
    await waitFor(() => expect(options.client.list).toHaveBeenLastCalledWith({ page: 2, limit: 20, status: 'suspended', search: '찾기', sortBy: 'createdAt', sortOrder: 'DESC' }));
  });

  it('preserves pending tab and pagination fallback for approval-only adapters', async () => {
    const options = fixture();
    options.client.list = vi.fn(async () => ({ users: undefined, pagination: undefined } as any));
    const { result } = renderHook(() => useMembersConsoleQuery({ ...options, activeTab: 'pending' }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(options.client.list).toHaveBeenCalledWith({ page: 2, limit: 20, status: 'pending' });
    expect(result.current.users).toEqual([]);
    expect(result.current.pagination).toEqual({ page: 2, limit: 20, total: 0, totalPages: 0 });
    expect(result.current.stats.total).toBe(0);
  });

  it('exposes list failure and clears it after an explicit retry', async () => {
    const options = fixture();
    options.client.list = vi.fn().mockRejectedValueOnce(new Error('조회 실패')).mockResolvedValue({ users, pagination });
    const { result } = renderHook(() => useMembersConsoleQuery(options));
    await waitFor(() => expect(result.current.error).toBe('조회 실패'));
    await act(() => result.current.fetchUsers());
    expect(result.current.error).toBe('');
    expect(result.current.users).toEqual(users);
  });

  it('keeps active+approved counts and service-specific role/status counts', async () => {
    const options = fixture();
    options.client.stats = vi.fn(async () => ({ statistics: { total: 4, byStatus: [
      { status: 'active', count: 1 }, { status: 'approved', count: 2 }, { status: 'suspended', count: 1 },
    ] } }));
    options.client.listAll = vi.fn(async () => ({ users }));
    const { result } = renderHook(() => useMembersConsoleQuery(options));
    await waitFor(() => expect(result.current.stats.total).toBe(4));
    expect(result.current.stats.active).toBe(3);
    expect(result.current.stats.roleCounts).toEqual({ members: 1 });
    expect(result.current.stats.statusCounts).toEqual({ stopped: 1 });
  });

  it('keeps optional statistics failure separate from successful member loading', async () => {
    const options = fixture();
    options.client.stats = vi.fn(async () => { throw new Error('통계 실패'); });
    const { result } = renderHook(() => useMembersConsoleQuery(options));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.users).toEqual(users);
    expect(result.current.error).toBe('');
  });
});
