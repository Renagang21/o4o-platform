import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { StoreProductExcelDialog } from './StoreProductExcelDialog';
const state = vi.hoisted(() => ({ current: true, preview: vi.fn(), register: vi.fn() }));
vi.mock('../../api/storeProductAi', () => ({ previewProductFile: state.preview, aiResearchRequest: vi.fn() }));
vi.mock('../../api/o4oStandardProducts', () => ({ registerStandardProductToStore: state.register }));
vi.mock('../../components/store/StoreProductSession', () => ({
  useStoreProductScope: () => ({ key: 'store', organizationId: 'store', ready: true }),
  useStoreProductSession: () => () => state.current,
  StoreProductDialog: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
}));
afterEach(cleanup);
beforeEach(() => { vi.clearAllMocks(); state.current = true; vi.spyOn(window, 'confirm').mockReturnValue(true); });
const columns = [{ index: 0, label: '바코드' }, { index: 1, label: '상품명' }];
const row = { row: 2, barcode: '8806541001115', name: 'POS 이름', state: 'review', candidates: [{ id: 'master', name: '정본 이름', barcode: '8806541001115', manufacturer: '제조사', matchedBy: 'barcode', hasAiDescription: false, registered: false }] };
async function preview(rows = [row]) {
  state.preview.mockResolvedValueOnce({ headerRow: 0, columns, rows: [] }).mockResolvedValueOnce({ headerRow: 0, columns, rows });
  render(<StoreProductExcelDialog open onClose={vi.fn()} onRegistered={vi.fn()} />);
  fireEvent.change(screen.getByLabelText('상품 엑셀 파일'), { target: { files: [new File(['synthetic'], 'products.xlsx')] } });
  await screen.findByRole('button', { name: '기존 상품·AI 자료 대조' });
  await waitFor(() => expect(screen.getByRole('button', { name: '기존 상품·AI 자료 대조' }).hasAttribute('disabled')).toBe(false));
  fireEvent.click(screen.getByRole('button', { name: '기존 상품·AI 자료 대조' }));
  await screen.findByLabelText('2행 상품 선택');
}
it('never registers by upload or name alone, preserves failures and retries the existing registration', async () => {
  await preview(); expect(state.register).not.toHaveBeenCalled();
  const register = screen.getByRole('button', { name: '선택 상품 매장 등록·실패 재시도' });
  expect(register.hasAttribute('disabled')).toBe(true);
  fireEvent.change(screen.getByLabelText('2행 상품 선택'), { target: { value: 'master' } });
  state.register.mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce({ success: true });
  fireEvent.click(register); await screen.findByText(/등록 실패·다시 시도 가능/);
  fireEvent.click(register); await screen.findByText(/매장 등록 완료/);
  expect(state.register.mock.calls).toEqual([['master'], ['master']]);
});
it('discards an old-store response and never starts subsequent writes after the store changes', async () => {
  let resolve: (v: unknown) => void = () => {};
  state.preview.mockReturnValue(new Promise(r => { resolve = r; }));
  render(<StoreProductExcelDialog open onClose={vi.fn()} onRegistered={vi.fn()} />);
  fireEvent.change(screen.getByLabelText('상품 엑셀 파일'), { target: { files: [new File(['synthetic'], 'products.xlsx')] } });
  state.current = false; resolve({ headerRow: 0, columns, rows: [row] });
  await waitFor(() => expect(state.preview).toHaveBeenCalledTimes(1));
  expect(screen.queryByLabelText('2행 상품 선택')).toBeNull(); expect(state.register).not.toHaveBeenCalled();
});
it('stops the next registration when store access changes during a successful request', async () => {
  const second = { ...row, row: 3, candidates: [{ ...row.candidates[0], id: 'second-master' }] };
  await preview([row, second]);
  fireEvent.change(screen.getByLabelText('2행 상품 선택'), { target: { value: 'master' } });
  fireEvent.change(screen.getByLabelText('3행 상품 선택'), { target: { value: 'second-master' } });
  state.register.mockImplementationOnce(async () => { state.current = false; return { success: true }; });
  fireEvent.click(screen.getByRole('button', { name: '선택 상품 매장 등록·실패 재시도' }));
  await waitFor(() => expect(state.register).toHaveBeenCalledTimes(1));
  expect(state.register.mock.calls[0]).toEqual(['master']);
});
