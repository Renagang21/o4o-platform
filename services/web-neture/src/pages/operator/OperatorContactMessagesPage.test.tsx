import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import Page from './OperatorContactMessagesPage';
const api = vi.hoisted(() => ({ list: vi.fn(), markRead: vi.fn(), bulkMarkRead: vi.fn() }));
vi.mock('../../lib/api/admin', () => ({ operatorContactApi: api, operatorRegistrationApi: {}, adminSettlementApi: {} }));
const row = { id: 'fixture', name: '합성 문의자', subject:'선택한 문의',email:'fixture@example.invalid',contactType: 'supplier', status: 'new', createdAt: '2026-01-01',updatedAt:'version' };
const result = { items: [row], pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } };
beforeEach(() => { vi.resetAllMocks(); api.list.mockResolvedValue(result);api.markRead.mockResolvedValue({skipped:false}); });
afterEach(cleanup);
async function select(){fireEvent.click(await screen.findByLabelText('선택한 문의 문의 선택'));}
it('shows actions only after selection and never calls the old all-supplier bulk endpoint', async () => {
  render(<Page/>);await screen.findByText('합성 문의자');expect(screen.queryByRole('button',{name:'선택 문의 확인'})).toBeNull();
  await select();fireEvent.click(screen.getByRole('button',{name:'선택 문의 확인'}));await screen.findByText('1 성공');
  expect(api.markRead).toHaveBeenCalledWith(row);expect(api.bulkMarkRead).not.toHaveBeenCalled();
});
it('ignores a slow response for the previous filter', async () => {
  let first!: (value: unknown) => void;
  api.list.mockImplementationOnce(() => new Promise(resolve => { first = resolve; }));
  render(<Page />);fireEvent.change(screen.getByLabelText('문의 상태'), { target: { value: 'resolved' } });
  await screen.findByText('합성 문의자');await act(async () => first({ ...result, items: [] }));expect(screen.getByText('합성 문의자')).toBeTruthy();
});
it('preserves write success when refresh fails and retries only the query', async () => {
  render(<Page />);await select();api.list.mockRejectedValueOnce(new Error('갱신 실패'));
  fireEvent.click(screen.getByRole('button',{name:'선택 문의 확인'}));await screen.findByText('갱신 실패');
  expect(screen.getByRole('status').textContent).toContain('1건 성공');
  fireEvent.click(screen.getByRole('button',{name:'닫기'}));fireEvent.click(screen.getByRole('button',{name:'다시 시도'}));
  await screen.findByText('합성 문의자');expect(api.markRead).toHaveBeenCalledTimes(1);
});
it('locks duplicate commands and filter changes until the post-write query finishes', async () => {
  let finish!: (value: unknown) => void;api.markRead.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  render(<Page />);await select();const button=screen.getByRole('button',{name:'선택 문의 확인'});fireEvent.click(button);fireEvent.click(button);expect(api.markRead).toHaveBeenCalledTimes(1);
  fireEvent.change(screen.getByLabelText('문의 상태'),{target:{value:'resolved'}});expect((screen.getByLabelText('문의 상태') as HTMLSelectElement).value).toBe('');
  let read!:(value:unknown)=>void;api.list.mockImplementationOnce(()=>new Promise(resolve=>{read=resolve;}));
  await act(async()=>finish({skipped:false}));expect((screen.getByLabelText('문의 상태') as HTMLSelectElement).disabled).toBe(true);
  await act(async()=>read(result));
});
it('reports partial failures and retries only the failed selected ID',async()=>{
 const other={...row,id:'other',subject:'다른 문의'};api.list.mockResolvedValue({...result,items:[row,other]});
 api.markRead.mockResolvedValueOnce({skipped:false}).mockRejectedValueOnce(new Error('conflict')).mockResolvedValueOnce({skipped:false});
 render(<Page/>);await select();fireEvent.click(screen.getByLabelText('다른 문의 문의 선택'));fireEvent.click(screen.getByRole('button',{name:'선택 문의 확인'}));
 await screen.findByText('1 실패');expect(api.markRead).toHaveBeenCalledTimes(2);fireEvent.click(await screen.findByRole('button',{name:'실패 1건 재시도'}));
 await waitFor(()=>expect(api.markRead).toHaveBeenCalledTimes(3));expect(api.markRead.mock.calls[2][0].id).toBe('other');
});
it('does not refresh after a write finishes following unmount', async () => {
  let finish!:(value:unknown)=>void;api.markRead.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
  const view=render(<Page/>);await select();fireEvent.click(screen.getByRole('button',{name:'선택 문의 확인'}));view.unmount();
  await act(async()=>finish({skipped:false}));expect(api.list).toHaveBeenCalledTimes(1);
});
it('renders a structured server conflict as failure text rather than crashing the result dialog',async()=>{
 api.markRead.mockRejectedValueOnce({response:{data:{error:{code:'CONTACT_CHANGED',message:'최신 문의를 확인하세요.'}}}});
 render(<Page/>);await select();fireEvent.click(screen.getByRole('button',{name:'선택 문의 확인',exact:true}));
 fireEvent.click(await screen.findByRole('button',{name:'실패 항목 1건 보기'}));expect(screen.getByText(/최신 문의를 확인하세요/)).toBeTruthy();
});
