import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor, fireEvent, screen } from '@testing-library/react';
import UserDetailPage from '../UserDetailPage';
afterEach(cleanup);
describe('member detail service boundary', () => {
  it.each(['neture', 'kpa-society', 'pharmacy-hub'])('sends selected service %s and refreshes when selection changes', async (serviceKey) => {
    const get = vi.fn(async (_path: string) => ({ user: { id: 'u', name: '회원', email: 'fixture@example.invalid', status: 'active', isActive: true, createdAt: '2026-01-01' }, roles: [], memberships: [] }));
    const api = { get, put: vi.fn(), patch: vi.fn(), post: vi.fn(), delete: vi.fn() };
    const config: any = { theme: 'blue', serviceKey };
    const props = { userId: 'u', apiAdapter: api, isAdmin: false, navigate: vi.fn() };
    const view = render(<UserDetailPage {...props} config={config} />);
    await waitFor(() => expect(get).toHaveBeenCalledWith(`/operator/members/u?serviceKey=${serviceKey}`));
    await waitFor(() => expect(screen.getByText('정보 수정')).toBeTruthy());
    fireEvent.click(screen.getByText('정보 수정'));
    await waitFor(() => expect(get.mock.calls.filter(([path]) => path === `/operator/members/u?serviceKey=${serviceKey}`)).toHaveLength(2));
    view.rerender(<UserDetailPage {...props} config={{ ...config, serviceKey: 'lecture' }} />);
    await waitFor(() => expect(get.mock.calls.filter(([path]) => path === '/operator/members/u?serviceKey=lecture')).toHaveLength(2));
  });
});

it('central detail and its editor explicitly request the platform all-services view', async () => {
  const get = vi.fn(async (_path: string) => ({ user: { id: 'u', name: '회원', email: 'fixture@example.invalid', status: 'active', isActive: true, createdAt: '2026-01-01' }, roles: [], memberships: [] }));
  const api = { get, put: vi.fn(), patch: vi.fn(), post: vi.fn(), delete: vi.fn() };
  render(<UserDetailPage userId="u" apiAdapter={api} isAdmin={true} navigate={vi.fn()} config={{ theme: 'blue' } as any} />);
  await waitFor(() => expect(screen.getByText('정보 수정')).toBeTruthy());
  fireEvent.click(screen.getByText('정보 수정'));
  await waitFor(() => expect(get.mock.calls.filter(([path]) => path === '/operator/members/u?all=true')).toHaveLength(2));
});
