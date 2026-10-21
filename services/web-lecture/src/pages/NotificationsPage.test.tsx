import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
const state=vi.hoisted(()=>({get:vi.fn(),post:vi.fn(),user:{id:'operator'} as {id:string}|null}));
vi.mock('../lib/apiClient',()=>({authClient:{api:{get:state.get,post:state.post}}}));
vi.mock('../contexts/AuthContext',()=>({useAuth:()=>({user:state.user,isAuthenticated:!!state.user})}));
import NotificationsPage,{lectureNotificationTarget} from './NotificationsPage';
afterEach(cleanup);
it('resolves existing cross-host review alerts to an owned local route',()=>{
 expect(lectureNotificationTarget('/service-entry/lecture?returnPath=%2Foperator%2Fcourses%2Fsynthetic-course%2Freview')).toBe('/operator/courses/synthetic-course/review');
 expect(lectureNotificationTarget('/instructor/courses/synthetic-course/edit')).toBe('/instructor/courses/synthetic-course/edit');
 for(const target of ['https://evil.example.invalid','//evil.example.invalid','/service-entry/lecture?returnPath=%2F%2Fevil.example.invalid','/operator/members',null])expect(lectureNotificationTarget(target)).toBeNull();
});
it('loads lecture alerts and links the review action locally without changing course state',async()=>{
 state.user={id:'operator'};state.get.mockResolvedValue({data:{data:{notifications:[{id:'notice',title:'강의 심사 요청',isRead:false,metadata:{targetUrl:'/service-entry/lecture?returnPath=%2Foperator%2Fcourses%2Fsynthetic-course%2Freview'}}],totalPages:1}}});state.post.mockResolvedValue({});
 render(<MemoryRouter><NotificationsPage/></MemoryRouter>);
 await screen.findByRole('heading',{name:'강의 심사 요청 · 새 알림'});
 expect(state.get).toHaveBeenCalledWith('/notifications?serviceKey=lecture&page=1&limit=20');
 expect(screen.getByRole('link',{name:'업무 확인'}).getAttribute('href')).toBe('/operator/courses/synthetic-course/review');
 fireEvent.click(screen.getByRole('button',{name:'읽음 표시'}));await screen.findByRole('heading',{name:'강의 심사 요청'});
 expect(state.post).toHaveBeenCalledExactlyOnceWith('/notifications/read',{notificationIds:['notice']});
});
it('does not request private alerts before login',()=>{
 state.user=null;state.get.mockClear();render(<MemoryRouter><NotificationsPage/></MemoryRouter>);
 expect(screen.getByText('로그인 후 알림을 확인해 주세요.')).toBeTruthy();expect(state.get).not.toHaveBeenCalled();
});
