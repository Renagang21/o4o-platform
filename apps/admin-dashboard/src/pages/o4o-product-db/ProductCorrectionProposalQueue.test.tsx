import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProductCorrectionProposalQueue from './ProductCorrectionProposalQueue';
const queue = vi.hoisted(() => vi.fn());
vi.mock('@/api/product-correction.api', () => ({ productCorrectionApi: { proposalQueue: queue } }));
beforeEach(() => vi.resetAllMocks());
describe('변경안 처리 현황', () => {
  it('opens a specific proposal and clears stale rows when refresh fails', async () => {
    queue.mockResolvedValue({ items: [{ id: 'proposal', batchId: 'batch', taskId: 'task', productName: '합성 상품', createdAt: '2026-10-24' }], total: 1, page: 1, pageSize: 10 });
    render(<ProductCorrectionProposalQueue />);
    fireEvent.click(screen.getByText('변경안 현황 조회·새로고침'));
    expect(await screen.findByRole('link', { name: '상품 작업·변경안 열기' })).toHaveAttribute('href', '/admin/o4o-product-db/maintenance?batch=batch&task=task&proposal=proposal');
    queue.mockRejectedValue(new Error('조회 실패'));
    fireEvent.click(screen.getByText('변경안 현황 조회·새로고침'));
    await screen.findByRole('alert');
    expect(screen.queryByText('합성 상품')).not.toBeInTheDocument();
    expect(screen.queryByText('해당 조건의 변경안이 없습니다.')).not.toBeInTheDocument();
  });
  it('queries the explicit error/conflict filter independently from review completion', async () => {
    queue.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 10 });
    render(<ProductCorrectionProposalQueue />);
    fireEvent.change(screen.getByLabelText('변경안 현황 조건'), { target: { value: 'failed' } });
    await screen.findByText('해당 조건의 변경안이 없습니다.');
    expect(queue).toHaveBeenCalledWith('failed', 1);
  });
});
