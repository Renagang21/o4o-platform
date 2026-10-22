import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { OperatorInbox, OperatorInboxLink } from './OperatorInbox';
afterEach(()=>{cleanup();vi.useRealTimers();});
const summary={name:'합성 조합',contact:{pending:1,oldest:'2026-10-01',deliveryAttention:1},tasks:[{key:'member',label:'조합 가입 검토',href:'/synthetic/operator',count:2,oldest:'2026-10-01',available:true}]};
const row={id:'synthetic',subject:'합성 문의',status:'received',notificationStatus:'inapp:fail',createdAt:'2026-10-01',version:'2026-10-01 00:00:00.123456'};
const detail={...row,name:'합성 문의자',email:'synthetic@example.invalid',message:'합성 문의 본문',internalNote:''};
const wrap=(data:unknown)=>({data:{data}});
function client(){return {get:vi.fn(async(url:string)=>wrap(url.endsWith('/manage')?summary:url.includes('/contacts/synthetic')?detail:{items:[row],totalPages:1})),patch:vi.fn(async()=>wrap({...detail,status:'in_review',internalNote:'남길 입력',version:'next'}))};}
it('shows actual work and retains notes on failed save, then retries only once',async()=>{
 const api=client();api.patch.mockRejectedValueOnce(new Error('synthetic'));
 render(<OperatorInbox client={api} endpoint="/operator-inbox/cooperative/synthetic"/>);
 await screen.findByText('합성 조합 미처리 업무');expect(screen.getByRole('link',{name:'조합 가입 검토'}).getAttribute('href')).toBe('/synthetic/operator');
 fireEvent.click(screen.getByRole('button',{name:'합성 문의'}));await screen.findByText('합성 문의 본문');
 fireEvent.change(screen.getByLabelText('문의 처리 상태'),{target:{value:'in_review'}});fireEvent.change(screen.getByLabelText('내부 메모'),{target:{value:'남길 입력'}});
 const save=screen.getByRole('button',{name:'처리 내용 저장'});fireEvent.click(save);fireEvent.click(save);await screen.findByRole('alert');expect(api.patch).toHaveBeenCalledTimes(1);
 expect((screen.getByLabelText('내부 메모')as HTMLTextAreaElement).value).toBe('남길 입력');
 fireEvent.click(save);await screen.findByText('문의 처리 내용을 저장했습니다.');expect(api.patch).toHaveBeenCalledTimes(2);expect((save as HTMLButtonElement).disabled).toBe(true);
 expect(api.patch).toHaveBeenLastCalledWith('/operator-inbox/cooperative/synthetic/manage/contacts/synthetic',{status:'in_review',internalNote:'남길 입력',expectedUpdatedAt:row.version});
});
it('does not resend a successful update when the follow-up list read fails',async()=>{
 const api=client();render(<OperatorInbox client={api} endpoint="/scope"/>);fireEvent.click(await screen.findByRole('button',{name:'합성 문의'}));await screen.findByText('합성 문의 본문');
 fireEvent.change(screen.getByLabelText('내부 메모'),{target:{value:'남길 입력'}});fireEvent.change(screen.getByLabelText('문의 처리 상태'),{target:{value:'in_review'}});
 api.get.mockRejectedValue(new Error('read failed'));fireEvent.click(screen.getByRole('button',{name:'처리 내용 저장'}));await screen.findByText(/저장은 완료됐지만/);expect((screen.getByRole('button',{name:'처리 내용 저장'})as HTMLButtonElement).disabled).toBe(true);expect(api.patch).toHaveBeenCalledTimes(1);
});
it('discards a late list after the filter changes',async()=>{
 const api=client();let resolve!:(v:any)=>void;api.get.mockImplementationOnce(()=>new Promise(r=>{resolve=r;}));
 render(<OperatorInbox client={api} endpoint="/scope"/>);fireEvent.change(screen.getByLabelText('문의 목록 상태'),{target:{value:'closed'}});await screen.findByText('합성 조합 미처리 업무');
 await act(async()=>resolve(wrap({...summary,name:'늦은 범위'})));expect(screen.queryByText('늦은 범위 미처리 업무')).toBeNull();
});
it('does not carry previous account details or save responses into the next keyed scope',async()=>{
 const api=client();let finish!:(v:any)=>void;api.patch.mockImplementationOnce(()=>new Promise(r=>{finish=r;}));
 const view=render(<OperatorInbox key="first" client={api} endpoint="/first"/>);fireEvent.click(await screen.findByRole('button',{name:'합성 문의'}));await screen.findByText('합성 문의 본문');fireEvent.change(screen.getByLabelText('내부 메모'),{target:{value:'old'}});fireEvent.click(screen.getByRole('button',{name:'처리 내용 저장'}));
 view.rerender(<OperatorInbox key="second" client={api} endpoint="/second"/>);await screen.findByText('합성 조합 미처리 업무');await act(async()=>finish(wrap({...detail,status:'answered'})));expect(screen.queryByText('합성 문의 본문')).toBeNull();expect(screen.queryByText('문의 처리 내용을 저장했습니다.')).toBeNull();
});
it('work indicator shows pending or query failure and never marks work read',async()=>{
 const api=client();const view=render(<OperatorInboxLink client={api} endpoint="/first" href="/operator/inbox"/>);await screen.findByRole('link',{name:/미처리 업무 있음/});
 const failed={get:vi.fn().mockRejectedValue(Error('failed'))};view.rerender(<OperatorInboxLink client={failed} endpoint="/other" href="/other"/>);await screen.findByRole('link',{name:/조회 확인 필요/});expect(api.patch).not.toHaveBeenCalled();
});
it('refreshes the indicator after a minute without overlapping pending requests',async()=>{
 vi.useFakeTimers();const api=client();render(<OperatorInboxLink client={api} endpoint="/scope" href="/inbox"/>);await act(async()=>{});expect(api.get).toHaveBeenCalledTimes(1);await act(async()=>vi.advanceTimersByTime(60000));expect(api.get).toHaveBeenCalledTimes(2);
});

it('discovers assigned business access from the server and hides a denied assignment',async()=>{
 const api={get:vi.fn().mockRejectedValue({response:{status:403}})};
 const view=render(<OperatorInboxLink requireAccess client={api} endpoint="/unassigned" href="/inbox"/>);
 expect(screen.queryByRole('link')).toBeNull();await act(async()=>{});expect(screen.queryByRole('link')).toBeNull();
 api.get.mockResolvedValue(wrap(summary));view.rerender(<OperatorInboxLink requireAccess client={api} endpoint="/assigned" href="/inbox"/>);
 expect(await screen.findByRole('link',{name:/미처리 업무 있음/})).toBeTruthy();
 api.get.mockRejectedValue({response:{status:403}});view.rerender(<OperatorInboxLink requireAccess client={api} endpoint="/revoked" href="/inbox"/>);
 await act(async()=>{});expect(screen.queryByRole('link')).toBeNull();
});

it('reply network retry keeps the request id and unsaved note; completed send does not patch the inquiry',async()=>{
 const api={...client(),post:vi.fn().mockRejectedValueOnce(Error('uncertain')).mockResolvedValue(wrap({status:'sent'}))};
 render(<OperatorInbox client={api} endpoint="/scope"/>);fireEvent.click(await screen.findByRole('button',{name:'합성 문의'}));await screen.findByText('합성 문의 본문');
 fireEvent.change(screen.getByLabelText('내부 메모'),{target:{value:'미저장 메모'}});
 fireEvent.change(screen.getByLabelText('답변 내용'),{target:{value:'답변 안내'}});
 const send=screen.getByRole('button',{name:'답변 이메일 발송'});fireEvent.click(send);fireEvent.click(send);
 await screen.findByRole('alert');expect(api.post).toHaveBeenCalledTimes(1);
 expect((screen.getByLabelText('답변 내용') as HTMLTextAreaElement).value).toBe('답변 안내');
 fireEvent.click(send);await screen.findByText('답변 발송을 완료했습니다.');
 expect(api.post.mock.calls[0][1]).toEqual(api.post.mock.calls[1][1]);
 expect((screen.getByLabelText('내부 메모') as HTMLTextAreaElement).value).toBe('미저장 메모');expect(api.patch).not.toHaveBeenCalled();
});
it('notification repair is explicit and does not send an email or change work status',async()=>{
 const api={...client(),post:vi.fn().mockResolvedValue(wrap({status:'sent',created:0}))};
 render(<OperatorInbox client={api} endpoint="/scope"/>);fireEvent.click(await screen.findByRole('button',{name:'합성 문의'}));await screen.findByText('합성 문의 본문');
 fireEvent.change(screen.getByLabelText('문의 처리 상태'),{target:{value:'in_review'}});
 fireEvent.change(screen.getByLabelText('내부 메모'),{target:{value:'보존할 메모'}});
 fireEvent.click(screen.getByRole('button',{name:'담당자 알림 재확인·미전달 복구'}));await screen.findByText(/새 전달 0건/);
 expect((screen.getByLabelText('문의 처리 상태') as HTMLSelectElement).value).toBe('in_review');
 expect((screen.getByLabelText('내부 메모') as HTMLTextAreaElement).value).toBe('보존할 메모');
 expect(api.post).toHaveBeenCalledExactlyOnceWith('/scope/manage/contacts/synthetic/retry-notification',{});expect(api.patch).not.toHaveBeenCalled();
});
