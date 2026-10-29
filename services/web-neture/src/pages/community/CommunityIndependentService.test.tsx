import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
const state = vi.hoisted(() => ({ user: { id: 'member' } as {id:string}|null, get: vi.fn(), post: vi.fn() }));
vi.mock('../../contexts', () => ({ useAuth: () => ({ user: state.user, isAuthenticated: !!state.user }) }));
vi.mock('../../lib/apiClient', () => ({ api: { get: state.get, post: state.post } }));
vi.mock('@o4o/shared-space-ui', () => ({
 ServiceHomeHero: () => null, ServiceHomePromotion: () => null,
 cooperationDestination: () => ({ origin: 'https://pharmacy.neture.co.kr', returnPath: '/businesses/x/forum', serviceKey: 'kpa-society' }),
}));
vi.mock('../forum/ForumHubPage', () => ({ default: () => <p>서비스 게시판</p> }));
vi.mock('../forum/ForumPage', () => ({ ForumPage: () => null }));
vi.mock('../forum/ForumWritePage', () => ({ ForumWritePage: () => null }));
vi.mock('../forum/ForumPostPage', () => ({ ForumPostPage: () => null }));
vi.mock('../forum/MyPostsPage', () => ({ default: () => null }));
vi.mock('../forum/ForumRequestPage', () => ({ default: () => null }));
vi.mock('../supplier/MyForumDashboardPage', () => ({ default: () => null }));
vi.mock('./CommunityBoardReview', () => ({ default: () => null }));
vi.mock('./CommunityPublicReadManager', () => ({ default: () => null }));
vi.mock('./CommunityForumMembersPage', () => ({ default: () => null }));
import Workspace from './CommunityWorkspacePage';
let membershipStatus: string|null;
let canManage: boolean;
beforeEach(() => {
 vi.clearAllMocks(); state.user = {id:'member'}; membershipStatus = null; canManage = false;
 state.get.mockImplementation(async () => ({data:{data:{communityKey:'community',name:'커뮤니티',kind:'independent',allowed:!!state.user && !['suspended','withdrawn','inactive'].includes(membershipStatus ?? ''),canJoin:false,canManage,membershipStatus,communityStatus:'active',reason:null}}}));
});
afterEach(cleanup);
describe('independent community participation workspace', () => {
 it('lets a common account participate without the retired enrollment workflow', async () => {
  render(<MemoryRouter><Workspace /></MemoryRouter>);
  await screen.findByText('서비스 게시판');
  expect(state.get).toHaveBeenCalledWith('/communities/community/access');
  expect(screen.queryByRole('button',{name:'가입 신청'})).toBeNull();
  expect(screen.queryByText('약사 커뮤니티')).toBeNull();
  expect(screen.queryByText('화장품 커뮤니티')).toBeNull();
  expect(state.post).not.toHaveBeenCalled();
 });
 it.each(['pending','rejected'])('does not block a common account with a historical %s membership', async status => {
  membershipStatus=status;
  render(<MemoryRouter><Workspace /></MemoryRouter>);
  await screen.findByText('서비스 게시판');
  expect(screen.queryByRole('button',{name:'가입 신청'})).toBeNull();
  expect(state.post).not.toHaveBeenCalled();
 });
 it('asks guests to log in and never restores the retired join form from a stale flag', async () => {
  state.user=null;
  state.get.mockResolvedValue({data:{data:{communityKey:'community',name:'커뮤니티',kind:'independent',allowed:false,canJoin:true,canManage:false,membershipStatus:null}}});
  render(<MemoryRouter><Workspace /></MemoryRouter>);
  await screen.findByText('공통 계정으로 로그인하면 커뮤니티에 참여할 수 있습니다.');
  expect(screen.getByRole('link',{name:'로그인'})).toBeTruthy();
  expect(screen.queryByRole('button',{name:'가입 신청'})).toBeNull();
  expect(state.post).not.toHaveBeenCalled();
 });
 it('does not treat an ineligible account as a pending service approval', async () => {
  membershipStatus='inactive';
  render(<MemoryRouter><Workspace /></MemoryRouter>);
  await screen.findByText('커뮤니티 이용 자격을 확인할 수 없습니다. 계정 상태를 확인하거나 운영자에게 문의해 주세요.');
  expect(screen.queryByText('서비스 게시판')).toBeNull();
 });
 it.each(['suspended','withdrawn'])('does not offer re-enrollment for %s', async status => {
  membershipStatus=status;
  render(<MemoryRouter><Workspace /></MemoryRouter>);
  await screen.findByText(status==='suspended'?'커뮤니티 서비스 이용이 정지되었습니다. 운영자에게 문의해 주세요.':'커뮤니티 서비스에서 탈퇴한 상태입니다. 운영자에게 문의해 주세요.');
  expect(screen.queryByRole('button',{name:'가입 신청'})).toBeNull();
 });
 it('shows own member management only to the service operator', async () => {
  membershipStatus='active'; canManage=true;
  render(<MemoryRouter><Workspace /></MemoryRouter>);
  const link=await screen.findByRole('link',{name:'서비스 회원 관리'});
  expect(link.getAttribute('href')).toBe('/operator/service-members/community');
  expect(screen.queryByText('회원 가입 심사')).toBeNull();
  expect(screen.getByText('서비스 게시판')).toBeTruthy();
 });
});
