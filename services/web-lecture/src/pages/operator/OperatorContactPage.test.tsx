import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const client = vi.hoisted(() => ({ get: vi.fn(), patch: vi.fn() }));
vi.mock('../../lib/apiClient', () => ({ api: client }));
import Page from './OperatorContactPage';
import { lectureContactApi } from '../../api/operatorContact';
const base = '/admin/services/lecture/contact-inquiries';
let detail: any;
beforeEach(() => {
  vi.resetAllMocks();
  detail = { id: 'fixture-contact', subject: '합성 강의 문의', name: '합성 문의자', email: 'synthetic@example.invalid', status: 'received', inquiryType: 'partnership', message: '합성 문의 본문', internalNote: null, createdAt: '2026-10-01T00:00:00Z' };
  client.get.mockImplementation(async path => ({ data: { data: path.endsWith('/replies') ? [] : path.includes('legacy-education') ? { items: [], pagination: { totalPages: 1 } } : path === base ? { items: [detail], pagination: { page: 1, totalPages: 1, total: 1, limit: 20 } } : detail } }));
});
afterEach(cleanup);
it('fixes query, status and note requests to lecture and unwraps the shared page envelope', async () => {
  client.patch.mockResolvedValue({ data: { data: detail } });
  expect(await lectureContactApi.list('another-service', { status: 'received', page: 2, limit: 20 })).toHaveProperty('items');
  expect(client.get).toHaveBeenCalledWith(base, { params: { status: 'received', page: 2, limit: 20 } });
  expect(await lectureContactApi.getDetail('lecture', detail.id)).toEqual(detail);
  await lectureContactApi.setStatus('lecture', detail.id, 'answered'); await lectureContactApi.setNote('lecture', detail.id, '내부 메모');
  expect(client.patch).toHaveBeenCalledWith(`${base}/${detail.id}/status`, { status: 'answered' });
  expect(client.patch).toHaveBeenCalledWith(`${base}/${detail.id}/note`, { internalNote: '내부 메모' });
});
it('a status success followed by note failure keeps the note and retries only the unfinished write', async () => {
  client.patch.mockImplementation(async (path, body) => {
    if (path.endsWith('/status')) { detail = { ...detail, status: body.status }; return { data: { data: detail } }; }
    throw new Error('메모 저장 실패');
  });
  render(<Page />); fireEvent.click(await screen.findByText('합성 강의 문의'));
  await screen.findByText('합성 문의 본문');
  fireEvent.change(screen.getByLabelText('문의 처리 상태'), { target: { value: 'answered' } });
  fireEvent.change(screen.getByLabelText('문의 내부 메모'), { target: { value: '보존할 내부 메모' } });
  fireEvent.click(screen.getByRole('button', { name: '저장' }));
  await screen.findByText('메모 저장 실패');
  expect((screen.getByLabelText('문의 내부 메모') as HTMLTextAreaElement).value).toBe('보존할 내부 메모');
  client.patch.mockImplementation(async (_path, body) => ({ data: { data: { ...detail, internalNote: body.internalNote } } }));
  fireEvent.click(screen.getByRole('button', { name: '저장' })); await screen.findByText('저장되었습니다.');
  await waitFor(() => expect((screen.getByRole('button', { name: '저장' }) as HTMLButtonElement).disabled).toBe(false));
  expect(client.patch.mock.calls.filter(([path]) => path.endsWith('/status'))).toHaveLength(1);
  expect(client.patch.mock.calls.filter(([path]) => path.endsWith('/note'))).toHaveLength(2);
});
