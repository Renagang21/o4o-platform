import { afterEach, describe, expect, it, vi } from 'vitest';
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
import { listAdminCommunities, listCreationRequests } from '../../../lib/api/communityServiceAdmin';
import CommunityServiceAdminPage from '../CommunityServiceAdminPage';

afterEach(() => { cleanup(); vi.clearAllMocks(); });

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
});
