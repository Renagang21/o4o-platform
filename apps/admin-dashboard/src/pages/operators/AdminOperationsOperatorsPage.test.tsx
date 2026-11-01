import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CENTRAL_OPERATION_MENUS } from '@o4o/types';
const api=vi.hoisted(()=>({get:vi.fn(),post:vi.fn()}));
vi.mock('@o4o/auth-client',()=>({authClient:{api}}));
import AdminOperationsOperatorsPage from './AdminOperationsOperatorsPage';
const operator={id:'fixture-operator',name:'Synthetic operator',email:'operator@example.test',status:'active',isActive:true,menuKeys:['neture.members'],version:'fixture-version'};
function mount(rows: unknown[]=[]){
 api.get.mockImplementation(async(path:string)=>({data:{data:path==='/admin/operations-operators'?rows:path.includes('candidates')?{candidates:[{userId:'fixture-target',name:'Synthetic candidate',email:'candidate@example.test',hasGoogleLink:true}]}:[]}}));
 api.post.mockResolvedValue({data:{success:true}});
 render(<MemoryRouter><AdminOperationsOperatorsPage /></MemoryRouter>);
}
afterEach(()=>{cleanup();vi.clearAllMocks();});
it('sends one workspace invitation with duties, without selecting a service or Admin role',async()=>{
 mount();await screen.findByText('지정된 업무 운영자가 없습니다.');
 fireEvent.click(screen.getByRole('button',{name:'업무 운영자 초대'}));const dialog=screen.getByRole('dialog',{name:'업무 운영자 초대'});
 expect(within(dialog).queryByText('대상 서비스')).toBeNull();expect(within(dialog).queryByText('서비스 관리자')).toBeNull();
 fireEvent.change(within(dialog).getByLabelText('미가입자 초대 이메일'),{target:{value:'new@example.test'}});
 fireEvent.click(within(dialog).getByRole('button',{name:'초대 메일 보내기'}));
 await waitFor(()=>expect(api.post).toHaveBeenCalledWith('/admin/operations-operators',{email:'new@example.test',menuKeys:CENTRAL_OPERATION_MENUS.filter(menu=>menu.minimumRole==='operator').map(menu=>menu.key)}));
 expect(await screen.findByRole('status')).toHaveTextContent('업무 운영자 초대 메일을 발송했습니다.');
});
it('selects a verified account identity and only the selected daily duties',async()=>{
 mount();await screen.findByText('지정된 업무 운영자가 없습니다.');fireEvent.click(screen.getByRole('button',{name:'업무 운영자 초대'}));
 const dialog=within(screen.getByRole('dialog'));
 fireEvent.change(dialog.getByLabelText('기존 사용자 검색'),{target:{value:'candidate'}});fireEvent.click(dialog.getByRole('button',{name:'사용자 검색'}));
 fireEvent.click(await dialog.findByRole('radio',{name:/Synthetic candidate/}));fireEvent.click(dialog.getByText(/개 · 선택 변경/));fireEvent.click(dialog.getByRole('button',{name:'선택 해제'}));
 expect(dialog.getByRole('button',{name:'초대 메일 보내기'})).toBeDisabled();
 fireEvent.click(dialog.getByRole('checkbox',{name:'공통 회원 관리'}));
 fireEvent.click(dialog.getByRole('button',{name:'초대 메일 보내기'}));
 await waitFor(()=>expect(api.post).toHaveBeenCalledWith('/admin/operations-operators',{targetUserId:'fixture-target',menuKeys:['neture.members']}));
});
it('edits duties with the loaded version and a reason, then reports server conflicts',async()=>{
 mount([operator]);await screen.findByText(/Synthetic operator/);fireEvent.click(screen.getByRole('button',{name:'담당 업무 변경'}));
 const dialog=within(screen.getByRole('dialog'));fireEvent.change(dialog.getByLabelText('처리 사유'),{target:{value:'Synthetic reason'}});
 api.post.mockRejectedValueOnce({response:{data:{error:'다른 관리자가 변경했습니다.'}}});
 fireEvent.click(dialog.getByRole('button',{name:'담당 업무 저장'}));
 await waitFor(()=>expect(api.post).toHaveBeenCalledWith('/admin/operations-operators/fixture-operator/duties',{menuKeys:['neture.members'],version:'fixture-version',reason:'Synthetic reason'}));
 expect(await screen.findByRole('alert')).toHaveTextContent('다른 관리자가 변경했습니다.');
 expect(screen.getByRole('dialog')).toBeTruthy();
});
it('revokes a designation after an explicit reason without touching service Admin endpoints',async()=>{
 mount([operator]);await screen.findByText(/Synthetic operator/);fireEvent.click(screen.getByRole('button',{name:'업무 운영자 해제'}));
 const dialog=within(screen.getByRole('dialog'));expect(dialog.getByRole('button',{name:'지정 해제'})).toBeDisabled();
 fireEvent.change(dialog.getByLabelText('처리 사유'),{target:{value:'Synthetic revocation'}});fireEvent.click(dialog.getByRole('button',{name:'지정 해제'}));
 await waitFor(()=>expect(api.post).toHaveBeenCalledWith('/admin/operations-operators/fixture-operator/revoke',{menuKeys:['neture.members'],version:'fixture-version',reason:'Synthetic revocation'}));
});
it('shows a load failure rather than an empty list',async()=>{
 mount();await screen.findByText('지정된 업무 운영자가 없습니다.');api.get.mockRejectedValueOnce(new Error('offline'));fireEvent.click(screen.getByRole('button',{name:'목록 새로고침'}));
 await screen.findByRole('alert');expect(screen.queryByText('지정된 업무 운영자가 없습니다.')).toBeNull();
});
