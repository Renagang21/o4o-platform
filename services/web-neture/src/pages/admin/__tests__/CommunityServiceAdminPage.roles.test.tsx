import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('../../../lib/api/communityServiceAdmin', () => ({
  listCreationRequests: vi.fn().mockResolvedValue([]),
  listAdminCommunities: vi.fn().mockResolvedValue([]),
  listCommunityMembers: vi.fn().mockResolvedValue([]),
  approveCreationRequest: vi.fn(),
  rejectCreationRequest: vi.fn(),
  setCommunityMemberRole: vi.fn(),
  communityAdminErrorMessage: vi.fn(),
}));
import { listAdminCommunities, listCommunityMembers, listCreationRequests, setCommunityMemberRole } from '../../../lib/api/communityServiceAdmin';
import CommunityServiceAdminPage from '../CommunityServiceAdminPage';

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(listAdminCommunities).mockResolvedValue([]);
  vi.mocked(listCommunityMembers).mockResolvedValue([]);
  vi.mocked(listCreationRequests).mockResolvedValue([]);
});
afterEach(() => { cleanup(); });

describe('커뮤니티 서비스 업무 분리', () => {
  it('Operator는 개설 신청만 조회하고 운영자 지정 탭은 없다', async () => {
    render(<MemoryRouter><CommunityServiceAdminPage operatorOnly /></MemoryRouter>);
    await waitFor(() => expect(listCreationRequests).toHaveBeenCalledOnce());
    expect(listAdminCommunities).not.toHaveBeenCalled();
    expect(screen.getByRole('link', { name: '커뮤니티 가입 신청·회원 관리' }).getAttribute('href')).toBe('/mypage/communities');
    expect(screen.queryByRole('button', { name: '커뮤니티 운영자 지정', exact: true })).toBeNull();
    expect(screen.getByText('커뮤니티 개설 신청을 심사합니다.')).toBeTruthy();
  });
  it('Admin은 개별 커뮤니티 운영자 관리를 조회한다', async () => {
    render(<MemoryRouter><CommunityServiceAdminPage /></MemoryRouter>);
    await waitFor(() => expect(listAdminCommunities).toHaveBeenCalledOnce());
    expect(listCreationRequests).not.toHaveBeenCalled();
  });
});


describe('관리 조회 탭 전환', () => {
  it('Admin은 개설 심사로 이동했다가 운영자 목록으로 돌아갈 수 있다', async () => {
    render(<MemoryRouter><CommunityServiceAdminPage /></MemoryRouter>);
    await waitFor(() => expect(listAdminCommunities).toHaveBeenCalledOnce());
    fireEvent.click(screen.getByRole('button', { name: '개설 신청 심사', exact: true }));
    await waitFor(() => expect(listCreationRequests).toHaveBeenCalledOnce());
    expect(screen.getByText('심사 대기 중인 개설 신청이 없습니다.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '커뮤니티 운영자 지정', exact: true }));
    await waitFor(() => expect(listAdminCommunities).toHaveBeenCalledTimes(2));
  });

  it('탭 복귀 후 새 목록에서 개별 admin/operator/member 역할을 조회하며 역할은 변경하지 않는다', async () => {
    vi.mocked(listAdminCommunities).mockResolvedValue([
      { id: 'c1', slug: 'fixture', name: '테스트 커뮤니티', status: 'active', operatorCount: 2, memberCount: 3 },
    ]);
    vi.mocked(listCommunityMembers).mockResolvedValue(['admin', 'operator', 'member'].map((role, index) => ({
      membershipId: `m${index}`, userId: `u${index}`, name: `회원 ${index}`, email: null,
      role: role as 'admin' | 'operator' | 'member', membershipStatus: 'active', serviceMembershipStatus: 'active',
    })));
    render(<MemoryRouter><CommunityServiceAdminPage /></MemoryRouter>);
    fireEvent.change(await screen.findByLabelText('커뮤니티 선택'), { target: { value: 'c1' } });
    expect((await screen.findByLabelText('회원 0 역할') as HTMLSelectElement).value).toBe('admin');
    expect((screen.getByLabelText('회원 1 역할') as HTMLSelectElement).value).toBe('operator');
    expect((screen.getByLabelText('회원 2 역할') as HTMLSelectElement).value).toBe('member');
    fireEvent.click(screen.getByRole('button', { name: '개설 신청 심사', exact: true }));
    await screen.findByText('심사 대기 중인 개설 신청이 없습니다.');
    fireEvent.click(screen.getByRole('button', { name: '커뮤니티 운영자 지정', exact: true }));
    const selection = await screen.findByLabelText('커뮤니티 선택');
    expect((selection as HTMLSelectElement).value).toBe('');
    fireEvent.change(selection, { target: { value: 'c1' } });
    await screen.findByLabelText('회원 0 역할');
    expect(listCommunityMembers).toHaveBeenNthCalledWith(2, 'c1');
    expect(setCommunityMemberRole).not.toHaveBeenCalled();
  });
});
