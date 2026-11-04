import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import CentralMemberWorkspace from './CentralMemberWorkspace';
import type { MemberDetail } from './member-workspace-model';
const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete:vi.fn() }));
vi.mock('@o4o/auth-client', () => ({ authClient: { api } }));
vi.mock('@/api/base',()=>({api}));
const base = '/qualifications/pharmacist/members';
const permissions = { qualifications: true, pharmacies: true, edit: true };
const rows = ['member-a', 'member-b'].map((userId, index) => ({ userId, name: `합성 회원 ${index + 1}`, email: `${userId}@example.test`, accountStatus: 'active', qualificationStatus: 'pending', pharmacyStatus: 'pending' }));
function detail(id = 'member-a'): MemberDetail {
  return { member: { userId: id, name: id === 'member-a' ? '합성 회원 1' : '합성 회원 2', nickname: '합성 별칭', email: `${id}@example.test`, phone: null, emailVerified: true, accountStatus: 'active', joinedAt: '2026-11-01', version: '2026-11-01T00:00:00.000001' },
    qualification: { licenseNumber: 'fixture-license', status: 'pending', reason: null, approvedAt: null, reviewedBy: null, version: '2026-11-01T00:00:00.000002' }, legacyLicense: 'legacy-license',
    pharmacies: [{ id: 'pharmacy-a', organizationId: 'org-a', name: '합성 약국', businessNumber: 'fixture-business', licenseNumber: 'fixture-license', status: 'pending', reason: null, appliedAt: '2026-11-01', decidedAt: null, decidedBy: null, address: '합성 주소', phone: null, representativeName: '합성 대표', businessType: '합성 업태', businessCategory: '합성 종목', documentId: null, contactName: '합성 담당자', managerPhone: null, contactEmail: 'contact@example.test', taxInvoiceEmail: 'tax@example.test' }], history: [], permissions };
}
beforeEach(() => {
  vi.clearAllMocks();
  api.get.mockImplementation(async (path: string) => ({ data: { data: path === base ? { items: rows, counts: { all: 2, qualifications: 2, pharmacies: 2, corrections: 0 }, permissions, hasNext: false } : detail(path.split('/').pop()) } }));
  api.post.mockResolvedValue({ data: { success: true } }); api.patch.mockResolvedValue({ data: { success: true } });
});
afterEach(cleanup);
const select = async () => { fireEvent.click(await screen.findByRole('button', { name: /합성 회원 1/ })); return screen.findByRole('region', { name: '선택 회원 작업' }); };
it('opens complete member and pharmacy submissions above the member list with no separate detail drawer', async () => {
  render(<CentralMemberWorkspace actorId="reviewer" />);
  expect(screen.queryByRole('region', { name: '선택 회원 작업' })).toBeNull();
  const panel = await select();
  await within(panel).findByText('합성 업태');
  expect(within(panel).getByText('fixture-business')).toBeInTheDocument();
  expect(within(panel).getByText('legacy-license')).toBeInTheDocument();
  expect(within(panel).getByLabelText('약사 면허번호')).toHaveValue('fixture-license');
  expect(within(panel).getByLabelText('약사 면허번호')).toHaveAttribute('readonly');
  expect(within(panel).getByRole('button', { name: '약국 승인' })).toBeDisabled();
  expect(panel.compareDocumentPosition(screen.getByRole('table')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});
it('changes task tabs and clears the previous private detail immediately', async () => {
  render(<CentralMemberWorkspace actorId="reviewer" />); await select(); await screen.findByText('legacy-license');
  fireEvent.click(screen.getByRole('tab', { name: /약국 심사 대기/ }));
  expect(screen.queryByText('legacy-license')).toBeNull();
  await waitFor(() => expect(api.get).toHaveBeenCalledWith(base, { params: { task: 'pharmacies', page: 1, q: '' } }));
});
it('requires a reason and evidence, then submits the exact selected qualification version and refreshes', async () => {
  render(<CentralMemberWorkspace actorId="reviewer" />); await select();
  fireEvent.click(await screen.findByRole('button', { name: '약사 자격 승인 검토' }));
  expect(screen.getByRole('button', { name: '처리 결과 저장' })).toBeDisabled();
  fireEvent.change(screen.getByLabelText('처리·보완 사유'), { target: { value: '합성 면허 근거 확인' } });
  expect(screen.getByRole('button', { name: '처리 결과 저장' })).toBeDisabled();
  fireEvent.click(screen.getByLabelText('신청자 본인의 면허 근거를 별도로 확인했습니다.'));
  fireEvent.click(screen.getByRole('button', { name: '처리 결과 저장' }));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith('/qualifications/pharmacist/review/member-a', { action: 'approve', reason: '합성 면허 근거 확인', version: detail().qualification!.version, licenseEvidenceChecked: true }));
  expect(await screen.findByText(/처리 결과를 저장했습니다/)).toBeInTheDocument();
});
it('keeps a conflict and the operator draft visible until explicit reload without claiming success', async () => {
  api.patch.mockRejectedValueOnce({ response: { data: { error: '회원 정보가 변경되었습니다. 다시 조회해 주세요.' } } });
  render(<CentralMemberWorkspace actorId="reviewer" />); await select();
  fireEvent.click(await screen.findByRole('button', { name: '수정',exact:true }));
  fireEvent.change(screen.getByLabelText('이름'), { target: { value: '정정 합성 회원' } });
  fireEvent.change(screen.getByLabelText('수정 사유'), { target: { value: '본인 요청 확인' } });
  fireEvent.click(screen.getByRole('button', { name: '회원 정보 저장' }));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('회원 정보가 변경'));
  expect(api.patch.mock.calls[0][1]).toEqual({ name: '정정 합성 회원', nickname: '합성 별칭', phone: '', email:'member-a@example.test',licenseNumber:'fixture-license',qualificationVersion:detail().qualification!.version,evidenceConfirmed:false, reason: '본인 요청 확인', version: detail().member.version });
  expect(screen.getByLabelText('수정 사유')).toHaveValue('본인 요청 확인');
  expect(screen.getByLabelText('이름')).toHaveValue('정정 합성 회원');
  fireEvent.click(screen.getByRole('button',{name:'최신 정보 다시 조회'}));
  await waitFor(()=>expect(screen.getByLabelText('이름')).toHaveValue('합성 회원 1'));
  expect(screen.queryByText(/처리 결과를 저장했습니다/)).toBeNull();
});
it('does not render restricted tasks, licenses, documents or edit actions for a directory-only reviewer', async () => {
  const limited = { qualifications: false, pharmacies: false, edit: false };
  api.get.mockImplementation(async (path: string) => ({ data: { data: path === base ? { items: rows, counts: { all: 2 }, permissions: limited } : { ...detail(), qualification: null, legacyLicense: null, pharmacies: [], permissions: limited } } }));
  render(<CentralMemberWorkspace actorId="reviewer" />); await select();
  await screen.findByText(/면허번호와 자격 심사 사유는/);
  expect(screen.queryByRole('tab', { name: /약사 검토 대기/ })).toBeNull();
  expect(screen.queryByText('fixture-license')).toBeNull();
  expect(screen.queryByRole('button', { name: '수정',exact:true })).toBeNull();
});
it('ignores a late response for the previously selected member', async () => {
  let resolveFirst!: (value: unknown) => void;
  api.get.mockImplementation((path: string) => path === base ? Promise.resolve({ data: { data: { items: rows, counts: {}, permissions } } }) : path.endsWith('/member-a') ? new Promise(resolve => { resolveFirst = resolve; }) : Promise.resolve({ data: { data: detail('member-b') } }));
  render(<CentralMemberWorkspace actorId="reviewer" />); await select();
  fireEvent.click(screen.getByRole('button', { name: /합성 회원 2/ }));
  await screen.findByText('legacy-license');
  resolveFirst({ data: { data: { ...detail(), legacyLicense: 'stale-private-license' } } });
  await waitFor(() => expect(screen.queryByText('stale-private-license')).toBeNull());
  expect(within(screen.getByRole('region', { name: '선택 회원 작업' })).getByText(/member-b@example.test/)).toBeInTheDocument();
});
it.each([false, true])('shows legacy application fields only with the application-review duty (%s)', async applications => {
  const scoped = { ...permissions, applications };
  api.get.mockImplementation(async (path: string) => ({ data: { data: path === base ? { items: rows, counts: {}, permissions: scoped } : { ...detail(), permissions: scoped, legacyBusiness: { name: '과거 합성 사업장' } } } }));
  render(<CentralMemberWorkspace actorId="reviewer" />); await select();
  await screen.findByText('fixture-business');
  expect(screen.queryByText('과거 합성 사업장') !== null).toBe(applications);
});

it('restores row/header selection and the standard top action bar; edits require a single selection', async()=>{
 render(<CentralMemberWorkspace actorId="reviewer"/>);
 await screen.findByRole('button',{name:/합성 회원 1/});
 const table=screen.getByRole('table');const boxes=within(table).getAllByRole('checkbox');expect(boxes).toHaveLength(3);
 fireEvent.click(boxes[0]);
 expect(screen.getByRole('button',{name:'회원 상세보기'})).toBeEnabled();
 expect(screen.getByRole('button',{name:'회원 정보 수정'})).toBeDisabled();
 fireEvent.click(boxes[2]);
 fireEvent.click(screen.getByRole('button',{name:'회원 정보 수정'}));
 await waitFor(()=>expect(screen.getByLabelText('이름')).not.toHaveAttribute('readonly'));
 expect(screen.getByLabelText('이름')).toHaveValue('합성 회원 1');
 fireEvent.click(screen.getByRole('tab',{name:/전체 회원/}));
 fireEvent.click(screen.getByRole('tab',{name:/약국 심사 대기/}));
 await waitFor(()=>expect(screen.queryByRole('button',{name:'회원 상세보기'})).not.toBeInTheDocument());
});
it('submits pharmacy business corrections with evidence, reason, and exact version',async()=>{
 api.get.mockImplementation(async(path:string)=>({data:{data:path===base?{items:rows,counts:{},permissions}:{...detail(),pharmacies:detail().pharmacies.map(p=>({...p,version:'a'.repeat(32),businessNumber:'1234567890'}))}}}));
 render(<CentralMemberWorkspace actorId="reviewer"/>);await select();
 fireEvent.click(await screen.findByRole('button',{name:'약국·사업자 정보 수정'}));
 expect(screen.getByLabelText('약국 신청 면허번호')).toHaveAttribute('maxlength','30');
 fireEvent.change(screen.getByLabelText('대표자명'),{target:{value:'정정 합성 대표'}});
 fireEvent.change(screen.getByLabelText('사업자 정보 정정 사유'),{target:{value:'제출 근거 대조'}});
 expect(screen.getByRole('button',{name:'사업자 정보 저장'})).toBeDisabled();
 fireEvent.click(screen.getByLabelText('사업자등록 정보와 정정 근거를 확인했습니다.'));
 fireEvent.click(screen.getByRole('button',{name:'사업자 정보 저장'}));
 await waitFor(()=>expect(api.patch).toHaveBeenCalledWith(expect.stringContaining('/pharmacies/'),expect.objectContaining({version:'a'.repeat(32),evidenceConfirmed:true,reason:'제출 근거 대조',fields:expect.objectContaining({representativeName:'정정 합성 대표'})})));
});

it('connects pending registration rejection to the selected account with an explicit reason',async()=>{
 const scoped={...permissions,manageAccount:true,erase:true};
 api.get.mockImplementation(async(path:string)=>({data:{data:path===base?{items:rows.map(r=>({...r,accountStatus:'pending'})),counts:{},permissions:scoped}:{...detail(),member:{...detail().member,accountStatus:'pending'},permissions:scoped}}}));
 render(<CentralMemberWorkspace actorId="reviewer"/>);await select();
 fireEvent.click(screen.getByRole('button',{name:'가입 거부',exact:true}));
 await screen.findByText(/대기 중인 계정 가입만/);
 fireEvent.change(screen.getByLabelText('처리·보완 사유'),{target:{value:'가입 자료 확인 후 거부'}});
 fireEvent.click(screen.getByRole('button',{name:'처리 결과 저장'}));
 await waitFor(()=>expect(api.post).toHaveBeenCalledWith(`${base}/member-a/reject-registration`,{reason:'가입 자료 확인 후 거부',version:detail().member.version}));
});
it('uses the existing account erasure workflow and never reports a pending review as deletion success',async()=>{
 const scoped={...permissions,manageAccount:true,erase:true};
 api.get.mockImplementation(async(path:string)=>({data:{data:path===base?{items:rows,counts:{},permissions:scoped}:{...detail(),permissions:scoped}}}));
 api.delete.mockResolvedValue({data:{data:{state:'review_required',erased:false,operationId:'synthetic-operation'}}});
 const confirm=vi.spyOn(window,'confirm').mockReturnValue(true);
 try{
  render(<CentralMemberWorkspace adminMode actorId="reviewer"/>);await select();
  fireEvent.click(screen.getByRole('button',{name:'계정·개인자료 삭제 확인',exact:true}));
  fireEvent.click(await screen.findByRole('button',{name:'계정·개인자료 완전삭제'}));
  await screen.findByText(/삭제 미완료 — 확인 필요.*삭제 미완료/);
  expect(api.delete).toHaveBeenCalledWith('/admin/users/member-a');
  expect(screen.queryByText('계정·개인자료 삭제 완료')).not.toBeInTheDocument();
 }finally{confirm.mockRestore();}
});

it('drops old selection, rows and private detail when detail authority is revoked',async()=>{
 api.get.mockImplementation(async(path:string)=>{if(path===base)return {data:{data:{items:rows,counts:{},permissions}}};throw {response:{status:403,data:{error:'현재 회원 업무 위임이 회수되었습니다.'}}};});
 render(<CentralMemberWorkspace actorId="reviewer"/>);
 fireEvent.click(await screen.findByRole('button',{name:/합성 회원 1/}));
 await screen.findByText('현재 회원 업무 위임이 회수되었습니다.');
 expect(screen.queryByRole('button',{name:'회원 상세보기'})).not.toBeInTheDocument();
 expect(screen.queryByText('member-a@example.test')).not.toBeInTheDocument();
 expect(screen.queryByText('legacy-license')).not.toBeInTheDocument();
});

it('locks member commands and selection until a delayed erasure response is processed',async()=>{
 const scoped={...permissions,manageAccount:true,erase:true};let finish!:(value:unknown)=>void;
 api.get.mockImplementation(async(path:string)=>({data:{data:path===base?{items:rows,counts:{},permissions:scoped}:{...detail(),permissions:scoped}}}));
 api.delete.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
 const confirm=vi.spyOn(window,'confirm').mockReturnValue(true);
 try{
  render(<CentralMemberWorkspace adminMode actorId="reviewer"/>);await select();
  fireEvent.click(screen.getByRole('button',{name:'계정·개인자료 삭제 확인',exact:true}));
  fireEvent.click(await screen.findByRole('button',{name:'계정·개인자료 완전삭제'}));
  expect(screen.getByRole('button',{name:'회원 정보 수정',exact:true})).toBeDisabled();
  expect(screen.getByRole('tab',{name:/약국 심사 대기/})).toBeDisabled();
  fireEvent.click(within(screen.getByRole('table')).getAllByRole('checkbox')[2]);
  expect(within(screen.getByRole('table')).getAllByRole('checkbox')[1]).toBeChecked();
  expect(within(screen.getByRole('table')).getAllByRole('checkbox')[2]).not.toBeChecked();
  await act(async()=>{finish({data:{data:{state:'review_required',erased:false,operationId:'delayed-operation'}}});});
  await screen.findByText(/삭제 미완료 — 확인 필요.*삭제 미완료/);
  expect(screen.queryByRole('button',{name:'회원 정보 수정',exact:true})).not.toBeInTheDocument();
  expect(within(screen.getByRole('table')).getAllByRole('checkbox')[1]).not.toBeChecked();
  expect(screen.getByRole('button',{name:'상태 확인'})).toBeInTheDocument();
 }finally{confirm.mockRestore();}
});

it('switches from detail into editing without another fetch or a transient return to readonly',async()=>{
 render(<CentralMemberWorkspace actorId="reviewer"/>);await select();
 await screen.findByRole('form',{name:'회원 정보 보기'});
 const calls=api.get.mock.calls.length;
 fireEvent.click(screen.getByRole('button',{name:'회원 정보 수정',exact:true}));
 expect(screen.getByRole('form',{name:'회원 정보 수정'})).toBeInTheDocument();
 expect(screen.getByLabelText('이름')).not.toHaveAttribute('readonly');
 fireEvent.change(screen.getByLabelText('이름'),{target:{value:'유지할 정정'}});
 fireEvent(window,new Event('focus'));
 await act(async()=>Promise.resolve());
 expect(api.get).toHaveBeenCalledTimes(calls);
 expect(screen.getByLabelText('이름')).toHaveValue('유지할 정정');
});
it('requires evidence for email or license corrections and submits both current versions',async()=>{
 render(<CentralMemberWorkspace actorId="reviewer"/>);await select();
 fireEvent.click(screen.getByRole('button',{name:'회원 정보 수정',exact:true}));
 fireEvent.change(screen.getByLabelText('이메일'),{target:{value:'corrected@example.test'}});
 fireEvent.change(screen.getByLabelText('약사 면허번호'),{target:{value:'corrected-license'}});
 fireEvent.change(screen.getByLabelText('수정 사유'),{target:{value:'본인 제출 자료 정정'}});
 expect(screen.getByRole('button',{name:'회원 정보 저장'})).toBeDisabled();
 fireEvent.click(screen.getByLabelText('이메일·면허 정정 근거를 확인했습니다.'));
 fireEvent.click(screen.getByRole('button',{name:'회원 정보 저장'}));
 await waitFor(()=>expect(api.patch).toHaveBeenCalledWith(`${base}/member-a`,expect.objectContaining({email:'corrected@example.test',licenseNumber:'corrected-license',qualificationVersion:detail().qualification!.version,evidenceConfirmed:true})));
});
it('shows a one-time temporary password only after authorized issuance and clears it when selection changes',async()=>{
 api.post.mockResolvedValue({data:{data:{temporaryPassword:'Synthetic-only-123!',expiresAt:'2026-11-05T00:00:00Z'}}});
 render(<CentralMemberWorkspace actorId="reviewer"/>);await select();
 fireEvent.click(screen.getByRole('button',{name:'회원 정보 수정',exact:true}));
 fireEvent.click(screen.getByRole('button',{name:'임시 비밀번호 발급'}));
 expect(screen.getByRole('button',{name:'발급',exact:true})).toBeDisabled();
 fireEvent.change(screen.getByLabelText('발급 사유'),{target:{value:'합성 회원 요청'}});
 fireEvent.click(screen.getByLabelText('본인 요청과 비밀번호 전달 대상을 확인했습니다.'));
 fireEvent.click(screen.getByRole('button',{name:'발급',exact:true}));
 expect(await screen.findByLabelText('발급된 임시 비밀번호')).toHaveTextContent('Synthetic-only-123!');
 expect(api.post).toHaveBeenCalledWith(`${base}/member-a/temporary-password`,{version:detail().member.version,reason:'합성 회원 요청',evidenceConfirmed:true});
 fireEvent.click(screen.getByRole('button',{name:/합성 회원 2/}));
 await waitFor(()=>expect(screen.queryByText('Synthetic-only-123!')).toBeNull());
});

it('clears private fields instead of preserving a draft when write authority is revoked',async()=>{
 api.patch.mockRejectedValueOnce({response:{status:403,data:{error:'회원 업무 권한이 회수되었습니다.'}}});
 render(<CentralMemberWorkspace actorId="reviewer"/>);await select();
 fireEvent.click(screen.getByRole('button',{name:'회원 정보 수정',exact:true}));
 fireEvent.change(screen.getByLabelText('수정 사유'),{target:{value:'정정'}});
 fireEvent.click(screen.getByRole('button',{name:'회원 정보 저장'}));
 await screen.findByText('회원 업무 권한이 회수되었습니다.');
 expect(screen.queryByLabelText('이메일')).toBeNull();expect(screen.queryByRole('region',{name:'선택 회원 작업'})).toBeNull();
});

it('removes private fields when authority is lost during temporary password issuance',async()=>{
 api.post.mockRejectedValueOnce({response:{status:403,data:{error:'권한 회수'}}});
 render(<CentralMemberWorkspace actorId="reviewer"/>);await select();
 fireEvent.click(screen.getByRole('button',{name:'회원 정보 수정',exact:true}));
 fireEvent.click(screen.getByRole('button',{name:'임시 비밀번호 발급'}));
 fireEvent.change(screen.getByLabelText('발급 사유'),{target:{value:'본인 요청'}});
 fireEvent.click(screen.getByLabelText('본인 요청과 비밀번호 전달 대상을 확인했습니다.'));
 fireEvent.click(screen.getByRole('button',{name:'발급',exact:true}));
 await screen.findByText('현재 회원 업무 권한을 다시 확인해 주세요.');
 expect(screen.queryByLabelText('이메일')).toBeNull();expect(screen.queryByRole('region',{name:'선택 회원 작업'})).toBeNull();
});

it('preserves the selected pharmacy approval command when entered from the top pharmacy action',async()=>{
 api.get.mockImplementation(async(path:string)=>({data:{data:path===base?{items:rows,counts:{},permissions}:{...detail(),qualification:{...detail().qualification!,status:'approved'}}}}));
 render(<CentralMemberWorkspace actorId="reviewer"/>);await select();
 fireEvent.click(screen.getByRole('button',{name:'약국·사업자 정보',exact:true}));
 fireEvent.click(await screen.findByRole('button',{name:'약국 승인',exact:true}));
 fireEvent.change(screen.getByLabelText('처리·보완 사유'),{target:{value:'사업자 제출 근거 확인'}});
 fireEvent.click(screen.getByLabelText('신청자와 약국·사업자 정보 및 승인 조건을 확인했습니다.'));
 fireEvent.click(screen.getByRole('button',{name:'처리 결과 저장'}));
 await waitFor(()=>expect(api.post).toHaveBeenCalledWith('/neture/operator/pharmacy-memberships/pharmacy-a/approve',{reason:'사업자 제출 근거 확인'}));
});
it('uses the authorized member verification endpoint for an unverified social-only member',async()=>{
 api.get.mockImplementation(async(path:string)=>({data:{data:path===base?{items:rows,counts:{},permissions}:{...detail(),member:{...detail().member,emailVerified:false,hasPassword:false}}}}));
 api.post.mockResolvedValue({data:{data:{requested:true,alreadyVerified:false}}});
 render(<CentralMemberWorkspace actorId="reviewer"/>);await select();
 fireEvent.click(await screen.findByRole('button',{name:'확인 메일 보내기'}));
 await screen.findByText('확인 메일 요청을 접수했습니다.');
 expect(api.post).toHaveBeenCalledWith(`${base}/member-a/verification-email`,{version:detail().member.version});
});
