import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
const api = vi.hoisted(() => ({get:vi.fn(), post:vi.fn()}));
vi.mock('@o4o/auth-client',()=>({authClient:{api}}));
import Page from './CentralOperationNotifications';
afterEach(()=>{cleanup();vi.resetAllMocks();});
const item = (id: string, isRead=false) => ({id,title:`업무 알림 ${id}`,message:'합성 업무',serviceKey:'supplier',isRead,createdAt:'2026-10-29T00:00:00Z',type:'custom'});
it('reads only the checked unread item and refreshes the header bell and panel together',async()=>{
  let read=false;
  api.get.mockImplementation(async()=>({data:{data:{notifications:[item('one',read),item('two'),item('done',true)],unreadCount:read?1:2}}}));
  api.post.mockImplementation(async()=>{read=true;return {data:{success:true}};});
  render(<MemoryRouter><Page scopeKey="scope"/><Page variant="panel" scopeKey="scope"/></MemoryRouter>);
  await screen.findByLabelText('읽지 않은 알림 2건');
  expect(screen.queryByRole('button',{name:'선택 알림 읽음'})).toBeNull();
  expect(screen.queryByText('업무 알림 done')).toBeNull();
  fireEvent.click(screen.getByLabelText('업무 알림 one 알림 선택'));
  fireEvent.click(screen.getByRole('button',{name:'선택 알림 읽음'}));
  await waitFor(()=>expect(api.post).toHaveBeenCalledWith('/notifications/read',{notificationIds:['one']}));
  await screen.findByLabelText('읽지 않은 알림 1건');
  expect(screen.queryByText('업무 알림 one')).toBeNull();
  expect(screen.getByRole('status').textContent).toContain('업무의 승인·처리 상태는 바뀌지 않습니다');
});
it('shows an unavailable state instead of an empty success and retries only the query',async()=>{
  api.get.mockRejectedValueOnce(new Error('failed')).mockResolvedValue({data:{data:{notifications:[],unreadCount:0}}});
  render(<MemoryRouter><Page variant="panel" scopeKey="scope"/></MemoryRouter>);
  await screen.findByRole('alert');
  expect(screen.queryByText('표시할 읽지 않은 알림이 없습니다.')).toBeNull();
  fireEvent.click(screen.getByRole('button',{name:'알림 새로고침'}));
  await screen.findByText('표시할 읽지 않은 알림이 없습니다.');expect(api.post).not.toHaveBeenCalled();
});
it('rejects late data from a revoked scope and does not refresh after a completed write on unmount',async()=>{
  let finish!:(v:unknown)=>void;
  api.get.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;})).mockResolvedValue({data:{data:{notifications:[],unreadCount:0}}});
  const v=render(<MemoryRouter><Page variant="panel" scopeKey="old"/></MemoryRouter>);
  v.rerender(<MemoryRouter><Page variant="panel" scopeKey="new"/></MemoryRouter>);
  await screen.findByText('표시할 읽지 않은 알림이 없습니다.');
  await act(async()=>finish({data:{data:{notifications:[item('old')],unreadCount:1}}}));
  expect(screen.queryByText('업무 알림 old')).toBeNull();
});
it('unlocks the current scope after an older-scope read finishes without publishing its notice',async()=>{
 let finish!:(v:unknown)=>void;
 api.get.mockResolvedValue({data:{data:{notifications:[item('one')],unreadCount:1}}});
 api.post.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
 const v=render(<MemoryRouter><Page variant="panel" scopeKey="old"/></MemoryRouter>);
 fireEvent.click(await screen.findByLabelText('업무 알림 one 알림 선택'));fireEvent.click(screen.getByRole('button',{name:'선택 알림 읽음'}));
 v.rerender(<MemoryRouter><Page variant="panel" scopeKey="new"/></MemoryRouter>);
 await waitFor(()=>expect(api.get).toHaveBeenCalledTimes(2));
 await act(async()=>finish({data:{success:true}}));
 expect(screen.queryByRole('status')).toBeNull();
 await waitFor(()=>expect((screen.getByRole('button',{name:'알림 새로고침'}) as HTMLButtonElement).disabled).toBe(false));
});

function RouteProbe(){return <output data-testid="notification-route">{useLocation().pathname}</output>;}
it.each([
 ['/operator/suppliers','/operations/supplier/suppliers'],
 ['https://untrusted.example.invalid/collect','/operations/supplier/members'],
])('resolves notification target %s through the central navigation allowlist',async(targetUrl,expected)=>{
 api.get.mockResolvedValue({data:{data:{notifications:[{...item('one'),metadata:{targetUrl}}],unreadCount:1}}});
 api.post.mockResolvedValue({data:{success:true}});
 render(<MemoryRouter><Page variant="panel" scopeKey="scope"/><RouteProbe/></MemoryRouter>);
 fireEvent.click(await screen.findByRole('button',{name:/업무 알림 one/}));
 expect(screen.getByTestId('notification-route').textContent).toBe(expected);
 await waitFor(()=>expect(api.post).toHaveBeenCalledWith('/notifications/read',{notificationIds:['one']}));
});
