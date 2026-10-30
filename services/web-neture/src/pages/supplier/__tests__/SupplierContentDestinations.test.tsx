import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import SupplierContentDestinations from '../SupplierContentDestinations';
import type { SupplierLibraryItem } from '../../../lib/api';

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'actor' } }) }));
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

it('shows submission dates and links a rejected copy back to the exact original and business without submitting', async () => {
  mocks.get.mockImplementation(async(path:string)=>({data:{success:true,data:path.endsWith('targets')?[{key:'carepharm',name:'사업'}]:[{id:'request',sourceItemId:'source-a',businessKey:'carepharm',businessName:'사업',title:'검토 사본',status:'rejected',reason:'본문 보완',createdAt:'2026-10-20T00:00:00Z'}]}}));
  render(<MemoryRouter><SupplierContentDestinations item={null} onClose={vi.fn()}/></MemoryRouter>);
  const edit=await screen.findByRole('link',{name:'원본 수정 후 다시 요청'});const url=new URL(edit.getAttribute('href')!,'https://supplier.test');
  expect(url.pathname).toBe('/supplier/library/source-a/edit');expect(url.searchParams.get('returnTo')).toBe('/supplier/library?requestSource=source-a&business=carepharm');expect(screen.getByText(/제출 시점/)).toBeTruthy();expect(mocks.post).not.toHaveBeenCalled();
});
it('prepares a requested business only when the target still exists, and never sends automatically', async () => {
  const view=render(<SupplierContentDestinations item={source} suggestedBusinessKey="carepharm" onClose={vi.fn()}/>);await screen.findByRole('option',{name:'협력사업 A'});expect((screen.getByLabelText('대상 협력사업') as HTMLSelectElement).value).toBe('carepharm');expect(mocks.post).not.toHaveBeenCalled();
  view.rerender(<SupplierContentDestinations item={source} suggestedBusinessKey="missing" onClose={vi.fn()}/>);expect((screen.getByRole('button',{name:'등재 요청'}) as HTMLButtonElement).disabled).toBe(true);expect(mocks.post).not.toHaveBeenCalled();
});
