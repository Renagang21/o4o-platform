import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ServiceMembersWorkspace } from '../ServiceMembersWorkspace';

afterEach(cleanup);
function fixture(serviceKey: string, status: string) {
  const get = vi.fn(async (path: string) => path.includes('/stats?')
    ? { statistics: { total: 1, byStatus: [{ status, count: 1 }] } }
    : { users: [{ id: 'fixture-user', name: '테스트회원', email: 'fixture@example.invalid', status, createdAt: '2026-01-01', memberships: [{ id: 'fixture-membership', serviceKey, role: 'member', status }] }], pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } });
  return { get, post: vi.fn(), put: vi.fn(), patch: vi.fn(async () => ({})), delete: vi.fn() };
}
describe('service member workspace role policy', () => {
  it.each(['lecture', 'supplier', 'funding', 'community'])('%s operator can approve with the selected service and cannot suspend', async serviceKey => {
    const api = fixture(serviceKey, 'pending');
    render(<MemoryRouter><ServiceMembersWorkspace serviceKey={serviceKey} basePath="/members" api={api} roles={[`${serviceKey}:operator`]} navigate={vi.fn()} /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('테스트회원')).toBeTruthy());
    expect(api.get.mock.calls.some(([path]) => path.startsWith(`/operator/members?serviceKey=${serviceKey}&`))).toBe(true);
    fireEvent.click(screen.getByText('테스트회원'));
    await waitFor(() => expect(screen.getByRole('button', { name: '승인' })).toBeTruthy());
    expect(screen.queryByRole('button', { name: '비활성화' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '승인' }));
    await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/operator/members/fixture-user/status', { status: 'approved', serviceKey }));
  });
  it.each([false, true])('active member lifecycle control follows same-service admin authority (%s)', async isAdmin => {
    const api = fixture('lecture', 'active');
    render(<MemoryRouter><ServiceMembersWorkspace serviceKey="lecture" basePath="/members" api={api} roles={[isAdmin ? 'lecture:admin' : 'lecture:operator', 'funding:admin']} navigate={vi.fn()} /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('테스트회원')).toBeTruthy());
    fireEvent.click(screen.getByText('테스트회원'));
    await waitFor(() => expect(screen.getByText('전체 상세 페이지 →')).toBeTruthy());
    expect(!!screen.queryByRole('button', { name: '비활성화' })).toBe(isAdmin);
    if (isAdmin) {
      fireEvent.click(screen.getByRole('button', { name: '비활성화' }));
      await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/operator/members/fixture-user/status', { status: 'suspended', serviceKey: 'lecture' }));
    }
  });
});
