import { afterEach,beforeEach,describe,it,expect,vi } from 'vitest';
import { render,screen,fireEvent,waitFor,cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
const api=vi.hoisted(()=>({get:vi.fn(),patch:vi.fn(),delete:vi.fn()}));
vi.mock('../../../lib/apiClient',()=>({api}));
import Page from '../CommunityManagementPage';
afterEach(cleanup);
beforeEach(()=>{vi.resetAllMocks();api.patch.mockResolvedValue({});api.delete.mockResolvedValue({});});
const row={id:'board-id',name:'게시판 A',status:'completed'};
function renderPage(permanent=false){render(<MemoryRouter><Page kind="boards" permanent={permanent}/></MemoryRouter>);}
describe('community action-oriented management',()=>{
 it('daily operations only suspend/reopen and never issue deletion',async()=>{
  api.get.mockResolvedValue({data:{data:[row]}});renderPage();
  fireEvent.click(await screen.findByRole('button',{name:'운영 중지'}));
  await waitFor(()=>expect(api.patch).toHaveBeenCalledWith('/communities/community/management/boards/board-id/status',{status:'archived'}));
  expect(screen.queryByRole('button',{name:'삭제 범위 확인'})).toBeNull();expect(api.delete).not.toHaveBeenCalled();
 });
 it('admin requires the server plan and explicit confirmation before submitting its fingerprint',async()=>{
  api.get.mockImplementation(async(path:string)=>({data:{data:path.endsWith('deletion-plan')?{id:row.id,digest:'fingerprint',counts:{forum_post:2},blockers:[]}:[row]}}));renderPage(true);
  fireEvent.click(await screen.findByRole('button',{name:'삭제 범위 확인'}));
  const execute=await screen.findByRole('button',{name:'완전 삭제 실행'});expect((execute as HTMLButtonElement).disabled).toBe(true);
  fireEvent.change(screen.getByLabelText('삭제 확인 문구'),{target:{value:'완전 삭제'}});fireEvent.click(execute);
  await waitFor(()=>expect(api.delete).toHaveBeenCalledWith('/communities/community/management/boards/board-id',{data:{expectedDigest:'fingerprint'}}));
 });
 it('never enables execution with a blocked plan',async()=>{
  api.get.mockImplementation(async(path:string)=>({data:{data:path.endsWith('deletion-plan')?{id:row.id,digest:'fingerprint',counts:{},blockers:['소유권 검토 필요']}:[row]}}));renderPage(true);
  fireEvent.click(await screen.findByRole('button',{name:'삭제 범위 확인'}));
  expect(await screen.findByText('소유권 검토 필요')).toBeTruthy();
  expect((screen.getByRole('button',{name:'완전 삭제 실행'}) as HTMLButtonElement).disabled).toBe(true);expect(api.delete).not.toHaveBeenCalled();
 });
 it('lists admin targets using only the community membership scope',async()=>{
  api.get.mockResolvedValue({data:{users:[{id:'member-id',name:'회원 A',status:'active',memberships:[{serviceKey:'community',status:'suspended'}]}],pagination:{totalPages:1}}});
  render(<MemoryRouter><Page kind="members" permanent /></MemoryRouter>);
  expect(await screen.findByText('회원 A · 이용 정지')).toBeTruthy();
  expect(api.get).toHaveBeenCalledWith('/operator/members?serviceKey=community&page=1&limit=20');
 });
});
