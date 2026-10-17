import { supplierReviewApi } from '../../lib/api/supplierReview';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Page from './OperatorSupplierApprovalPage';
const api = vi.hoisted(() => ({ getSuppliersPaged: vi.fn(), rejectSupplier: vi.fn(), downloadDocument: vi.fn(), approveSupplier: vi.fn(), updateBasicInfo: vi.fn(), batchProcess: vi.fn() }));
vi.mock('../../lib/api', () => ({ operatorSupplierApi: api, PROFILE_FIELD_LABELS: {} }));
const supplier = { id: 'supplier', name: '합성 공급자', status: 'PENDING', createdAt: '2026-01-01', businessRegistrationDocumentId: 'document', profileComplete: true };
beforeEach(() => { vi.resetAllMocks(); api.getSuppliersPaged.mockResolvedValue({ items: [supplier], pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } }); });
afterEach(cleanup);
it('keeps a rejected request reason after failure so the operator can retry', async () => {
  api.rejectSupplier.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
  render(<MemoryRouter><Page /></MemoryRouter>);
  fireEvent.click(await screen.findByText('합성 공급자'));
  fireEvent.click(screen.getByRole('button', { name: '승인 거절' }));
  const dialog = screen.getByRole('dialog', { name: '공급자 거절' });
  fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: '보존할 사유' } });
  fireEvent.click(within(dialog).getByRole('button', { name: '거절' }));
  await within(dialog).findByRole('alert');
  expect((within(dialog).getByRole('textbox') as HTMLTextAreaElement).value).toBe('보존할 사유');
  fireEvent.click(within(dialog).getByRole('button', { name: '거절' }));
  await screen.findByText('합성 공급자 거절 처리 완료');
  expect(api.rejectSupplier).toHaveBeenLastCalledWith('supplier', '보존할 사유');
});
it('shows document download failure in the supplier detail', async () => {
  api.downloadDocument.mockResolvedValue(null);
  render(<MemoryRouter><Page /></MemoryRouter>);
  fireEvent.click(await screen.findByText('합성 공급자'));
  fireEvent.click(screen.getByRole('button', { name: '사업자등록증' }));
  expect((await screen.findByRole('alert')).textContent).toContain('서류를 내려받지 못했습니다.');
});

it('retains edit values on thrown save failure, then refreshes detail after successful retry', async () => {
  api.updateBasicInfo.mockRejectedValueOnce(new Error('fixture')).mockResolvedValueOnce({ success: true });
  render(<MemoryRouter><Page /></MemoryRouter>);
  fireEvent.click(await screen.findByText('합성 공급자'));
  fireEvent.click(screen.getByRole('button', { name: '정보 보완' }));
  fireEvent.change(screen.getByLabelText('대표자'), { target: { value: '합성 대표' } });
  fireEvent.click(screen.getByRole('button', { name: '저장', exact: true }));
  await screen.findByRole('alert');
  expect((screen.getByLabelText('대표자') as HTMLInputElement).value).toBe('합성 대표');
  fireEvent.click(screen.getByRole('button', { name: '저장', exact: true }));
  await screen.findByText('합성 공급자 기본 정보를 저장했습니다.');
  expect(api.updateBasicInfo).toHaveBeenLastCalledWith('supplier', expect.objectContaining({ representativeName: '합성 대표' }));
  await waitFor(() => expect(api.getSuppliersPaged).toHaveBeenCalledTimes(2));
});
it('blocks duplicate approval, editing and closing until approval completes', async () => {
  let finish!: (result: {success: boolean; code?: string}) => void;
  api.approveSupplier.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  render(<MemoryRouter><Page /></MemoryRouter>);
  fireEvent.click(await screen.findByText('합성 공급자'));
  const approve = screen.getByRole('button', { name: '승인', exact: true });
  fireEvent.click(approve); fireEvent.click(approve);
  fireEvent.click(screen.getByRole('button', { name: '닫기', exact: true }));
  expect(api.approveSupplier).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: '승인 거절', exact: true })).toBeTruthy();
  expect(screen.queryByRole('button', { name: '정보 보완' })).toBeNull();
  finish({success: false, code: 'BUSINESS_REGISTRATION_REQUIRED'});
  expect((await screen.findByRole('alert')).textContent).toContain('사업자등록증');
});
it('retains rejection reason and recovers request state after an unexpected rejection', async () => {
  api.rejectSupplier.mockRejectedValueOnce(new Error('fixture')).mockResolvedValueOnce(true);
  render(<MemoryRouter><Page /></MemoryRouter>);
  fireEvent.click(await screen.findByText('합성 공급자'));
  fireEvent.click(screen.getByRole('button', { name: '승인 거절' }));
  const dialog = screen.getByRole('dialog', { name: '공급자 거절' });
  fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: '합성 사유' } });
  fireEvent.click(within(dialog).getByRole('button', { name: '거절' }));
  await within(dialog).findByRole('alert');
  expect((within(dialog).getByRole('textbox') as HTMLTextAreaElement).value).toBe('합성 사유');
  fireEvent.click(within(dialog).getByRole('button', { name: '거절' }));
  await screen.findByText('합성 공급자 거절 처리 완료');
});
it('handles unexpected document rejection in the current detail', async () => {
  api.downloadDocument.mockRejectedValue(new Error('fixture'));
  render(<MemoryRouter><Page /></MemoryRouter>);
  fireEvent.click(await screen.findByText('합성 공급자'));
  fireEvent.click(screen.getByRole('button', { name: '사업자등록증' }));
  expect((await screen.findByRole('alert')).textContent).toContain('서류를 내려받지 못했습니다.');
});
it('keeps backend profile warning informational and refreshes an already processed supplier', async () => {
  api.getSuppliersPaged.mockResolvedValue({ items: [{ ...supplier, profileComplete: false, missingProfileFields: ['managerPhone'] }], pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } });
  api.approveSupplier.mockResolvedValue({ success: false, code: 'INVALID_STATUS' });
  render(<MemoryRouter><Page /></MemoryRouter>);
  fireEvent.click(await screen.findByText('합성 공급자'));
  expect(screen.getByText('정보 미완료 — 승인은 가능하며, 승인 후 공급자가 보완합니다')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '승인', exact: true }));
  await screen.findAllByText('이미 처리된 공급자입니다. 목록을 새로고침합니다.');
  await waitFor(() => expect(api.getSuppliersPaged).toHaveBeenCalledTimes(2));
});

it('focuses the rejection reason and cancels back to the detail action without writing', async () => {
  render(<MemoryRouter><Page /></MemoryRouter>);
  fireEvent.click(await screen.findByText('합성 공급자'));
  const trigger = screen.getByRole('button', { name: '승인 거절' });
  trigger.focus(); fireEvent.click(trigger);
  const dialog = screen.getByRole('dialog', { name: '공급자 거절' });
  expect(document.activeElement).toBe(within(dialog).getByRole('textbox', { name: '거절 사유' }));
  fireEvent(dialog, new Event('cancel', { cancelable: true }));
  await waitFor(() => expect(document.activeElement).toBe(trigger));
  expect(api.rejectSupplier).not.toHaveBeenCalled();
});

vi.mock('../../lib/api/supplierReview', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../lib/api/supplierReview')>();
  return { ...original, supplierReviewApi: { ...original.supplierReviewApi,
    queue: vi.fn().mockResolvedValue({ items: [], hasMore: false }),
    list: vi.fn(async (supplierId: string) => ({ supplierId, current: null, requests: [], actions: [], hasMore: false, page: 1 })),
  } };
});

beforeEach(() => {
  vi.mocked(supplierReviewApi.queue).mockResolvedValue({ items: [], hasMore: false });
  vi.mocked(supplierReviewApi.list).mockImplementation(async (supplierId: string) => ({ supplierId, current: null, requests: [], actions: [], hasMore: false, page: 1 }));
});
