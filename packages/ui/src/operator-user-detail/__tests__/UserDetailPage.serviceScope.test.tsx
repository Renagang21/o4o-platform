import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import UserDetailPage from '../UserDetailPage';
vi.mock('../EditUserModal', () => ({ default: () => null }));
afterEach(cleanup);
describe('member detail service boundary', () => {
  it.each(['neture', 'kpa-society', 'pharmacy-hub'])('sends selected service %s and refreshes when selection changes', async (serviceKey) => {
    const get = vi.fn(async () => ({ user: { id: 'u', name: '회원', email: 'fixture@example.invalid', status: 'active', isActive: true, createdAt: '2026-01-01' }, roles: [], memberships: [] }));
    const api = { get, put: vi.fn(), patch: vi.fn(), post: vi.fn(), delete: vi.fn() };
    const config: any = { theme: 'blue', serviceKey };
    const props = { userId: 'u', apiAdapter: api, isAdmin: false, navigate: vi.fn() };
    const view = render(<UserDetailPage {...props} config={config} />);
    await waitFor(() => expect(get).toHaveBeenCalledWith(`/operator/members/u?serviceKey=${serviceKey}`));
    view.rerender(<UserDetailPage {...props} config={{ ...config, serviceKey: 'lecture' }} />);
    await waitFor(() => expect(get).toHaveBeenCalledWith('/operator/members/u?serviceKey=lecture'));
  });
});
