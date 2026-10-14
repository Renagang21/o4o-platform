import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import UserDetailPage from './UserDetailPage';

const fixture = vi.hoisted(() => ({ roles: [] as string[], get: vi.fn() }));
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'actor', roles: fixture.roles } }),
  authClient: { api: { get: fixture.get, post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() } },
}));
beforeEach(() => {
  fixture.get.mockReset().mockResolvedValue({ data: { user: { id: 'member', name: '샘플 회원', email: 'fixture@example.invalid', status: 'active', isActive: true, createdAt: '2026-01-01' }, roles: [], memberships: [{ id: 'membership', serviceKey: 'kpa-society', role: 'member', status: 'withdrawn', createdAt: '2026-01-01' }] } });
});
afterEach(cleanup);

it.each([['platform:super_admin', true], ['kpa:admin', true], ['kpa:operator', false]])('%s matches the service console sensitive authority', async (role, allowed) => {
  fixture.roles = [role as string];
  render(<MemoryRouter initialEntries={['/operator/users/member']}><Routes><Route path="/operator/users/:id" element={<UserDetailPage />} /></Routes></MemoryRouter>);
  await screen.findByText('정보 수정');
  await waitFor(() => expect(fixture.get).toHaveBeenCalledWith('/operator/members/member?serviceKey=kpa-society'));
  expect(!!screen.queryByRole('button', { name: '서비스 탈퇴' })).toBe(allowed);
  expect(!!screen.queryByRole('button', { name: '탈퇴 회원 복구' })).toBe(allowed);
});
