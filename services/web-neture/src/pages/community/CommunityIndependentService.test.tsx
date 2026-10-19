import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
const state = vi.hoisted(() => ({ user: { id: 'member' } as {id:string}|null, get: vi.fn(), post: vi.fn(), reload: vi.fn() }));
vi.mock('../../contexts', () => ({ useAuth: () => ({ user: state.user, isAuthenticated: !!state.user }) }));
vi.mock('../../lib/apiClient', () => ({ api: { get: state.get, post: state.post } }));
vi.mock('@o4o/shared-space-ui', () => ({
 useServiceEnrollmentPolicies: () => ({ ready: true, references: [], reload: state.reload }),
 ServiceEnrollmentPolicyAgreement: () => <p>서비스 약관 확인</p>,
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
 state.get.mockImplementation(async () => ({data:{data:{communityKey:'community',name:'커뮤니티',kind:'independent',allowed:membershipStatus==='active',canJoin:!membershipStatus,canManage,membershipStatus,communityStatus:'active',reason:null}}}));
 state.post.mockImplementation(async () => { membershipStatus='pending'; return {data:{success:true}}; });
});
afterEach(cleanup);
describe('independent community participation workspace', () => {
 it('shows one service without the former directory or community creation workflow', async () => {
  render(<MemoryRouter><Workspace /></MemoryRouter>);
  await screen.findByRole('button',{name:'가입 신청'});
  expect(state.get).toHaveBeenCalledWith('/communities/community/access');
  expect(screen.queryByText('약사 커뮤니티')).toBeNull();
  expect(screen.queryByText('화장품 커뮤니티')).toBeNull();
  expect(screen.queryByText('커뮤니티 개설 신청 · 운영')).toBeNull();
 });
 it('requests only service membership and reloads pending status', async () => {
  render(<MemoryRouter><Workspace /></MemoryRouter>);
  fireEvent.click(await screen.findByRole('button',{name:'가입 신청'}));
  await screen.findByText('가입 신청을 접수했습니다. 운영자의 승인을 기다려 주세요.');
  expect(state.post).toHaveBeenCalledWith('/communities/join',{policyReferences:[]});
  expect(screen.queryByRole('button',{name:'가입 신청'})).toBeNull();
 });
 it('allows retry after failed enrollment and refreshes stale policy references', async () => {
  state.post.mockRejectedValueOnce({response:{data:{code:'ENROLLMENT_POLICY_REQUIRED',error:'서비스 약관을 다시 확인하세요'}}});
  render(<MemoryRouter><Workspace /></MemoryRouter>);
  fireEvent.click(await screen.findByRole('button',{name:'가입 신청'}));
  await screen.findByText('서비스 약관을 다시 확인하세요');
  expect(state.reload).toHaveBeenCalledTimes(1);
  await waitFor(()=>expect((screen.getByRole('button',{name:'가입 신청'}) as HTMLButtonElement).disabled).toBe(false));
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
