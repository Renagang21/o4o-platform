import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, act } from '@testing-library/react';
const { get, handoff } = vi.hoisted(() => ({ get: vi.fn(), handoff: vi.fn() }));
vi.mock('../../../contexts/AuthContext', () => ({ authClient: { api: { get } } }));
vi.mock('@o4o/auth-react', () => ({ requestServiceHandoff: handoff }));
import BusinessProductsPreview from '../BusinessProductsPreview';
const item = (key = 'pharmacy', id = 'offer-a') => ({ kind: 'proposal', optionId: id, productName: `공급 상품 ${id}`, supplierName: '공급자 샘플', semiFranchiseKey: key });
const response = (items: unknown[]) => ({ data: { data: { items } } });
beforeEach(() => { get.mockReset(); handoff.mockReset(); get.mockResolvedValue(response([item()])); handoff.mockImplementation(() => new Promise(() => {})); });
afterEach(cleanup);
it('reads selected business and organization then explicitly selects the destination store', async () => {
  render(<BusinessProductsPreview businessKey="pharmacy" organizationId="store-a" canManage={false} />);
  await screen.findByText('공급 상품 offer-a');
  expect(get).toHaveBeenCalledWith('/neture/pharmacy/store/supply-options', { params: { source: 'sf:pharmacy', page: 1, limit: 3 }, headers: { 'X-Store-Organization-Id': 'store-a' } });
  fireEvent.click(screen.getByRole('button', { name: /내 매장에서 공급 상품 보기/ }));
  expect(handoff).toHaveBeenCalledWith(expect.anything(), { workspace: 'store', origin: 'https://store.neture.co.kr', returnPath: '/select-store?returnTo=%2Fstore%2Fpharmacy%2Fsupply%3Fsource%3Dsf%253Apharmacy' });
});
it('does not read supply for an operator or before a verified pharmacy is selected', () => {
  const view = render(<BusinessProductsPreview businessKey="pharmacy" canManage={false} />);
  expect(get).not.toHaveBeenCalled();
  view.rerender(<BusinessProductsPreview businessKey="pharmacy" organizationId="store-a" canManage />);
  expect(get).not.toHaveBeenCalled();
});
it('distinguishes failure from empty and retries without losing the current scope', async () => {
  get.mockRejectedValueOnce(new Error('Offline'));
  render(<BusinessProductsPreview businessKey="pharmacy" organizationId="store-a" canManage={false} />);
  await screen.findByRole('alert');
  expect(screen.queryByText('현재 이용 가능한 사업 공급 상품이 없습니다.')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '공급 상품 다시 확인' }));
  await screen.findByText('공급 상품 offer-a');
});
it('rejects foreign-business results instead of exhibiting them', async () => {
  get.mockResolvedValue(response([item('foreign')]));
  render(<BusinessProductsPreview businessKey="pharmacy" organizationId="store-a" canManage={false} />);
  await screen.findByRole('alert');
  expect(screen.queryByText('공급 상품 offer-a')).toBeNull();
});
it('clears the old pharmacy immediately and ignores its late reply', async () => {
  let resolve!: (value: unknown) => void;
  get.mockImplementationOnce(() => new Promise(r => { resolve = r; }));
  const view = render(<BusinessProductsPreview businessKey="pharmacy" organizationId="store-a" canManage={false} />);
  await waitFor(() => expect(get).toHaveBeenCalledTimes(1));
  get.mockResolvedValue(response([item('network', 'new')]));
  view.rerender(<BusinessProductsPreview businessKey="network" organizationId="store-b" canManage={false} />);
  await screen.findByText('공급 상품 new');
  await act(async () => { resolve(response([item()])); });
  expect(screen.queryByText('공급 상품 offer-a')).toBeNull();
});
