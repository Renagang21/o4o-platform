import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { StoreContentsSelector } from '../../StoreContentsSelector';
const api = vi.hoisted(() => ({ store: 'A', service: 'kpa-society' as string | null, list: vi.fn(), usage: vi.fn(), reimport: vi.fn(), businesses: vi.fn() }));
vi.mock('../../../../contexts/StoreContext', () => ({useUnifiedStore:()=>({effectiveServiceKey:api.service})}));
vi.mock('../../../../contexts/AuthContext', () => ({useAuth:()=>({user:{id:'fixture'}})}));
vi.mock('../../../../api/neturePharmacy', () => ({neturePharmacyApi:{listSemiFranchises:api.businesses}}));
vi.mock('../../../../hooks/useStoreOrganizationId', () => ({ useStoreOrganizationId: () => ({ organizationId: api.store }) }));
vi.mock('../../../../lib/storeOrganizationHeader', () => ({ getActiveStoreOrganizationId: () => api.store }));
vi.mock('../../../../lib/serviceContext', () => ({ getActiveServiceKey: () => 'kpa-society' }));
vi.mock('../../../../api/assetSnapshot', () => ({ storeLibraryApi: { listContents: api.list, getContentUsage: api.usage, reimportSource: api.reimport } }));
vi.mock('../../../../components/store/StoreQrCreateModal', () => ({ StoreQrCreateModal: () => null }));
vi.mock('../../ContentPdfExportModal', () => ({ ContentPdfExportModal: ({ open }: { open: boolean }) => open ? <p>PDF target open</p> : null }));
const row = (id = 'one', origin = 'direct') => ({ id, selectionKey: `${origin}:${id}`, origin, title: `Fixture ${id}`, contentJson: { html: '<p>Fixture</p>' }, tags: ['Fixture tag'], hasSourceUpdate: false, createdAt: '2026-10-15T00:00:00Z' });
const feed = (items = [row()], totalPages = 1) => ({ success: true, data: { items, total: items.length, totalPages } });
beforeEach(() => { vi.restoreAllMocks(); vi.resetAllMocks(); api.store = 'A'; api.service='kpa-society'; api.businesses.mockResolvedValue([]); api.list.mockResolvedValue(feed()); api.usage.mockResolvedValue({ success: true, data: { usage: { qr: 2, tablet_display: 1, product_link: 0, pop_pdf: 0 } } }); });
afterEach(cleanup);
const start = vi.fn(), remove = vi.fn(), afterRemove = vi.fn();
function Location() { const location = useLocation(); return <p data-testid="location">{location.pathname}{location.search}</p>; }
function show(entry = '/library', modal = false) {
  return render(<MemoryRouter initialEntries={[entry]}><Location /><Routes>
    <Route path="/library" element={<StoreContentsSelector onStartProduction={start} onRemoveSnapshots={remove} onAfterRemove={afterRemove} enablePdfExport mode={modal ? 'modal' : 'page'} />} />
    <Route path="/store/content/direct/:id" element={<p>Editor fixture</p>} />
  </Routes></MemoryRouter>);
}
async function select(id = 'one') {
  const link = await screen.findByRole('link', { name: `Fixture ${id}` });
  fireEvent.click(within(link.closest('tr')!).getByRole('checkbox'));
}
it('selects the current row and preserves execution-asset identity in production handoff', async () => {
  api.list.mockResolvedValue(feed([row('asset', 'execution-asset')])); show(); await select('asset');
  fireEvent.click(screen.getByRole('button', { name: '제작 시작' }));
  expect(start).toHaveBeenCalledWith([{ id: 'asset', title: 'Fixture asset', origin: 'library' }]);
});
it('filter changes immediately hide old selection and reject late list responses', async () => {
  let resolve!: (value: ReturnType<typeof feed>) => void;
  api.list.mockResolvedValueOnce(feed()).mockReturnValueOnce(new Promise(done => { resolve = done; })).mockResolvedValueOnce(feed([row('new')]));
  show(); await select(); fireEvent.click(screen.getByRole('button', { name: '운영자 제공' }));
  expect(screen.queryByRole('link', { name: 'Fixture one' })).toBeNull();
  expect(screen.queryByRole('button', { name: '제작 시작' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '내가 만든 콘텐츠' }));
  await screen.findByRole('link', { name: 'Fixture new' });
  await act(async () => { resolve(feed([row('old')])); });
  expect(screen.queryByRole('link', { name: 'Fixture old' })).toBeNull();
});
it('restores search/source/tag/page from the URL without resetting to page one on mount', async () => {
  api.list.mockResolvedValue(feed([row()], 3)); show('/library?librarySearch=Fixture&librarySource=mine&libraryTag=Tag&libraryPage=2');
  await screen.findByRole('link', { name: 'Fixture one' });
  expect(api.list.mock.calls[0][0]).toMatchObject({ page: 2, search: 'Fixture', source: 'mine', tag: 'Tag' });
  await act(async () => { await new Promise(done => setTimeout(done, 350)); });
  expect(api.list).toHaveBeenCalledOnce();
  expect((screen.getByRole('searchbox', { name: '콘텐츠 검색' }) as HTMLInputElement).value).toBe('Fixture');
});
it('debounced search preserves unrelated product parameters in the current URL', async () => {
  show('/library?pId=fixture'); await screen.findByRole('link', { name: 'Fixture one' });
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: '  Revised  ' } });
  await waitFor(() => expect(api.list.mock.calls[api.list.mock.calls.length - 1][0].search).toBe('Revised'));
  expect(screen.getByTestId('location').textContent).toContain('pId=fixture');
  await waitFor(() => expect(screen.getByTestId('location').textContent).toContain('librarySearch=Revised'));
});
it('usage summary arrives and survives the state change caused by its own request', async () => {
  api.list.mockResolvedValue(feed([{ ...row(), hasSourceUpdate: true }])); show();
  await screen.findByText('QR 2 · 태블릿 1에서 사용 중'); expect(api.usage).toHaveBeenCalledOnce();
});
it('zero counted references never claim unused content when tablet blocks and video links are uncounted', async () => {
  api.list.mockResolvedValue(feed([{ ...row(), hasSourceUpdate: true }]));
  api.usage.mockResolvedValue({ success: true, data: { usage: { qr: 0, tablet_display: 0, product_link: 0, pop_pdf: 0 },
    coverage: { tablet_content_list_block: 'not_counted', store_videos: 'no_link', pop: 'approximate' } } });
  show(); await screen.findByText('집계된 사용처 없음');
  expect(screen.getByText('태블릿 블록 미집계 · 영상 연결 미집계 · POP은 근사 집계')).toBeTruthy();
  expect(screen.queryByText(/사용 중 아님/)).toBeNull();
});
it('usage failure can be retried without losing the selected content or reloading its list', async () => {
  api.list.mockResolvedValue(feed([{ ...row(), hasSourceUpdate: true }]));
  api.usage.mockRejectedValueOnce(Error('synthetic'));
  show(); await select();
  fireEvent.click(await screen.findByRole('button', { name: '사용처 다시 확인' }));
  await screen.findByText('QR 2 · 태블릿 1에서 사용 중');
  expect(api.usage).toHaveBeenCalledTimes(2); expect(api.list).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole('button', { name: '제작 시작' }));
  expect(start).toHaveBeenCalledWith([{ id: 'one', title: 'Fixture one', origin: 'direct' }]);
});
it('modal mode never rewrites its host URL or exposes destructive actions', async () => {
  show('/library?host=retained', true); await select();
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Modal query' } });
  await waitFor(() => expect(api.list.mock.calls[api.list.mock.calls.length - 1][0].search).toBe('Modal query'));
  expect(screen.getByTestId('location').textContent).toBe('/library?host=retained');
  expect(screen.queryByRole('button', { name: '선택 삭제' })).toBeNull();
  expect(api.businesses).not.toHaveBeenCalled();
});
it('business filter reads owned copies independently and keeps unrelated URL parameters', async () => {
  api.businesses.mockResolvedValue([{key:'network-a',name:'협업체 A',membershipStatus:'terminated',communityKey:null}]);
  show('/library?pId=fixture&libraryPage=2');
  fireEvent.click(await screen.findByRole('button',{name:'협업체 A'}));
  await waitFor(()=>expect(api.list).toHaveBeenLastCalledWith(expect.objectContaining({page:1,source:'franchise',business:'network-a'})));
  expect(screen.getByTestId('location').textContent).toContain('pId=fixture');
  expect(screen.getByTestId('location').textContent).toContain('libraryBusiness=network-a');
  fireEvent.click(screen.getByRole('button',{name:'내가 만든 콘텐츠'}));
  await waitFor(()=>expect(api.list.mock.calls[api.list.mock.calls.length - 1][0].business).toBeUndefined());
  expect(screen.getByTestId('location').textContent).not.toContain('libraryBusiness');
});
it('owned content without a service enrollment does not request pharmacy membership', async () => {
  api.service=null; show();
  await screen.findByRole('link',{name:'Fixture one'});
  expect(api.businesses).not.toHaveBeenCalled();
  expect(screen.queryByRole('region',{name:'협업체 선택'})).toBeNull();
});
it('store switch before React rerenders prevents using the old selected rows', async () => {
  show(); await select(); api.store = 'B';
  fireEvent.click(screen.getByRole('button', { name: '제작 시작' })); expect(start).not.toHaveBeenCalled();
});
it('duplicate snapshot removal is locked and reports only confirmed results', async () => {
  let resolve!: (count: number) => void; remove.mockReturnValue(new Promise(done => { resolve = done; }));
  vi.spyOn(window, 'confirm').mockReturnValue(true); api.list.mockResolvedValue(feed([row('copy', 'snapshot')]));
  show(); await select('copy'); const button = screen.getByRole('button', { name: '선택 삭제' });
  fireEvent.click(button); fireEvent.click(button); expect(remove).toHaveBeenCalledOnce();
  await act(async () => { resolve(1); }); expect(afterRemove).toHaveBeenCalledOnce();
});
