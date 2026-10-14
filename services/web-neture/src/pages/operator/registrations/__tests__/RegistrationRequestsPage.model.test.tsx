import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RegistrationRequestsPage from '../RegistrationRequestsPage';
const api = vi.hoisted(() => ({ getRegistrations: vi.fn(), batchProcess: vi.fn(), approve: vi.fn(), reject: vi.fn(), updateNotes: vi.fn() }));
vi.mock('../../../../lib/api', () => ({ operatorRegistrationApi: api }));
const records = [
  { id: 'pending-a', name: '검증대기회원', email: 'pending@example.invalid', role: 'supplier', service: 'neture', status: 'pending', createdAt: '2026-01-01' },
  { id: 'active-b', name: '검증승인회원', email: 'active@example.invalid', role: 'user', service: 'neture', status: 'active', createdAt: '2026-01-01' },
];
beforeEach(() => { vi.resetAllMocks(); api.getRegistrations.mockResolvedValue(records); api.batchProcess.mockResolvedValue({ success: true }); });
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
