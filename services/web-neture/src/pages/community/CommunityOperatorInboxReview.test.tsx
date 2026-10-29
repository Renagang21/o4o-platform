import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
const state = vi.hoisted(() => ({ user: { id: 'member' } as {id:string}|null, get: vi.fn(), post: vi.fn(), patch: vi.fn() }));
vi.mock('../../contexts', () => ({ useAuth: () => ({ user: state.user, isAuthenticated: !!state.user }) }));
vi.mock('../../lib/apiClient', () => ({ api: { get: state.get, post: state.post, patch: state.patch } }));
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
vi.mock('./CommunityPublicReadManager', () => ({ default: () => null }));
vi.mock('./CommunityForumMembersPage', () => ({ default: () => null }));
import Workspace from './CommunityWorkspacePage';
afterEach(cleanup);
it('the existing operator task route shows and resolves community pending requests',async()=>{
 let pending=true;state.user={id:'operator'};
 state.get.mockImplementation(async(path:string)=>({data:{data:path.includes('/board-requests')?(pending?[{id:'request',name:'합성 개설 신청',requesterName:'합성 회원'}]:[]):{communityKey:'community',name:'커뮤니티',kind:'independent',allowed:true,canManage:true,canJoin:false,membershipStatus:'active',reason:null}}}));
 state.patch.mockImplementation(async()=>{pending=false;return {data:{success:true}};});
 render(<MemoryRouter initialEntries={['/operator/communities']}><Routes><Route path="/operator/communities" element={<Workspace/>}/></Routes></MemoryRouter>);
 await screen.findByRole('heading',{name:'합성 개설 신청'});fireEvent.click(screen.getByRole('button',{name:'승인'}));
 await screen.findByText('‘합성 개설 신청’ 게시판 개설 신청을 승인했습니다.');
 expect(state.get).toHaveBeenCalledWith('/communities/community/board-requests?review=true');
 expect(state.patch).toHaveBeenCalledWith('/communities/community/board-requests/request',{action:'approve'});
 await screen.findByText('대기 중인 신청이 없습니다.');
});
