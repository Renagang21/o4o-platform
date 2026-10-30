import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Page from '../../../../../packages/operator-core-ui/src/modules/neture-product-operations/ProductCandidateReviewPage';
import { NetureProductOperationsProvider } from '../../../../../packages/operator-core-ui/src/modules/neture-product-operations/runtime';
const api = { list: vi.fn(), archive: vi.fn(), reject: vi.fn() };
const row = (id: string) => ({ id, candidateName: `합성후보 ${id}`, candidateStatus: 'pending', sourceType: 'unknown', createdAt: '2026-10-01' });
const view = () => render(<MemoryRouter initialEntries={['/operations/neture/candidates?status=pending']}><NetureProductOperationsProvider {...{ http: {} as any, api: { operatorProductCandidateApi: api } as any, user: { id: 'synthetic' }, fetchGuidePageContent: vi.fn() }}><Page /></NetureProductOperationsProvider></MemoryRouter>);
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.resetAllMocks(); });
it('uses server total, searches the whole queue, and pages beyond the initial result', async () => {
  api.list.mockImplementation(async ({ page, search }) => ({ items: [row(search ? 'found' : String(page))], total: search ? 1 : 12000 }));
  view(); await screen.findByText('합성후보 1');
  expect(api.list).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'pending', page: 1, limit: 50 }));
  expect(screen.getByText('12000')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '다음 페이지' })); await screen.findByText('합성후보 2');
  fireEvent.change(screen.getByLabelText('전체 후보 검색'), { target: { value: '식별자' } }); await screen.findByText('합성후보 found');
  expect(api.list).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, search: '식별자' }));
});
it('reveals top actions on selection and retries only the failed candidate', async () => {
  let archived = false;
  api.list.mockImplementation(async () => ({ items: archived ? [row('two')] : [row('one'), row('two')], total: archived ? 1 : 2 }));
  api.archive.mockImplementation(async id => { if (id === 'two') throw new Error('offline'); archived = true; return row(id); });
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  view(); await screen.findByText('합성후보 one'); expect(screen.queryByRole('button', { name: '선택 보관(삭제)' })).toBeNull();
  fireEvent.click(within(screen.getByRole('table')).getAllByRole('checkbox')[0]); fireEvent.click(screen.getByRole('button', { name: '선택 보관(삭제)' }));
  await waitFor(() => expect(api.archive).toHaveBeenCalledTimes(2)); await screen.findByText('선택 후보 처리 결과');
  await waitFor(() => expect(screen.getByRole('button', { name: /재시도/ })).not.toBeDisabled());
  api.archive.mockResolvedValue(row('two')); fireEvent.click(screen.getByRole('button', { name: /재시도/ }));
  await waitFor(() => expect(api.archive).toHaveBeenCalledTimes(3)); expect(api.archive.mock.calls.map(([id]) => id)).toEqual(['one', 'two', 'two']); expect(api.reject).not.toHaveBeenCalled();
});
it('shows lookup errors and ignores stale search results', async () => {
  let finish!: (value: unknown) => void;
  api.list.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; })).mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ items: [row('latest')], total: 1 });
  view(); fireEvent.change(screen.getByLabelText('전체 후보 검색'), { target: { value: 'new' } }); await screen.findByRole('alert');
  await act(async () => finish({ items: [row('stale')], total: 10000 })); expect(screen.queryByText('합성후보 stale')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '목록 새로고침' })); await screen.findByText('합성후보 latest');
});
