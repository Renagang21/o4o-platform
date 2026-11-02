import { StrictMode } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
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
it('sends a recipient-only invitation without selecting duties, service or Admin role',async()=>{
 mount();await screen.findByText('지정된 업무 운영자가 없습니다.');
 fireEvent.click(screen.getByRole('button',{name:'업무 운영자 초대'}));const dialog=screen.getByRole('dialog',{name:'업무 운영자 초대'});
 expect(within(dialog).queryByText('대상 서비스')).toBeNull();expect(within(dialog).queryByText('서비스 관리자')).toBeNull();
 fireEvent.change(within(dialog).getByLabelText('미가입자 초대 이메일'),{target:{value:'new@example.test'}});
 fireEvent.click(within(dialog).getByRole('button',{name:'초대 메일 보내기'}));
 await waitFor(()=>expect(api.post).toHaveBeenCalledWith('/admin/operations-operators',{email:'new@example.test'}));
 expect(await screen.findByRole('status')).toHaveTextContent('업무 운영자 초대 메일을 발송했습니다.');
});
it('selects a verified account without asking for duties',async()=>{
 mount();await screen.findByText('지정된 업무 운영자가 없습니다.');fireEvent.click(screen.getByRole('button',{name:'업무 운영자 초대'}));
 const dialog=within(screen.getByRole('dialog'));
 fireEvent.change(dialog.getByLabelText('기존 사용자 검색'),{target:{value:'candidate'}});fireEvent.click(dialog.getByRole('button',{name:'사용자 검색'}));
 fireEvent.click(await dialog.findByRole('radio',{name:/Synthetic candidate/}));
 expect(dialog.queryByRole('checkbox')).toBeNull();
 expect(dialog.getByText(/일상업무 전체를 기본으로 제공합니다/)).toBeTruthy();
 fireEvent.click(dialog.getByRole('button',{name:'초대 메일 보내기'}));
 await waitFor(()=>expect(api.post).toHaveBeenCalledWith('/admin/operations-operators',{targetUserId:'fixture-target'}));
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


it('ignores an older initial list response after a designation refresh',async()=>{
  let finish!: (value: unknown) => void;const old=new Promise(resolve=>{finish=resolve;});let reads=0;
  api.get.mockImplementation(async(path:string)=>path==='/admin/operations-operators' ? (++reads===1?old:{data:{data:reads===2?[]:[operator]}}) : {data:{data:[]}});
  api.post.mockResolvedValue({data:{success:true}});
  render(<StrictMode><MemoryRouter><AdminOperationsOperatorsPage /></MemoryRouter></StrictMode>);
  await screen.findByText('지정된 업무 운영자가 없습니다.');
  fireEvent.click(screen.getByRole('button',{name:'업무 운영자 초대'}));
  fireEvent.change(screen.getByLabelText('미가입자 초대 이메일'),{target:{value:'new@example.test'}});
  fireEvent.click(screen.getByRole('button',{name:'초대 메일 보내기'}));
  await screen.findByText(/Synthetic operator/);
  await act(async()=>{ finish({data:{data:[]}}); await old; });
  expect(screen.getByText(/Synthetic operator/)).toBeTruthy();
});

it('keeps confirmed success visible until acknowledgement and prevents duplicate pending submissions',async()=>{
 mount();await screen.findByText('지정된 업무 운영자가 없습니다.');fireEvent.click(screen.getByRole('button',{name:'업무 운영자 초대'}));
 const dialog=within(screen.getByRole('dialog'));const email=dialog.getByLabelText('미가입자 초대 이메일');
 fireEvent.change(email,{target:{value:'new@example.test'}});
 let finish!: (value:unknown)=>void;api.post.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
 const send=dialog.getByRole('button',{name:'초대 메일 보내기'});fireEvent.click(send);fireEvent.click(send);
 expect(api.post).toHaveBeenCalledTimes(1);expect(send).toBeDisabled();expect(email).toBeDisabled();
 expect(dialog.getByRole('status')).toHaveTextContent('초대 메일 발송을 요청하고 있습니다');
 await act(async()=>{finish({data:{success:true}});});
 expect(dialog.getByRole('status')).toHaveTextContent('초대 메일을 발송했습니다');
 expect(dialog.queryByRole('button',{name:'초대 메일 보내기'})).toBeNull();
 fireEvent.click(dialog.getByRole('button',{name:'완료'}));expect(screen.queryByRole('dialog')).toBeNull();
 expect(screen.getByRole('status')).toHaveTextContent('초대 메일을 발송했습니다');
});

it('renders structured server errors as readable feedback without losing the invite draft',async()=>{
 mount();await screen.findByText('지정된 업무 운영자가 없습니다.');fireEvent.click(screen.getByRole('button',{name:'업무 운영자 초대'}));
 const dialog=within(screen.getByRole('dialog'));fireEvent.change(dialog.getByLabelText('미가입자 초대 이메일'),{target:{value:'new@example.test'}});
 api.post.mockRejectedValueOnce({response:{data:{error:{code:'FORBIDDEN',message:'현재 초대 권한을 확인해 주세요.'}}}});
 fireEvent.click(dialog.getByRole('button',{name:'초대 메일 보내기'}));
 expect(await dialog.findByRole('alert')).toHaveTextContent('현재 초대 권한을 확인해 주세요.');
 expect(dialog.getByLabelText('미가입자 초대 이메일')).toHaveValue('new@example.test');
 expect(dialog.getByRole('button',{name:'초대 메일 보내기'})).toBeEnabled();
});

it('does not claim mail was sent for an unconfirmed HTTP success response',async()=>{
 mount();await screen.findByText('지정된 업무 운영자가 없습니다.');fireEvent.click(screen.getByRole('button',{name:'업무 운영자 초대'}));
 const dialog=within(screen.getByRole('dialog'));fireEvent.change(dialog.getByLabelText('미가입자 초대 이메일'),{target:{value:'new@example.test'}});
 api.post.mockResolvedValueOnce({data:{success:false}});fireEvent.click(dialog.getByRole('button',{name:'초대 메일 보내기'}));
 await dialog.findByRole('alert');expect(dialog.queryByRole('status')).toBeNull();expect(dialog.getByRole('button',{name:'초대 메일 보내기'})).toBeEnabled();
});

it('offers the existing pending list after mail failure without issuing another invite',async()=>{
 mount();await screen.findByText('지정된 업무 운영자가 없습니다.');fireEvent.click(screen.getByRole('button',{name:'업무 운영자 초대'}));
 const dialog=within(screen.getByRole('dialog'));fireEvent.change(dialog.getByLabelText('미가입자 초대 이메일'),{target:{value:'new@example.test'}});
 api.post.mockRejectedValueOnce({response:{data:{code:'INVITATION_MAIL_FAILED',error:'초대는 저장됐으나 메일 발송을 확인하지 못했습니다.'}}});
 fireEvent.click(dialog.getByRole('button',{name:'초대 메일 보내기'}));await dialog.findByRole('alert');
 api.get.mockImplementation(async(path:string)=>({data:{data:path==='/admin/service-operator-invitations'?[{id:'pending',scope_type:'platform',scope_key:'admin-operations',invited_email:'new@example.test',status:'pending',expired:false}]:[]}}));
 fireEvent.click(dialog.getByRole('button',{name:'초대 목록 확인'}));
 await screen.findByRole('button',{name:'재발송'});expect(screen.queryByRole('dialog')).toBeNull();expect(api.post).toHaveBeenCalledTimes(1);
});

it('shows an empty search result inside the open invitation without presenting it as sent mail',async()=>{
 mount();await screen.findByText('지정된 업무 운영자가 없습니다.');fireEvent.click(screen.getByRole('button',{name:'업무 운영자 초대'}));
 const dialog=within(screen.getByRole('dialog'));api.get.mockResolvedValueOnce({data:{data:{candidates:[]}}});
 fireEvent.change(dialog.getByLabelText('기존 사용자 검색'),{target:{value:'unknown'}});fireEvent.click(dialog.getByRole('button',{name:'사용자 검색'}));
 expect(await dialog.findByRole('status')).toHaveTextContent('검색 결과가 없습니다. 공통 계정이 없다면 이메일로 초대하세요.');
 expect(api.post).not.toHaveBeenCalled();
 fireEvent.change(dialog.getByLabelText('기존 사용자 검색'),{target:{value:'different'}});expect(dialog.queryByRole('status')).toBeNull();
 fireEvent.click(dialog.getByRole('button',{name:'취소'}));expect(screen.queryByText(/검색 결과가 없습니다/)).toBeNull();
});
