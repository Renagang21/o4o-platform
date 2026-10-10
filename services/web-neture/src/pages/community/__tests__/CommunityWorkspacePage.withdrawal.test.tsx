import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('../../../lib/apiClient', () => ({ api: { get, post } }));
vi.mock('../../../contexts', () => ({ useAuth: () => ({ user: { id: 'self' }, isAuthenticated: true }) }));
vi.mock('../CommunityBoardReview', () => ({ default: () => null }));
vi.mock('../../forum/MyPostsPage', () => ({ default: () => null }));
vi.mock('../../forum/ForumRequestPage', () => ({ default: () => null }));
vi.mock('../../supplier/MyForumDashboardPage', () => ({ default: () => null }));
vi.mock('../CommunityForumMembersPage', () => ({ default: () => <p>회원 목록</p> }));
vi.mock('../../forum/ForumHubPage', () => ({ default: () => null }));
vi.mock('../../forum/ForumPage', () => ({ ForumPage: () => null }));
vi.mock('../../forum/ForumWritePage', () => ({ ForumWritePage: () => null }));
vi.mock('../../forum/ForumPostPage', () => ({ ForumPostPage: () => null }));
import CommunityWorkspacePage, { type CommunityWorkspace } from '../CommunityWorkspacePage';

let workspace: CommunityWorkspace;
beforeEach(() => {
  get.mockReset(); post.mockReset();
  workspace = { communityKey: 'fixture', name: '테스트 커뮤니티', kind: 'independent', communityStatus: 'active', membershipStatus: 'active', allowed: true, canManage: false, canJoin: false, reason: null };
  get.mockImplementation(async () => ({ data: { data: workspace } }));
});
afterEach(cleanup);
const show = () => render(<MemoryRouter initialEntries={['/communities/fixture/forum']}><Routes><Route path="/communities/:communityKey/forum" element={<CommunityWorkspacePage view="members" />} /></Routes></MemoryRouter>);
describe('본인 탈퇴 화면과 서버의 커뮤니티 상태 일치', () => {
  it.each(['suspended', 'inactive', null, undefined])('개별 가입이 active여도 커뮤니티 상태 %s에서는 탈퇴를 노출하지 않는다', async communityStatus => {
    workspace = { ...workspace, communityStatus, allowed: false };
    show();
    await screen.findByRole('heading', { name: '테스트 커뮤니티' });
    expect(screen.queryByRole('button', { name: '이 커뮤니티 탈퇴' })).toBeNull();
    expect(post).not.toHaveBeenCalled();
  });
  it('활성 커뮤니티의 본인 활성 가입은 열람 자격과 별도로 탈퇴할 수 있다', async () => {
    workspace = { ...workspace, allowed: false, reason: 'NETURE_MEMBERSHIP_REQUIRED' };
    show();
    expect(await screen.findByRole('button', { name: '이 커뮤니티 탈퇴' })).toBeTruthy();
  });
  it.each(['pending', 'suspended', 'withdrawn'])('개별 가입 %s는 탈퇴를 노출하지 않는다', async membershipStatus => {
    workspace = { ...workspace, membershipStatus, allowed: false };
    show(); await screen.findByRole('heading', { name: '테스트 커뮤니티' });
    expect(screen.queryByRole('button', { name: '이 커뮤니티 탈퇴' })).toBeNull();
  });
  it('탈퇴 완료는 workspace를 재조회하고 이전 회원 화면을 제거한다', async () => {
    post.mockImplementation(async () => {
      workspace = { ...workspace, membershipStatus: 'withdrawn', allowed: false, canJoin: true };
      return { data: { data: { changed: true, status: 'withdrawn' } } };
    });
    show();
    fireEvent.click(await screen.findByRole('button', { name: '이 커뮤니티 탈퇴' }));
    fireEvent.click(screen.getByRole('button', { name: '탈퇴 확정' }));
    await screen.findByRole('button', { name: '가입 신청', exact: true });
    expect(screen.queryByText('회원 목록')).toBeNull();
    expect(screen.queryByRole('button', { name: '이 커뮤니티 탈퇴' })).toBeNull();
    await waitFor(() => expect(get).toHaveBeenCalledTimes(2));
    expect(post).toHaveBeenCalledExactlyOnceWith('/communities/fixture/leave', {});
  });
});
