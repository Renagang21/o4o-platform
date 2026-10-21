import {afterEach,expect,it,vi} from 'vitest';
import {act,cleanup,fireEvent,render,screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {CooperativeNotificationLink,CooperativeNotifications,cooperativeNotificationTarget} from './Notifications';
afterEach(cleanup);
const notice={id:'notice',title:'조합 문의',message:'Synthetic inquiry',isRead:false,createdAt:'2026-10-21',metadata:{targetUrl:'/alpha/operator/inbox'}};
function client(){return{get:vi.fn().mockResolvedValue({data:{data:{notifications:[notice],totalPages:1}}}),post:vi.fn().mockResolvedValue({}),patch:vi.fn(),put:vi.fn(),delete:vi.fn()};}
it('opens only owned cooperative inboxes or the fixed federation management route',()=>{
 expect(cooperativeNotificationTarget('/alpha/operator/inbox')).toBe('/alpha/operator/inbox');
 expect(cooperativeNotificationTarget('/operator/inbox')).toBe('/operator/inbox');
 expect(cooperativeNotificationTarget('/operator/service-contact/pharmcoop')).toBe('https://neture.co.kr/operator/service-contact/pharmcoop');
 for(const target of ['//evil.example.invalid','https://evil.example.invalid','/operator/inbox/open/cooperative/alpha','/alpha/../../operator/inbox','/alpha\\operator/inbox',null])expect(cooperativeNotificationTarget(target)).toBeNull();
});
it('keeps count failures visible rather than showing zero',async()=>{
 const api=client();api.get.mockRejectedValue(Error('Synthetic failure'));
 render(<MemoryRouter><CooperativeNotificationLink client={api}/></MemoryRouter>);
 expect(await screen.findByText('문의 알림 · 확인 필요')).toBeTruthy();
 expect(api.get).toHaveBeenCalledWith('/notifications/unread-count?serviceKey=pharmcoop');
});
it('loads the Pharmcoop notification scope and marks only the selected notification read',async()=>{
 const api=client();render(<MemoryRouter><CooperativeNotifications client={api}/></MemoryRouter>);
 await screen.findByRole('heading',{name:'조합 문의 · 새 알림'});
 expect(api.get).toHaveBeenCalledWith('/notifications?serviceKey=pharmcoop&page=1&limit=20');
 expect(screen.getByRole('link',{name:'업무 확인'}).getAttribute('href')).toBe('/alpha/operator/inbox');
 const button=screen.getByRole('button',{name:'읽음 표시'});fireEvent.click(button);fireEvent.click(button);
 await screen.findByRole('heading',{name:'조합 문의'});
 expect(api.post).toHaveBeenCalledExactlyOnceWith('/notifications/read',{notificationIds:['notice']});
 expect(api.patch).not.toHaveBeenCalled();
});
it('preserves the unread notification on read failure',async()=>{
 const api=client();api.post.mockRejectedValue(Error('Synthetic failure'));
 render(<MemoryRouter><CooperativeNotifications client={api}/></MemoryRouter>);
 fireEvent.click(await screen.findByRole('button',{name:'읽음 표시'}));await screen.findByRole('alert');
 expect(screen.getByRole('heading',{name:'조합 문의 · 새 알림'})).toBeTruthy();
});
it('discards a previous account list response',async()=>{
 let finish!:(value:unknown)=>void;const old=client();old.get.mockImplementation(()=>new Promise(r=>{finish=r;}));const next=client();next.get.mockResolvedValue({data:{data:{notifications:[],totalPages:1}}});
 const view=render(<MemoryRouter><CooperativeNotifications key="old" client={old}/></MemoryRouter>);
 view.rerender(<MemoryRouter><CooperativeNotifications key="next" client={next}/></MemoryRouter>);await screen.findByText('알림이 없습니다.');
 await act(async()=>finish({data:{data:{notifications:[notice],totalPages:1}}}));expect(screen.queryByText('조합 문의')).toBeNull();
});
