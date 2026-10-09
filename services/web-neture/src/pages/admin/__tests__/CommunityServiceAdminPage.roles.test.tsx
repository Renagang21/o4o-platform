import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import CommunityServiceAdminPage from '../CommunityServiceAdminPage';
const state = vi.hoisted(() => ({ roles: [] as string[] }));
const api = vi.hoisted(() => ({
  listAdminCommunities: vi.fn(async () => [{ id: 'c1', name: '테스트 커뮤니티', operatorCount: 1, memberCount: 2 }]),
  listCommunityMembers: vi.fn(async () => [{ membershipId: 'm1', name: '회원', email: 'fixture@example.invalid', role: 'member', serviceMembershipStatus: 'active' }]),
  listCreationRequests: vi.fn(async () => [{ id: 'r1', name: '새 커뮤니티', desiredSlug: 'new', createdAt: '2026-01-01' }]),
  approveCreationRequest: vi.fn(async () => ({ outcome: 'created' })),
  rejectCreationRequest: vi.fn(), setCommunityMemberRole: vi.fn(),
  communityAdminErrorMessage: (_e: unknown, fallback: string) => fallback,
}));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { roles: state.roles } }) }));
vi.mock('../../../lib/api/communityServiceAdmin', () => api);
afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());
describe('community service admin/operator UI', () => {
  it.each(['community:admin', 'platform:super_admin'])('%s may designate individual operators and approve creation', async role => {
    state.roles = [role]; render(<CommunityServiceAdminPage />);
    await waitFor(() => expect(screen.getByText('테스트 커뮤니티 (운영자 1 · 회원 2)')).toBeTruthy());
    fireEvent.change(screen.getByLabelText('커뮤니티 선택'), { target: { value: 'c1' } });
    await waitFor(() => expect(screen.getByRole('button', { name: '운영자 지정' })).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: '운영자 지정' }));
    await waitFor(() => expect(api.setCommunityMemberRole).toHaveBeenCalledWith('c1', 'm1', 'operator'));
    fireEvent.click(screen.getByRole('button', { name: '개설 신청 심사' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '승인' })).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: '승인' }));
    await waitFor(() => expect(api.approveCreationRequest).toHaveBeenCalledWith('r1'));
  });
  it('operator reads communities, members and requests without structural mutation controls', async () => {
    state.roles = ['community:operator']; render(<CommunityServiceAdminPage />);
    await waitFor(() => expect(screen.getByText('테스트 커뮤니티 (운영자 1 · 회원 2)')).toBeTruthy());
    fireEvent.change(screen.getByLabelText('커뮤니티 선택'), { target: { value: 'c1' } });
    await waitFor(() => expect(screen.getByText('fixture@example.invalid')).toBeTruthy());
    expect(screen.queryByRole('button', { name: '운영자 지정' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '개설 신청 현황' }));
    await waitFor(() => expect(screen.getByText('새 커뮤니티')).toBeTruthy());
    expect(screen.queryByRole('button', { name: '승인' })).toBeNull();
    expect(screen.queryByRole('button', { name: '거절' })).toBeNull();
    expect(api.setCommunityMemberRole).not.toHaveBeenCalled();
    expect(api.approveCreationRequest).not.toHaveBeenCalled();
  });
});
