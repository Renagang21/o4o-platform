import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import Page from '../ProductDataCleanupPage';
const api = vi.hoisted(() => ({ getDuplicateMasters: vi.fn(), getRecycleBin: vi.fn(), restore: vi.fn(), hardDelete: vi.fn(), mergeMasters: vi.fn() }));
const auth = vi.hoisted(() => ({ id: 'fixture', roles: ['neture:admin'] as string[] }));
vi.mock('../../../contexts/AuthContext', () => ({ getAccessToken: () => null, useAuth: () => ({ user: auth }) }));
vi.mock('../../../lib/api/operatorProductCleanup', () => ({ productCleanupApi: api }));
vi.mock('../../../lib/apiClient', () => ({ api: { get: vi.fn() } }));
const recycle = { id: 'offer', name: '합성 상품', barcode: 'fixture', supplier_name: '합성 공급자', deleted_at: '2026-01-01', delete_reason: 'fixture' };
beforeEach(() => {
  vi.resetAllMocks(); auth.roles = ['neture:admin'];
  api.getDuplicateMasters.mockResolvedValue([]);
  api.getRecycleBin.mockResolvedValue({ success: true, data: [recycle], pagination: { totalPages: 1 } });
  api.restore.mockResolvedValue({ success: true }); api.hardDelete.mockResolvedValue({ success: true });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
async function bin() { render(<Page />); await screen.findByText('중복 상품이 없습니다.'); fireEvent.click(screen.getByRole('tab', { name: '휴지통' })); await screen.findByText('합성 상품'); }
it('operators can restore daily records but cannot see destructive controls even with another service admin role', async () => {
  auth.roles = ['neture:operator', 'kpa:admin']; await bin();
  expect(screen.queryByRole('button', { name: '완전 삭제' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '휴지통 복원' }));
  expect(screen.getByText('휴지통에서 복원하며, 비활성 상태를 유지합니다.')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '처리 확인' }));
  await waitFor(() => expect(api.restore).toHaveBeenCalledWith('offer'));
});
it('read failure is recoverable and never shown as an empty bin', async () => {
  api.getRecycleBin.mockRejectedValueOnce(new Error('읽기 실패')); render(<Page />);
  await screen.findByText('중복 상품이 없습니다.'); fireEvent.click(screen.getByRole('tab', { name: '휴지통' }));
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', expect.stringContaining('읽기 실패'));
  expect(screen.queryByText('휴지통이 비어 있습니다.')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '목록 다시 조회' })); await screen.findByText('합성 상품');
});
it('deletes without a manual reason, preserves failed targets, locks duplicate submissions and retries reads only after success', async () => {
  let finish!: (value: {success: boolean; error?: string}) => void;
  api.hardDelete.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; })).mockResolvedValueOnce({ success: true });
  await bin(); fireEvent.click(screen.getByRole('button', { name: '완전 삭제' }));
  expect(screen.queryByRole('textbox', {name:'처리 사유'})).toBeNull();
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', {name:'완전 삭제'}));
  fireEvent.click(screen.getByRole('button', { name: '처리 중…' }));
  expect(api.hardDelete).toHaveBeenCalledTimes(1);
  finish({ success: false, error: 'HAS_COMMERCE_REFERENCES' }); await screen.findByRole('alert');
  expect(api.hardDelete).toHaveBeenCalledWith('offer');
  api.getRecycleBin.mockRejectedValueOnce(new Error('갱신 실패'));
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', {name:'완전 삭제'}));
  await screen.findByText('완전 삭제했습니다.'); await screen.findByRole('button', { name: '목록 다시 조회' });
  expect(api.hardDelete).toHaveBeenCalledTimes(2);
  fireEvent.click(screen.getByRole('button', { name: '목록 다시 조회' })); await screen.findByText('합성 상품');
  expect(api.hardDelete).toHaveBeenCalledTimes(2);
});
it('reports the committed prefix of a partially failed merge and reloads instead of replaying it', async () => {
  api.getDuplicateMasters.mockResolvedValueOnce([{ barcode: 'fixture', count: 3, names: ['유지', '원본1', '원본2'], masterIds: ['target', 'source1', 'source2'] }]).mockResolvedValueOnce([]);
  api.mergeMasters.mockResolvedValueOnce({ success: true }).mockResolvedValueOnce({ success: false, error: 'CONFLICT' });
  render(<Page />); fireEvent.click(await screen.findByRole('button', { name: '중복 병합' }));
  fireEvent.change(screen.getByRole('textbox', { name: '처리 사유' }), { target: { value: '중복 확인' } }); fireEvent.click(screen.getByRole('button', { name: '처리 확인' }));
  await screen.findByText(/1개 병합 응답을 확인했습니다/);
  expect(api.mergeMasters.mock.calls).toEqual([['source1', 'target', '중복 확인'], ['source2', 'target', '중복 확인']]);
  expect(api.getDuplicateMasters).toHaveBeenCalledTimes(2); expect(screen.queryByRole('dialog')).toBeNull();
});
it('ignores a late read from the previous tab and a write after unmount', async () => {
  let oldRead!: (value: unknown[]) => void;
  api.getDuplicateMasters.mockImplementationOnce(() => new Promise(resolve => { oldRead = resolve; }));
  const view = render(<Page />); fireEvent.click(screen.getByRole('tab', { name: '휴지통' })); await screen.findByText('합성 상품');
  oldRead([]); await new Promise(resolve => setTimeout(resolve, 0)); expect(screen.getByText('합성 상품')).toBeTruthy();
  let write!: (value: {success: boolean}) => void; api.restore.mockImplementationOnce(() => new Promise(resolve => { write = resolve; }));
  fireEvent.click(screen.getByRole('button', { name: '휴지통 복원' })); fireEvent.click(screen.getByRole('button', { name: '처리 확인' }));
  view.unmount(); write({ success: true }); await new Promise(resolve => setTimeout(resolve, 0));
  expect(api.getRecycleBin).toHaveBeenCalledTimes(1);
});

it('does not leave the new permission scope disabled when an old mutation resolves late', async () => {
  let finish!: (value: { success: boolean }) => void;
  api.restore.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const view = render(<Page />); await screen.findByText('중복 상품이 없습니다.'); fireEvent.click(screen.getByRole('tab', { name: '휴지통' })); await screen.findByText('합성 상품');
  fireEvent.click(screen.getByRole('button', { name: '휴지통 복원' })); fireEvent.click(screen.getByRole('button', { name: '처리 확인' }));
  auth.roles = ['neture:operator']; view.rerender(<Page />); await screen.findByText('합성 상품');
  finish({ success: true }); await new Promise(resolve => setTimeout(resolve, 0));
  expect(screen.queryByText(/휴지통에서 복원했습니다/)).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '휴지통 복원' })); expect(screen.getByRole('button', { name: '처리 확인' })).toBeTruthy();
});
