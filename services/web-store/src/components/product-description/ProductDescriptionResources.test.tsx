import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ProductDescriptionLookup } from './ProductDescriptionLookup';
import { ProductDescriptionContribution } from './ProductDescriptionContribution';
const state = vi.hoisted(() => ({ lookup: vi.fn(), contribute: vi.fn(), current: true, key: 'store-a' }));
vi.mock('../../api/productDescriptionResources', () => ({ lookupProductDescription: state.lookup, contributeProductDescription: state.contribute }));
vi.mock('../../hooks/useStoreOperationScope', () => ({ useStoreOperationScope: () => ({ key: state.key, isCurrent: () => state.current }) }));
const item = { id: 'master-a', name: 'Synthetic reference', manufacturer: 'Synthetic maker', barcode: '8806541001115', matchedBy: 'name', canonical: { content: '<p>Professional clinical reference</p>' } };
afterEach(cleanup);
beforeEach(() => { vi.clearAllMocks(); state.current = true; state.key = 'store-a'; });
it('requires explicit name candidate selection and sends a read-only purpose-specific lookup', async () => {
 state.lookup.mockResolvedValue({ state: 'candidates', items: [item] }); render(<ProductDescriptionLookup />);
 fireEvent.change(screen.getByLabelText('설명 검색 기준'), { target: { value: 'name' } });
 fireEvent.change(screen.getByLabelText('설명 검색어'), { target: { value: 'Synthetic reference' } }); fireEvent.click(screen.getByRole('button', { name: '설명 조회' }));
 await screen.findByText(/상품명·제조사·바코드를 확인/); expect(screen.queryByText('Professional clinical reference')).toBeNull();
 expect(state.lookup).toHaveBeenCalledWith({ name: 'Synthetic reference', descriptionType: 'B2B', language: 'ko' });
 fireEvent.click(screen.getByRole('button', { name: /Synthetic reference/ })); expect(screen.getByText('Professional clinical reference')).toBeTruthy();
});
it('clears a delayed lookup on query or store change and does not create missing products', async () => {
 let finish!: (v: unknown) => void; state.lookup.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
 const view = render(<ProductDescriptionLookup />); fireEvent.change(screen.getByLabelText('설명 검색어'), { target: { value: '8806541001115' } }); fireEvent.click(screen.getByRole('button', { name: '설명 조회' }));
 state.key = 'store-b'; view.rerender(<ProductDescriptionLookup />);
 await act(async () => finish({ state: 'matched', items: [item] })); expect(screen.queryByText('Professional clinical reference')).toBeNull();
 state.lookup.mockResolvedValue({ state: 'not_found', items: [] }); fireEvent.change(screen.getByLabelText('설명 검색어'), { target: { value: '8806541001115' } }); fireEvent.click(screen.getByRole('button', { name: '설명 조회' }));
 await screen.findByText(/새 상품이나 빈 설명은 저장하지 않습니다/); expect(state.contribute).not.toHaveBeenCalled();
});
it('submits only the saved revision after an explicit contribution action', async () => {
 state.contribute.mockResolvedValue({ id: 'candidate', replayed: false }); render(<ProductDescriptionContribution id="content-a" revision="revision-a" />);
 expect(state.contribute).not.toHaveBeenCalled(); fireEvent.click(screen.getByRole('button', { name: '저장한 설명을 관리자에게 제안' }));
 await screen.findByText('관리자 검토 대기로 제출했습니다.'); expect(state.contribute).toHaveBeenCalledWith('content-a', 'revision-a');
});
it('ignores a delayed contribution after switching the selected store', async () => {
 let finish!: (v: unknown) => void; state.contribute.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
 const view = render(<ProductDescriptionContribution id="content-a" revision="revision-a" />); fireEvent.click(screen.getByRole('button', { name: '저장한 설명을 관리자에게 제안' }));
 state.key = 'store-b'; view.rerender(<ProductDescriptionContribution id="content-b" revision="revision-b" />);
 await act(async () => finish({ id: 'candidate', replayed: false })); await waitFor(() => expect(screen.queryByText('관리자 검토 대기로 제출했습니다.')).toBeNull());
});
