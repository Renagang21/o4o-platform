import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), allowed: true, canManage: false, kind: 'semi-franchise', business: 'carepharm', user: 'owner' }));
vi.mock('../../../lib/hostProfile', () => ({ CURRENT_HOST_PROFILE: 'carepharm' }));
vi.mock('../../../lib/apiClient', () => ({ api: { get: state.get, post: state.post } }));
vi.mock('../../../contexts', () => ({ useAuth: () => ({ user: { id: state.user }, isAuthenticated: true }) }));
vi.mock('../../forum/ForumPage', () => ({ ForumPage: () => <p>사업 회원 게시글</p> }));
vi.mock('../../forum/ForumHubPage', () => ({ default: () => <p>사업 게시판</p> }));
vi.mock('../CommunityBoardReview', () => ({ default: () => null }));
import CommunityWorkspacePage from '../CommunityWorkspacePage';
const app = <MemoryRouter initialEntries={['/communities/business%3Acarepharm/forum']}><Routes><Route path="/communities/:communityKey/forum" element={<CommunityWorkspacePage view="posts" />} /></Routes></MemoryRouter>;
beforeEach(() => {
  state.kind = 'semi-franchise'; state.business = 'carepharm'; state.allowed = true; state.canManage = false; state.user = 'owner'; state.get.mockReset(); state.post.mockReset();
  state.get.mockImplementation(async () => ({ data: { data: { communityKey: 'business:carepharm', businessKey: state.business, kind: state.kind, allowed: state.allowed, canManage: state.canManage, canJoin: true, communityStatus: 'active', membershipStatus: 'active', name: '회원 공간' } } }));
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
it('offers operating guidance to members without board creation controls', async () => {
  render(app); await screen.findByText('CarePharm 회원 커뮤니티 이용 안내');
  expect(screen.queryByText('게시판 구성 예시 선택')).toBeNull();
  expect(screen.queryByRole('button', { name: '게시판 만들기' })).toBeNull();
});
it('lets the operator edit an example and creates only on the explicit action, retaining input on failure', async () => {
  state.canManage = true; state.post.mockRejectedValue(new Error('revoked'));
  render(app); await screen.findByText('게시판 구성 예시 선택');
  fireEvent.click(screen.getByText('게시판 구성 예시 선택'));
  fireEvent.click(screen.getByRole('button', { name: '약국 운영 사례 예시 사용' }));
  expect(state.post).not.toHaveBeenCalled();
  expect((screen.getByRole('textbox', { name: '게시판 이름' }) as HTMLInputElement).value).toBe('약국 운영 사례');
  fireEvent.change(screen.getByRole('textbox', { name: '게시판 설명' }), { target: { value: '운영 사례와 자료 사용 경험' } });
  fireEvent.click(screen.getByRole('button', { name: '게시판 만들기' }));
  await waitFor(() => expect(state.post).toHaveBeenCalledExactlyOnceWith('/communities/business%3Acarepharm/boards', { name: '약국 운영 사례', description: '운영 사례와 자료 사용 경험' }));
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', '게시판을 만들지 못했습니다.');
  expect((screen.getByRole('textbox', { name: '게시판 설명' }) as HTMLTextAreaElement).value).toBe('운영 사례와 자료 사용 경험');
});
