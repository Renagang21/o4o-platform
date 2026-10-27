import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import DescriptionIntakePage from '../DescriptionIntakePage';
const state = vi.hoisted(() => ({ writable: true, list: vi.fn(), detail: vi.fn(), approve: vi.fn(), edit: vi.fn(), reject: vi.fn() }));
vi.mock('../useProductDbWriteAccess', () => ({ useProductDbWriteAccess: () => state.writable, ProductDbReadOnlyNotice: () => <p>조회 전용</p> }));
vi.mock('@/api/product-description-intake.api', () => ({ descriptionIntakeApi: state }));
const detail = { id: 'candidate-a', status: 'pending', revision: 'candidate-revision', entry: { name: 'Synthetic product', content: '<p>Incoming body</p>', descriptionType: 'B2B', language: 'ko', source: { kind: 'government', currentness: 'archived', checkedOn: null, references: [{ url: 'https://nedrug.mfds.go.kr/synthetic' }] } }, targets: [{ id: 'master-a', name: 'Synthetic canonical product', barcode: '8806541001115', matchedBy: 'barcode', canonical: { id: 'old-a', content: '<p>Current body</p>', revision: 'canonical-revision' } }] };
afterEach(cleanup);
beforeEach(() => { vi.clearAllMocks(); state.writable = true; state.list.mockResolvedValue({ items: [{ id: detail.id, name: 'Synthetic product', source: detail.entry.source, descriptionType: 'B2B', language: 'ko' }], total: 1 }); state.detail.mockResolvedValue(detail); state.approve.mockResolvedValue({ ...detail, status: 'matched' }); });
const open = async () => { render(<MemoryRouter><DescriptionIntakePage /></MemoryRouter>); fireEvent.click(await screen.findByRole('button', { name: /Synthetic product/ })); await screen.findByText('Current body'); };
it('requires explicit master selection and archive acknowledgement and sends both optimistic revisions', async () => {
 await open(); const approve = screen.getByRole('button', { name: /선택 상품에 승인/ }); expect(approve).toBeDisabled();
 fireEvent.click(screen.getByRole('checkbox', { name: /Synthetic canonical product/ })); expect(approve).toBeDisabled();
 fireEvent.click(screen.getByRole('checkbox', { name: /현행성이 재확인되지/ })); expect(approve).not.toBeDisabled();
 fireEvent.click(approve); await waitFor(() => expect(state.approve).toHaveBeenCalledWith(detail, detail.targets, true));
});
it('blocks approval of unsaved edited content and keeps body on conflict', async () => {
 await open(); fireEvent.click(screen.getByRole('checkbox', { name: /Synthetic canonical product/ })); fireEvent.click(screen.getByRole('checkbox', { name: /현행성이 재확인되지/ }));
 fireEvent.change(screen.getByLabelText('검토 본문'), { target: { value: '<p>Edited body</p>' } }); expect(screen.getByRole('button', { name: /선택 상품에 승인/ })).toBeDisabled();
 state.edit.mockRejectedValue(new Error('conflict')); fireEvent.click(screen.getByRole('button', { name: '수정 본문 저장' }));
 await screen.findByText(/처리하지 못했습니다/); expect(screen.getByLabelText('검토 본문')).toHaveValue('<p>Edited body</p>'); expect(state.approve).not.toHaveBeenCalled();
});
it('keeps canonical mutation disabled without common product write authority', async () => {
 state.writable = false; await open(); expect(screen.getByText('조회 전용')).toBeTruthy(); expect(screen.getByRole('button', { name: /선택 상품에 승인/ })).toBeDisabled(); expect(screen.getByLabelText('검토 본문')).toBeDisabled();
});
