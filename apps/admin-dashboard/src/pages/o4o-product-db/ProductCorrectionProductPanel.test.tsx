import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import ProductCorrectionProductPanel from './ProductCorrectionProductPanel';
const query = vi.hoisted(() => vi.fn());
vi.mock('@/api/product-correction-periodic.api', () => ({ productCorrectionPeriodicApi: { productWorkspace: query } }));
const id = '00000000-0000-4000-8000-000000000001';
const second = '00000000-0000-4000-8000-000000000002';
const result = { product: { id, name: '합성 상품', status: 'ACTIVE', regulatoryType: 'GENERAL' }, section: 'descriptions',
  items: [{ id: 'description', title: 'STORE / ko', state: 'canonical', at: '2026-10-25', content: '<script>unsafe()</script>', truncated: true, href: `/admin/o4o-product-db/masters/${id}` }], total: 1, page: 1, pageSize: 10 };
beforeEach(() => { vi.resetAllMocks(); window.history.replaceState(null, '', '/'); query.mockResolvedValue(result); });
afterEach(() => window.history.replaceState(null, '', '/'));
function submit(value: string) {
  fireEvent.change(screen.getByLabelText('상품 관리 이력 ID'), { target: { value } });
  fireEvent.click(screen.getByText('상품 자료·이력 조회'));
}
it('opens from a product link without mutation and renders source HTML as plain text', async () => {
  window.history.replaceState(null, '', `/?product=${id}`);
  render(<ProductCorrectionProductPanel />);
  await screen.findByText(/조회 상품: 합성 상품/);
  expect(query).toHaveBeenCalledWith(id, 'descriptions', 1);
  expect(screen.getByText('<script>unsafe()</script>').tagName).toBe('PRE');
  expect(document.querySelector('script')).toBeNull();
  expect(screen.getByText(/원문 앞 20,000자/)).toBeInTheDocument();
});
it('validates IDs, switches section and pages while preserving the queried product identity', async () => {
  render(<ProductCorrectionProductPanel />);
  expect(query).not.toHaveBeenCalled(); submit('invalid');
  await screen.findByRole('alert'); expect(query).not.toHaveBeenCalled(); submit(id);
  await screen.findByText(/조회 상품:/);
  query.mockResolvedValue({ ...result, section: 'tasks', items: [], total: 12 });
  fireEvent.click(screen.getByText('검토·다음 점검'));
  await waitFor(() => expect(query).toHaveBeenLastCalledWith(id, 'tasks', 1));
  await waitFor(() => expect(screen.getByText('다음 상품 이력')).not.toBeDisabled());
  query.mockResolvedValue({ ...result, section: 'tasks', items: [], total: 12, page: 2 });
  fireEvent.click(screen.getByText('다음 상품 이력'));
  await waitFor(() => expect(query).toHaveBeenLastCalledWith(id, 'tasks', 2));
});
it('does not let a late previous-product response overwrite a newer selection', async () => {
  let finish!: (value: unknown) => void;
  query.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  render(<ProductCorrectionProductPanel />); submit(id);
  query.mockResolvedValue({ ...result, product: { ...result.product, id: second, name: '새 상품' } });
  submit(second); await screen.findByText(/조회 상품: 새 상품/);
  await act(async () => finish(result));
  expect(screen.queryByText(/조회 상품: 합성 상품/)).toBeNull();
  expect(screen.getByText(/조회 상품: 새 상품/)).toBeInTheDocument();
});
