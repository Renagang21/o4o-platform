import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';

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
    render(<CommunityServiceAdminPage operatorOnly />);
    await waitFor(() => expect(listCreationRequests).toHaveBeenCalledOnce());
    expect(listAdminCommunities).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: '커뮤니티 운영자 지정', exact: true })).toBeNull();
    expect(screen.getByText('커뮤니티 개설 신청을 심사합니다.')).toBeTruthy();
  });
  it('Admin은 개별 커뮤니티 운영자 관리를 조회한다', async () => {
    render(<CommunityServiceAdminPage />);
    await waitFor(() => expect(listAdminCommunities).toHaveBeenCalledOnce());
    expect(listCreationRequests).not.toHaveBeenCalled();
  });
});
