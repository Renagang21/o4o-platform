import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RegistrationRequestsPage from '../RegistrationRequestsPage';
const api = vi.hoisted(() => ({ getRegistrations: vi.fn(), batchProcess: vi.fn(), approve: vi.fn(), reject: vi.fn(), updateNotes: vi.fn() }));
vi.mock('../../../../lib/api/admin', () => ({ operatorRegistrationApi: api, operatorContactApi: {}, adminSettlementApi: {} }));
const records = [
  { id: 'pending-a', name: '검증대기회원', email: 'pending@example.invalid', role: 'supplier', service: 'neture', status: 'pending', createdAt: '2026-01-01' },
  { id: 'active-b', name: '검증승인회원', email: 'active@example.invalid', role: 'user', service: 'neture', status: 'active', createdAt: '2026-01-01' },
];
beforeEach(() => { vi.resetAllMocks(); api.getRegistrations.mockResolvedValue(records); api.batchProcess.mockResolvedValue({ success: true, data: { succeeded: ['pending-a'], failed: [] } }); });
afterEach(cleanup);
const show = () => render(<MemoryRouter><RegistrationRequestsPage /></MemoryRouter>);

it.each(['approve', 'reject'])('bulk %s keeps nonpending rows out of writes and reloads', async action => {
  show();
  await screen.findByText('검증대기회원');
  fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'ALL' } });
  await screen.findByText('검증승인회원');
  fireEvent.click(screen.getAllByRole('checkbox')[0]);
  expect(screen.getByText('2건 선택됨')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: action === 'approve' ? '일괄 승인 (1)' : '일괄 거부 (1)' }));
  await waitFor(() => expect(api.batchProcess).toHaveBeenCalledTimes(1));
  expect(api.batchProcess.mock.calls[0]).toEqual(action === 'approve' ? [['pending-a'], 'approve'] : [['pending-a'], 'reject', '운영자 일괄 거부']);
  await waitFor(() => expect(api.getRegistrations).toHaveBeenCalledTimes(2));
});

it('retains selection and existing failure feedback when a bulk write fails', async () => {
  api.batchProcess.mockRejectedValue(new Error('fixture failure'));
  show();
  await screen.findByText('검증대기회원');
  fireEvent.click(screen.getAllByRole('checkbox')[0]);
  fireEvent.click(screen.getByRole('button', { name: '일괄 승인 (1)' }));
  await screen.findByText('일괄 승인 처리 중 오류가 발생했습니다.');
  expect(screen.getByText('1건 선택됨')).toBeTruthy();
  expect(api.getRegistrations).toHaveBeenCalledTimes(1);
});

it('keeps a failed rejection reason and retries the same target', async () => {
  api.reject.mockResolvedValueOnce({ success: false }).mockResolvedValueOnce({ success: true });
  show(); await screen.findByText('검증대기회원');
  fireEvent.click(screen.getByRole('button', { name: '거부', exact: true }));
  fireEvent.change(screen.getByRole('textbox', { name: '처리 사유' }), { target: { value: '서류 확인 필요' } });
  fireEvent.click(screen.getByRole('button', { name: '거부 확인' }));
  await screen.findByRole('alert');
  expect((screen.getByRole('textbox', { name: '처리 사유' }) as HTMLTextAreaElement).value).toBe('서류 확인 필요');
  fireEvent.click(screen.getByRole('button', { name: '거부 확인' }));
  await waitFor(() => expect(api.reject).toHaveBeenCalledTimes(2));
  expect(api.reject.mock.calls).toEqual([['pending-a', '서류 확인 필요'], ['pending-a', '서류 확인 필요']]);
});

it('locks competing writes and keeps save success separate from read failure', async () => {
  let resolve!: (result: unknown) => void;
  api.approve.mockReturnValue(new Promise(r => { resolve = r; }));
  show(); await screen.findByText('검증대기회원');
  const approve = screen.getByRole('button', { name: '승인', exact: true });
  fireEvent.click(approve); fireEvent.click(approve);
  expect(api.approve).toHaveBeenCalledTimes(1);
  api.getRegistrations.mockRejectedValueOnce(new Error('read failed'));
  resolve({ success: true });
  await screen.findByText(/처리는 완료됐지만 목록 갱신/);
  fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
  await waitFor(() => expect(api.getRegistrations).toHaveBeenCalledTimes(3));
  expect(api.approve).toHaveBeenCalledTimes(1);
});

it('shows partial batch success and retries only failed members', async () => {
  api.getRegistrations.mockResolvedValue([...records, { ...records[0], id: 'pending-c', name: '다른대기회원' }]);
  api.batchProcess.mockResolvedValueOnce({ success: true, data: { succeeded: ['pending-a'], failed: [{ id: 'pending-c', error: 'fixture' }] } });
  show(); await screen.findByText('검증대기회원');
  fireEvent.click(screen.getAllByRole('checkbox')[0]);
  fireEvent.click(screen.getByRole('button', { name: '일괄 승인 (2)' }));
  await screen.findByText(/1건 승인 완료 · 1건 실패/);
  fireEvent.click(screen.getByRole('button', { name: '일괄 승인 (1)' }));
  await waitFor(() => expect(api.batchProcess).toHaveBeenCalledTimes(2));
  expect(api.batchProcess.mock.calls[1]).toEqual([['pending-c'], 'approve']);
});

it('does not turn an unsuccessful memo response into a success receipt', async () => {
  api.updateNotes.mockResolvedValue({ success: false });
  show(); await screen.findByText('검증대기회원');
  fireEvent.click(screen.getByRole('button', { name: '상세보기' }));
  fireEvent.click(screen.getByRole('button', { name: '작성' }));
  const note = screen.getByPlaceholderText(/내부 메모를 입력/);
  fireEvent.change(note, { target: { value: '남길 메모' } });
  fireEvent.click(screen.getByRole('button', { name: '저장', exact: true }));
  await screen.findByRole('alert');
  expect((note as HTMLTextAreaElement).value).toBe('남길 메모');
  expect(screen.queryByText('메모가 저장되었습니다.')).toBeNull();
});
it('keeps failed selections without announcing success or refreshing when every batch item failed', async () => {
  api.batchProcess.mockResolvedValue({ success: true, data: { succeeded: [], failed: [{ id: 'pending-a', error: 'fixture denial' }] } });
  show(); await screen.findByText('검증대기회원');
  fireEvent.click(screen.getAllByRole('checkbox')[0]);
  fireEvent.click(screen.getByRole('button', { name: '일괄 승인 (1)' }));
  await screen.findByText(/0건 승인 완료 · 1건 실패/);
  expect(screen.getByText('1건 선택됨')).toBeTruthy();
  expect(api.getRegistrations).toHaveBeenCalledTimes(1);
});
