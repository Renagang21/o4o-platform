import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import SupplierContentDestinations from '../SupplierContentDestinations';
import type { SupplierLibraryItem } from '../../../lib/api';

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('../../../lib/apiClient', () => ({ api: mocks }));
const source = { id: 'source-a', title: '비공개 자료', isPublic: false } as SupplierLibraryItem;
beforeEach(() => {
  vi.resetAllMocks();
  mocks.get.mockImplementation((path: string) => Promise.resolve({ data: { success: true, data: path.endsWith('targets') ? [{ key: 'carepharm', name: '협력사업 A' }, { key: 'coop', name: '협력사업 B' }] : [] } }));
  mocks.post.mockResolvedValue({ data: { success: true, data: { reused: false } } });
});
afterEach(cleanup);

it('saving/viewing an original does not request publication and does not preselect a business', async () => {
  render(<SupplierContentDestinations item={source} onClose={vi.fn()} />);
  await screen.findByRole('option', { name: '협력사업 A' });
  expect((screen.getByLabelText('대상 협력사업') as HTMLSelectElement).value).toBe('');
  expect((screen.getByRole('button', { name: '등재 요청' }) as HTMLButtonElement).disabled).toBe(true);
  expect(mocks.post).not.toHaveBeenCalled();
});
it('sends only the source and chosen business; shows review status, without publishing source or community', async () => {
  render(<SupplierContentDestinations item={source} onClose={vi.fn()} />);
  await screen.findByRole('option', { name: '협력사업 B' });
  fireEvent.change(screen.getByLabelText('대상 협력사업'), { target: { value: 'coop' } });
  fireEvent.click(screen.getByRole('button', { name: '등재 요청' }));
  await screen.findByText(/등재 요청을 접수했습니다/);
  expect(mocks.post).toHaveBeenCalledExactlyOnceWith('/neture/supplier/content-requests', { itemId: 'source-a', businessKey: 'coop' });
});
it('does not treat lookup failure as an empty target list and can retry', async () => {
  mocks.get.mockRejectedValueOnce(new Error('unavailable'));
  render(<SupplierContentDestinations item={source} onClose={vi.fn()} />);
  await screen.findByRole('alert');
  fireEvent.click(screen.getByRole('button', { name: '다시 조회' }));
  await screen.findByRole('option', { name: '협력사업 A' });
  expect(mocks.post).not.toHaveBeenCalled();
});
it('retains a failed selection for retry and identifies duplicate reception', async () => {
  mocks.post.mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce({ data: { success: true, data: { reused: true } } });
  render(<SupplierContentDestinations item={source} onClose={vi.fn()} />);
  await screen.findByRole('option', { name: '협력사업 A' });
  fireEvent.change(screen.getByLabelText('대상 협력사업'), { target: { value: 'carepharm' } });
  fireEvent.click(screen.getByRole('button', { name: '등재 요청' }));
  await screen.findByRole('alert');
  fireEvent.click(screen.getByRole('button', { name: '등재 요청' }));
  await screen.findByText(/중복 요청하지 않았습니다/);
  await waitFor(() => expect(mocks.post).toHaveBeenCalledTimes(2));
});
