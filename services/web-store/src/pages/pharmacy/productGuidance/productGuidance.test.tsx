import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ProductGuidanceContext } from './ProductGuidanceContext';
import { productGuidanceEditPath } from './productGuidanceMaterials';
import type { LinkedContentItem } from '../../../api/assetSnapshot';

const api = vi.hoisted(() => ({ store: 'A', service: 'kpa-society', descriptions: vi.fn(), local: vi.fn(), links: vi.fn() }));
vi.mock('../../../hooks/useStoreOperationScope', () => ({ useStoreOperationScope: () => ({
  key: `${api.store}:${api.service}`, organizationId: api.store,
}) }));
vi.mock('../../../api/localProducts', () => ({ getLocalProduct: api.local }));
vi.mock('../../../api/assetSnapshot', () => ({ storeDescriptionApi: { list: api.descriptions }, handledProductContentApi: { byProduct: api.links } }));
vi.mock('@o4o/content-editor', () => ({ ContentRenderer: ({ html }: { html: string }) => <output>{html}</output> }));
const localProduct = { sourceType: 'local' as const, sourceId: 'one' };
const emptyLinks = { success: true, data: { items: [] } };
const linked = { contentId: 'guide', title: '기존 안내 샘플', sourceType: 'direct', snapshotId: null } as LinkedContentItem;
const props = { product: localProduct, disabled: false, onOpenContent: vi.fn() };
beforeEach(() => {
  vi.resetAllMocks(); api.store = 'A'; api.service = 'kpa-society';
  api.local.mockResolvedValue({ id: 'one', summary: '확인된 요약', description: '<p>기본 설명</p>', detail_html: '<p>상세 설명</p>' });
  api.links.mockResolvedValue(emptyLinks);
});
afterEach(cleanup);

it('reads local source fields separately and opens existing linked guidance without creating another copy', async () => {
  api.links.mockResolvedValue({ success: true, data: { items: [linked] } });
  render(<ProductGuidanceContext {...props} />);
  await screen.findByText('기존 안내 샘플');
  fireEvent.click(screen.getByText('등록된 상품 정보 확인'));
  await screen.findByText('확인된 요약');
  expect(screen.getByText('<p>기본 설명</p>')).toBeTruthy();
  expect(screen.getByText('<p>상세 설명</p>')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '기존 안내 수정' }));
  expect(props.onOpenContent).toHaveBeenCalledWith(linked);
  expect(api.local).toHaveBeenCalledWith('one');
  expect(api.links).toHaveBeenCalledWith('local', 'one');
});
it('a description failure and a linked-content failure remain distinct from confirmed empty results and retry independently', async () => {
  api.links.mockResolvedValueOnce({ success: false, data: { items: [] } });
  api.local.mockRejectedValueOnce(Error('offline'));
  render(<ProductGuidanceContext {...props} />);
  await screen.findByRole('button', { name: '연결 안내 다시 확인' });
  fireEvent.click(screen.getByText('등록된 상품 정보 확인'));
  fireEvent.click(await screen.findByRole('button', { name: '상품 정보 다시 확인' }));
  await screen.findByText('확인된 요약');
  expect(api.links).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole('button', { name: '연결 안내 다시 확인' }));
  await screen.findByText(/아직 연결된 안내가 없습니다/);
  expect(screen.queryByRole('alert')).toBeNull();
});
it('selects the latest canonical description per language, with a visible fallback when Korean is absent', async () => {
  api.descriptions.mockResolvedValue({ success: true, data: { items: [
    { descriptionId: 'en-new', language: 'en', summary: 'English latest' },
    { descriptionId: 'ja-new', language: 'ja', summary: 'Japanese latest' },
    { descriptionId: 'en-old', language: 'en', summary: 'English old' },
  ] } });
  render(<ProductGuidanceContext {...props} product={{ sourceType: 'listing', sourceId: 'listing-one' }} />);
  fireEvent.click(screen.getByText('등록된 상품 정보 확인'));
  await screen.findByText('English latest');
  expect(screen.queryByText('English old')).toBeNull();
  expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('en');
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'ja' } });
  expect(screen.getByText('Japanese latest')).toBeTruthy();
  expect(api.local).not.toHaveBeenCalled();
});
it.each(['store', 'service', 'product'] as const)('rejects late sources and links after a %s switch', async kind => {
  let resolveSource!: (value: unknown) => void, resolveLinks!: (value: unknown) => void;
  api.local.mockReturnValueOnce(new Promise(done => { resolveSource = done; }));
  api.links.mockReturnValueOnce(new Promise(done => { resolveLinks = done; }));
  const view = render(<ProductGuidanceContext {...props} />);
  if (kind === 'store') api.store = 'B';
  if (kind === 'service') api.service = 'other';
  const product = kind === 'product' ? { sourceType: 'local' as const, sourceId: 'two' } : localProduct;
  api.local.mockResolvedValue({ id: product.sourceId, summary: '현재 상품 정보' });
  view.rerender(<ProductGuidanceContext {...props} product={product} />);
  fireEvent.click(screen.getByText('등록된 상품 정보 확인'));
  await screen.findByText('현재 상품 정보');
  await act(async () => {
    resolveSource({ id: 'one', summary: '이전 상품 정보' });
    resolveLinks({ success: true, data: { items: [linked] } });
  });
  expect(screen.queryByText('이전 상품 정보')).toBeNull();
  expect(screen.queryByText('기존 안내 샘플')).toBeNull();
});
it('does not silently accept a mismatched product response as an empty description', async () => {
  api.local.mockResolvedValue({ id: 'unrelated', summary: '다른 상품 정보' });
  render(<ProductGuidanceContext {...props} />);
  fireEvent.click(screen.getByText('등록된 상품 정보 확인'));
  await screen.findByRole('button', { name: '상품 정보 다시 확인' });
  expect(screen.queryByText('다른 상품 정보')).toBeNull();
  expect(screen.queryByText(/등록된 설명이 없습니다/)).toBeNull();
});
it('confirmed missing source material is not an error', async () => {
  api.local.mockResolvedValue({ id: 'one' });
  render(<ProductGuidanceContext {...props} />);
  fireEvent.click(screen.getByText('등록된 상품 정보 확인'));
  await screen.findByText(/등록된 설명이 없습니다/);
  await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
});
it('starting to write folds the reference area without reloading or losing its current source', async () => {
  const view = render(<ProductGuidanceContext {...props} />);
  await screen.findByText('확인된 요약');
  view.rerender(<ProductGuidanceContext {...props} compact />);
  const disclosure = screen.getByText('상품 정보·기존 안내 다시 확인').closest('details')!;
  expect(disclosure.open).toBe(false);
  fireEvent.click(screen.getByText('상품 정보·기존 안내 다시 확인'));
  expect(screen.getByText('확인된 요약')).toBeTruthy();
  expect(api.local).toHaveBeenCalledOnce();
  expect(api.links).toHaveBeenCalledOnce();
});
it('uses canonical direct and snapshot edit routes and rejects a missing snapshot target', () => {
  const base = '/work/kpa-society/store';
  expect(productGuidanceEditPath(linked, base)).toBe(`${base}/content/direct/guide?edit=1`);
  expect(productGuidanceEditPath({ ...linked, sourceType: 'snapshot_edit', snapshotId: 'snapshot' }, base)).toBe(`${base}/content/snapshot/edit`);
  expect(productGuidanceEditPath({ ...linked, sourceType: 'snapshot_edit' }, base)).toBeNull();
});
