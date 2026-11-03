import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import MemberLifecycleActions from './MemberLifecycleActions';
import type { MemberDetail } from './member-workspace-model';
const api=vi.hoisted(()=>({post:vi.fn()}));
vi.mock('@o4o/auth-client',()=>({authClient:{api}}));
const detail={member:{userId:'target',version:'synthetic-version'},permissions:{edit:true,manageAccount:true},
  pharmacies:[{organizationId:'organization',name:'합성 약국',status:'active'}]} as MemberDetail;
beforeEach(()=>{api.post.mockReset();api.post.mockResolvedValue({data:{success:true}});});
afterEach(cleanup);
const renderActions=(data=detail)=>render(<MemberLifecycleActions detail={data} actorId="admin" busy={false} perform={async work=>{await work();}}/>);
const confirmReason=()=>fireEvent.change(screen.getByLabelText('이용 관리 사유'),{target:{value:'합성 확인 사유'}});
it('keeps access termination distinct from personal or business data deletion',async()=>{
  renderActions();fireEvent.click(screen.getByText('이용 정지·직원 이용 해지'));
  expect(screen.getByRole('button',{name:'이용 정지·해지 실행'})).toBeDisabled();
  confirmReason();fireEvent.click(screen.getByLabelText('이용 정지와 직원 소속 해지를 확인했습니다.'));
  fireEvent.click(screen.getByRole('button',{name:'이용 정지·해지 실행'}));
  await waitFor(()=>expect(api.post).toHaveBeenCalledWith('/qualifications/pharmacist/members/target/stop-access',{reason:'합성 확인 사유',version:'synthetic-version'}));
});
it('sale requires both-party confirmation and sends the selected organization and new owner email',async()=>{
  renderActions();fireEvent.click(screen.getByText('약국 매도·경영자 이전'));confirmReason();
  fireEvent.change(screen.getByLabelText('새 경영자 가입 이메일'),{target:{value:'next@fixture.invalid'}});
  expect(screen.getByRole('button',{name:'경영자 이전 실행'})).toBeDisabled();
  fireEvent.click(screen.getByLabelText('약국 매도와 자료 이전에 대해 양측의 확인을 받았습니다.'));
  fireEvent.click(screen.getByRole('button',{name:'경영자 이전 실행'}));
  await waitFor(()=>expect(api.post).toHaveBeenCalledWith('/qualifications/pharmacist/members/target/pharmacies/organization/transfer',{reason:'합성 확인 사유',nextOwnerEmail:'next@fixture.invalid',transferConfirmed:true}));
});
it('closure has a separate irreversible confirmation and never sends the sale request',async()=>{
  renderActions();fireEvent.click(screen.getByText('약국 완전폐업·자료삭제'));confirmReason();
  expect(screen.getByRole('button',{name:'완전폐업·자료삭제 실행'})).toBeDisabled();
  fireEvent.click(screen.getByLabelText('매도가 아닌 완전폐업이며 약국 자료 삭제를 확인했습니다.'));
  fireEvent.click(screen.getByRole('button',{name:'완전폐업·자료삭제 실행'}));
  await waitFor(()=>expect(api.post).toHaveBeenCalledWith('/qualifications/pharmacist/members/target/pharmacies/organization/close',{reason:'합성 확인 사유',closureConfirmed:true}));
});
it('operators cannot see sale or closure controls and own-account actions stay hidden',()=>{
  const view=renderActions({...detail,permissions:{...detail.permissions,manageAccount:false}});
  expect(screen.queryByText('약국 매도·경영자 이전')).toBeNull();expect(screen.queryByText('약국 완전폐업·자료삭제')).toBeNull();
  view.rerender(<MemberLifecycleActions detail={detail} actorId="target" busy={false} perform={async()=>{}}/>);
  expect(screen.queryByRole('region')).toBeNull();expect(screen.queryByText('이용 정지·직원 이용 해지')).toBeNull();
});
