import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), allowed: true, kind: 'semi-franchise', business: 'carepharm', user: 'owner' }));
vi.mock('../../../lib/hostProfile', () => ({ CURRENT_HOST_PROFILE: 'carepharm' }));
vi.mock('../../../lib/apiClient', () => ({ api: { get: state.get, post: state.post } }));
vi.mock('../../../contexts', () => ({ useAuth: () => ({ user: { id: state.user }, isAuthenticated: true }) }));
vi.mock('../../forum/ForumPage', () => ({ ForumPage: () => <p>사업 회원 게시글</p> }));
vi.mock('../../forum/ForumHubPage', () => ({ default: () => <p>사업 게시판</p> }));
vi.mock('../CommunityBoardReview', () => ({ default: () => null }));
import CommunityWorkspacePage from '../CommunityWorkspacePage';
const app = <MemoryRouter initialEntries={['/communities/business%3Acarepharm/forum']}><Routes><Route path="/communities/:communityKey/forum" element={<CommunityWorkspacePage view="posts" />} /></Routes></MemoryRouter>;
beforeEach(() => {
  state.kind = 'semi-franchise'; state.business = 'carepharm'; state.allowed = true; state.user = 'owner'; state.get.mockReset(); state.post.mockReset();
  state.get.mockImplementation(async () => ({ data: { data: { communityKey: 'business:carepharm', businessKey: state.business, kind: state.kind, allowed: state.allowed, canManage: false, canJoin: true, communityStatus: 'active', membershipStatus: 'active', name: '회원 공간' } } }));
});
afterEach(cleanup);
it('renders its approved business forum locally without independent community enrollment', async () => {
  render(app); await screen.findByText('사업 회원 게시글');
  expect(state.get).toHaveBeenCalledExactlyOnceWith('/communities/business%3Acarepharm/access');
  expect(screen.queryByRole('button', { name: '이 커뮤니티 탈퇴' })).toBeNull();
});
it('takes unapproved members to this service participation flow without independent join or public-read actions', async () => {
  state.allowed = false; render(app); await screen.findByRole('link', { name: '서비스 참여 신청 · 상태 확인' });
  expect(screen.queryByText('사업 회원 게시글')).toBeNull();
  expect(screen.queryByRole('button', { name: '가입 신청' })).toBeNull();
  expect(screen.queryByRole('link', { name: /공개 게시글/ })).toBeNull();
});
it('rejects an independent community response even when that membership is active', async () => {
  state.kind = 'independent'; render(app); await screen.findByRole('alert');
  expect(screen.queryByText('사업 회원 게시글')).toBeNull();
  expect(screen.queryByRole('button', { name: '이 커뮤니티 탈퇴' })).toBeNull();
});
it('clears the previous account forum while the new account access check is pending', async () => {
  const ui = render(app); await screen.findByText('사업 회원 게시글');
  state.user = 'next'; state.get.mockReturnValue(new Promise(() => {}));
  ui.rerender(<MemoryRouter initialEntries={['/communities/business%3Acarepharm/forum']}><Routes><Route path="/communities/:communityKey/forum" element={<CommunityWorkspacePage view="posts" />} /></Routes></MemoryRouter>);
  expect(screen.queryByText('사업 회원 게시글')).toBeNull();
});
