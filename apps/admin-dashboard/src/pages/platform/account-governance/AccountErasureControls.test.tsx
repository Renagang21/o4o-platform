import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import AccountErasureControls from './AccountErasureControls';
const api=vi.hoisted(()=>({delete:vi.fn(),get:vi.fn(),post:vi.fn()}));
vi.mock('@/api/base',()=>({api}));
const pending={operationId:'fixture-operation',state:'retry_required',erased:false,reviewDueAt:null};
const completed={...pending,state:'completed',erased:true};
beforeEach(()=>{vi.clearAllMocks();vi.spyOn(window,'confirm').mockReturnValue(true);});
afterEach(()=>{cleanup();vi.restoreAllMocks();});
it('accepted/incomplete response does not call completion or show successful deletion',async()=>{
  api.delete.mockResolvedValue({data:{success:true,data:pending}});const done=vi.fn();
  render(<AccountErasureControls accountId="admin-a" userId="target-a" onCompleted={done}/>);
  fireEvent.click(screen.getByText('완전 제거 요청'));
  await screen.findByText(/처리 미완료/);expect(done).not.toHaveBeenCalled();expect(screen.queryByText('계정·일반 개인정보 제거 완료')).toBeNull();
});
it('status confirmation requires completed plus erased=true',async()=>{
  api.delete.mockResolvedValue({data:{data:pending}});api.get.mockResolvedValue({data:{data:completed}});const done=vi.fn();
  render(<AccountErasureControls accountId="admin-a" userId="target-a" onCompleted={done}/>);
  fireEvent.click(screen.getByText('완전 제거 요청'));await screen.findByText('상태 확인');
  fireEvent.click(screen.getByText('상태 확인'));await waitFor(()=>expect(done).toHaveBeenCalledTimes(1));
  expect(screen.getByText('계정·일반 개인정보 제거 완료')).toBeTruthy();
});
it('contradictory success response is an error, never a completion',async()=>{
  api.delete.mockResolvedValue({data:{data:{...completed,erased:false}}});const done=vi.fn();
  render(<AccountErasureControls accountId="admin-a" userId="target-a" onCompleted={done}/>);
  fireEvent.click(screen.getByText('완전 제거 요청'));await screen.findByRole('alert');expect(done).not.toHaveBeenCalled();
});
it('late response from the previous account/target is discarded',async()=>{
  let resolve:(v:unknown)=>void=()=>{};api.delete.mockReturnValue(new Promise(r=>{resolve=r;}));const done=vi.fn();
  const view=render(<AccountErasureControls accountId="admin-a" userId="target-a" onCompleted={done}/>);
  fireEvent.click(screen.getByText('완전 제거 요청'));view.rerender(<AccountErasureControls accountId="admin-b" userId="target-b" onCompleted={done}/>);
  resolve({data:{data:completed}});await waitFor(()=>expect(screen.getByText('완전 제거 요청')).toBeTruthy());expect(done).not.toHaveBeenCalled();
});
it('cancelled confirmation performs no deletion request',()=>{
  vi.mocked(window.confirm).mockReturnValue(false);render(<AccountErasureControls accountId="admin-a" userId="target-a" onCompleted={vi.fn()}/>);
  fireEvent.click(screen.getByText('완전 제거 요청'));expect(api.delete).not.toHaveBeenCalled();
});
it('Operator service-stop prerequisite is explained without claiming deletion',async()=>{
  api.delete.mockRejectedValue({response:{data:{code:'SERVICE_STOP_REQUIRED'}}});
  render(<AccountErasureControls accountId="admin-a" userId="target-a" onCompleted={vi.fn()}/>);
  fireEvent.click(screen.getByText('완전 제거 요청'));expect(await screen.findByRole('alert')).toHaveTextContent('Operator가 먼저');
});
