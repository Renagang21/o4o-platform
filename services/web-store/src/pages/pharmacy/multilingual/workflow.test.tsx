import { StrictMode } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { HubMultilingualContentLibraryPage } from '../HubMultilingualContentLibraryPage';
import { StoreMultilingualContentsMyPage } from '../StoreMultilingualContentsMyPage';
import Editor from '../StoreProductMultilingualContentPage';
import { MultilingualPublicActions } from '../../../components/MultilingualPublicActions';
import { hasPublishableMlcPage, hasPublishableMlcSummary, type StoreMlcGroupDetail, type StoreMlcPageDetail, type StoreMlcLocale, type StoreMlcStatus } from '../../../api/multilingualProductContentStore';
const api = vi.hoisted(() => ({ store: 'A', active: 'A', hub: vi.fn(), list: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), page: vi.fn(), status: vi.fn(), resolve: vi.fn(), imported: vi.fn(), products: vi.fn(), key: vi.fn(), qr: vi.fn(), success: vi.fn(), error: vi.fn() }));
vi.mock('../../../contexts/AuthContext', () => ({ getAccessToken: () => 'synthetic' }));
vi.mock('../../../contexts/StoreContext', () => ({ useUnifiedStore: () => ({ status: 'ready', organizationId: api.store }) }));
vi.mock('../../../lib/storeOrganizationHeader', () => ({ getActiveStoreOrganizationId: () => api.active }));
vi.mock('../../../lib/apiClient', () => ({ API_BASE_URL: '', api: { interceptors: { request: { use: vi.fn() } } } }));
vi.mock('../../../api/handledProducts', () => ({ fetchHandledProducts: api.products }));
vi.mock('../../../api/multilingualProductContentStore', async original => ({ ...(await original<object>()), listMlcHub: api.hub, listMyMlcGroups: api.list, getStoreMlcGroup: api.get, createStoreMlcGroup: api.create, updateStoreMlcGroup: api.update, upsertStoreMlcPage: api.page, setStoreMlcPageStatus: api.status, resolveMlc: api.resolve, importMlcFromHub: api.imported, ensureMlcPublicKey: api.key, getMlcQr: api.qr }));
vi.mock('@o4o/error-handling', () => ({ toast: { success: api.success, error: api.error } }));
vi.mock('@o4o/content-editor', () => ({
  sanitizeRichHtml: (html: string) => html,
  RichTextEditor: ({ value, onChange, editable }: { value: string; onChange: (value: { html: string }) => void; editable: boolean }) => <textarea aria-label="본문" value={value} disabled={!editable} onChange={e => onChange({ html: e.target.value })} />,
  LlmAssistPanel: () => null,
}));
const localePage = (locale: StoreMlcLocale = 'ko', title = 'Saved KO', status: StoreMlcStatus = 'draft'): StoreMlcPageDetail => ({ id: locale, groupId: 'group', locale, title, status, contentFormat: 'html', content: { html: `<p>${title}</p>` }, summary: 'Saved summary', assets: [], buttons: [], isDefault: locale === 'ko', sortOrder: 0, updatedAt: '' });
const group = (patch: Partial<StoreMlcGroupDetail> = {}): StoreMlcGroupDetail => ({ id: 'group', organizationId: 'A', title: 'Store guide', targetKind: 'local', targetId: 'local-a', defaultLocale: 'ko', contentKey: 'default', sourceType: 'operator_hub', status: 'draft', pages: [localePage(), localePage('en', 'Saved EN')], metadata: {}, createdAt: '', updatedAt: '', ...patch });
const hubItem = { id: 'source', title: 'Source guide', locales: ['ko', 'en'], localeCount: 2 };
const products = (id = 'local-a', sourceType = 'local', total = 1) => ({ items: [{ sourceId: id, sourceType, name: `Product ${id}` }], pagination: { total } });
function deferred<T>() { let resolve!: (value: T) => void, reject!: (error: Error) => void; const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
function Location() { const loc = useLocation(); return <output aria-label="location">{loc.pathname}{loc.search}</output>; }
const wrap = (element: React.ReactNode, path = '/store/library/multilingual-product-contents') => <MemoryRouter initialEntries={[path]}>{element}<Location /></MemoryRouter>;
function editor(path = '/store/products/multilingual/local/local-a') { return render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/store/products/multilingual/:targetKind/:targetId" element={<Editor />} /></Routes><Location /></MemoryRouter>); }
const input = (name: string, value: string) => fireEvent.change(screen.getByLabelText(name), { target: { value } });
beforeEach(() => {
  vi.clearAllMocks(); api.store = api.active = 'A';
  api.hub.mockReset().mockResolvedValue({ data: [hubItem], meta: { total: 1 } });
  api.list.mockReset().mockResolvedValue([group()]); api.get.mockReset().mockResolvedValue(group());
  api.create.mockReset().mockResolvedValue(group()); api.update.mockReset().mockResolvedValue(group()); api.page.mockReset().mockResolvedValue(group()); api.status.mockReset().mockResolvedValue(group());
  api.imported.mockReset().mockResolvedValue(group()); api.products.mockReset().mockResolvedValue(products());
  api.resolve.mockReset().mockResolvedValue({ group: group(), page: { ...localePage('en', 'Fallback EN', 'published'), resolvedLocale: 'en', fallbackReason: 'requested_locale_missing' } });
  api.key.mockReset().mockResolvedValue({ url: 'https://example.test/multilingual-products/key', publicKey: 'key' });
  api.qr.mockReset().mockResolvedValue({ url: 'https://example.test/multilingual-products/key', svg: '<svg></svg>' });
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockResolvedValue(undefined) } });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
async function openImport() { render(wrap(<HubMultilingualContentLibraryPage />)); fireEvent.click(await screen.findByRole('button', { name: '가져오기' })); await screen.findByLabelText('연결할 제품'); }
it('keeps failed product reads distinct from empty results and retries', async () => {
  api.products.mockRejectedValueOnce(new Error('private diagnostic'));
  render(wrap(<HubMultilingualContentLibraryPage />)); fireEvent.click(await screen.findByRole('button', { name: '가져오기' }));
  await screen.findByRole('alert'); expect(screen.queryByText(/연결 가능한 제품이 없습니다/)).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '제품 다시 시도' })); await screen.findByLabelText('연결할 제품');
});
it('ignores a late product-kind result and clears the previous selection', async () => {
  const old = deferred<ReturnType<typeof products>>(); api.products.mockReturnValueOnce(old.promise).mockResolvedValue(products('listing-b', 'listing'));
  render(wrap(<HubMultilingualContentLibraryPage />)); fireEvent.click(await screen.findByRole('button', { name: '가져오기' }));
  input('제품 종류', 'listing'); await screen.findByRole('option', { name: 'Product listing-b' });
  await act(async () => old.resolve(products())); expect(screen.queryByRole('option', { name: 'Product local-a' })).toBeNull();
  expect((screen.getByRole('button', { name: '가져오기 실행' }) as HTMLButtonElement).disabled).toBe(true);
});
it('searches beyond the first page and retains a selected product across failed import retry', async () => {
  await openImport(); input('연결할 제품', 'local-a'); api.imported.mockRejectedValueOnce(new Error('private'));
  fireEvent.click(screen.getByRole('button', { name: '가져오기 실행' })); await screen.findByText(/선택한 제품을 유지했습니다/);
  expect((screen.getByLabelText('연결할 제품') as HTMLSelectElement).value).toBe('local-a');
  input('연결할 제품 검색', 'later'); fireEvent.click(screen.getByRole('button', { name: '검색' }));
  await waitFor(() => expect(api.products).toHaveBeenLastCalledWith({ source: 'local', page: 1, limit: 20, search: 'later' }));
  fireEvent.click(screen.getByRole('button', { name: '가져오기 실행' }));
  await waitFor(() => expect(screen.getByLabelText('location').textContent).toContain('/my?groupId=group'));
});
it('serializes imports and prevents Escape, backdrop and kind edits during a write', async () => {
  const pending = deferred<StoreMlcGroupDetail>(); api.imported.mockReturnValue(pending.promise); await openImport(); input('연결할 제품', 'local-a');
  const submit = screen.getByRole('button', { name: '가져오기 실행' }); fireEvent.click(submit); fireEvent.click(submit);
  expect(api.imported).toHaveBeenCalledTimes(1); fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' }); expect(screen.getByRole('dialog')).toBeTruthy();
  fireEvent.click(screen.getByTestId('mlc-import-backdrop')); expect(screen.getByRole('dialog')).toBeTruthy();
  expect(screen.getByLabelText('제품 종류').matches(':disabled')).toBe(true);
  await act(async () => pending.resolve(group()));
});
it('closes the import dialog with Escape before submission and restores focus', async () => {
  await openImport(); fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' }); expect(screen.queryByRole('dialog')).toBeNull();
  expect(api.imported).not.toHaveBeenCalled();
});
it('closes the import dialog from the backdrop but not from clicks inside the dialog', async () => {
  await openImport(); fireEvent.click(screen.getByRole('dialog')); expect(screen.getByRole('dialog')).toBeTruthy();
  fireEvent.click(screen.getByTestId('mlc-import-backdrop')); expect(screen.queryByRole('dialog')).toBeNull();
  expect(api.imported).not.toHaveBeenCalled();
});
it('drops old-store import success before the store rerenders', async () => {
  const pending = deferred<StoreMlcGroupDetail>(); api.imported.mockReturnValue(pending.promise); await openImport(); input('연결할 제품', 'local-a'); fireEvent.click(screen.getByRole('button', { name: '가져오기 실행' }));
  api.active = 'B'; await act(async () => pending.resolve(group())); expect(api.success).not.toHaveBeenCalled(); expect(screen.getByLabelText('location').textContent).not.toContain('/my?');
});
it('resets the library and ignores stale reads on a store switch', async () => {
  const old = deferred<{ data: typeof hubItem[]; meta: { total: number } }>(); api.hub.mockReturnValueOnce(old.promise).mockResolvedValue({ data: [{ ...hubItem, title: 'New store source' }], meta: { total: 1 } });
  const h = render(wrap(<HubMultilingualContentLibraryPage />)); api.store = api.active = 'B'; h.rerender(wrap(<HubMultilingualContentLibraryPage />));
  await screen.findByText('New store source'); await act(async () => old.resolve({ data: [hubItem], meta: { total: 1 } })); expect(screen.queryByText('Source guide')).toBeNull();
});
it('offers an explicit group-specific product editor link after import', async () => {
  render(wrap(<StoreMultilingualContentsMyPage />, '/work/kpa-society/store/library/multilingual-product-contents/my?groupId=group'));
  const link = await screen.findByRole('link', { name: '연결 제품의 언어별 내용 확인·편집' }); expect(link.getAttribute('href')).toBe('/work/kpa-society/store/products/multilingual/local/local-a?groupId=group');
});
it('shows all language choices and the actual fallback content', async () => {
  render(wrap(<StoreMultilingualContentsMyPage />)); await screen.findByLabelText('확인할 언어');
  expect(screen.getAllByRole('option')).toHaveLength(7); input('확인할 언어', 'zh'); fireEvent.click(screen.getByRole('button', { name: '발행 내용 보기' }));
  await screen.findByRole('heading', { name: 'Fallback EN' }); expect(screen.getByText(/표시 English.*대체 언어/)).toBeTruthy();
});
it('keeps a missing published language distinct from a network failure', async () => {
  api.resolve.mockRejectedValueOnce(Object.assign(new Error('private'), { code: 'PUBLISHED_PAGE_NOT_FOUND' }));
  render(wrap(<StoreMultilingualContentsMyPage />)); fireEvent.click(await screen.findByRole('button', { name: '발행 내용 보기' }));
  await screen.findByText(/발행된 대체 언어가 없습니다/); fireEvent.click(screen.getByRole('button', { name: '언어별 보기 다시 시도' })); await screen.findByRole('heading', { name: 'Fallback EN' });
  expect(screen.queryByText(/발행된 대체 언어가 없습니다/)).toBeNull(); expect(api.resolve).toHaveBeenCalledTimes(2);
});
it('ignores a language preview after the selected language changes', async () => {
  const old = deferred<unknown>(); api.resolve.mockReturnValue(old.promise); render(wrap(<StoreMultilingualContentsMyPage />));
  fireEvent.click(await screen.findByRole('button', { name: '발행 내용 보기' })); input('확인할 언어', 'ja');
  await act(async () => old.resolve({ page: { ...localePage('en', 'Old preview'), resolvedLocale: 'en' } })); expect(screen.queryByRole('heading', { name: 'Old preview' })).toBeNull();
});
it('loads the explicitly selected imported group instead of silently choosing default', async () => {
  api.get.mockResolvedValue(group({ id: 'copy' }));
  editor('/store/products/multilingual/local/local-a?groupId=copy'); await screen.findByLabelText('언어별 제목');
  expect(api.get).toHaveBeenCalledWith('copy'); expect(api.list).not.toHaveBeenCalled();
});
it('retries failed editor reads without entering a blank creation mode', async () => {
  api.list.mockRejectedValueOnce(new Error('private')); editor(); await screen.findByRole('alert'); expect(api.create).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: '다시 시도' })); await screen.findByLabelText('언어별 제목');
});
it('preserves every locale draft and the active tab on basic metadata save', async () => {
  editor(); await screen.findByLabelText('언어별 제목'); input('언어별 제목', 'Unsaved KO'); fireEvent.click(screen.getByRole('button', { name: /English/ })); input('본문', 'Unsaved EN');
  input('콘텐츠 제목', 'Updated group'); api.update.mockResolvedValue(group({ title: 'Updated group' })); fireEvent.click(screen.getByRole('button', { name: '기본 정보 저장' }));
  await waitFor(() => expect(api.success).toHaveBeenCalled()); expect((screen.getByLabelText('본문') as HTMLTextAreaElement).value).toBe('Unsaved EN');
  fireEvent.click(screen.getByRole('button', { name: /한국어.*기본/ })); expect((screen.getByLabelText('언어별 제목') as HTMLInputElement).value).toBe('Unsaved KO');
  expect(api.create).not.toHaveBeenCalled();
});
it('saves only the current language while preserving other languages and metadata inputs', async () => {
  editor(); await screen.findByLabelText('언어별 제목'); input('언어별 제목', 'Unsaved KO'); input('콘텐츠 제목', 'Unsaved meta');
  fireEvent.click(screen.getByRole('button', { name: /English/ })); input('언어별 제목', 'New EN'); input('언어별 요약', '');
  api.page.mockResolvedValue(group({ pages: [localePage(), localePage('en', 'New EN')] })); fireEvent.click(screen.getByRole('button', { name: '임시 저장' }));
  await waitFor(() => expect(api.success).toHaveBeenCalled()); expect(api.page).toHaveBeenCalledWith('group', 'en', expect.objectContaining({ title: 'New EN', summary: '' }));
  expect((screen.getByLabelText('콘텐츠 제목') as HTMLInputElement).value).toBe('Unsaved meta'); fireEvent.click(screen.getByRole('button', { name: /한국어.*기본/ }));
  expect((screen.getByLabelText('언어별 제목') as HTMLInputElement).value).toBe('Unsaved KO');
});
it('keeps failed writes retryable and serializes metadata and language writes', async () => {
  const pending = deferred<StoreMlcGroupDetail>(); api.page.mockReturnValueOnce(pending.promise); editor(); await screen.findByLabelText('언어별 제목'); input('언어별 제목', 'Keep me');
  const save = screen.getByRole('button', { name: '임시 저장' }); fireEvent.click(save); fireEvent.click(save);
  expect(api.page).toHaveBeenCalledTimes(1); expect((screen.getByRole('button', { name: '기본 정보 저장' }) as HTMLButtonElement).disabled).toBe(true);
  await act(async () => pending.reject(new Error('private'))); await screen.findByRole('alert'); expect((screen.getByLabelText('언어별 제목') as HTMLInputElement).value).toBe('Keep me');
  fireEvent.click(screen.getByRole('button', { name: '임시 저장' })); await waitFor(() => expect(api.page).toHaveBeenCalledTimes(2));
});
it('blocks public actions until unsaved inputs are saved', async () => {
  editor(); await screen.findByLabelText('언어별 제목'); input('본문', '<p>Unsaved</p>');
  expect((screen.getByRole('button', { name: 'QR 보기' }) as HTMLButtonElement).disabled).toBe(true); expect(screen.getByText(/미저장 변경이 있습니다/)).toBeTruthy();
});
it('preserves unsupported imported page formats instead of saving empty HTML', async () => {
  api.get.mockResolvedValue(group({ pages: [{ ...localePage(), contentFormat: 'blocks', content: { blocks: [] } }] })); editor(); await screen.findByText(/HTML 편집을 지원하지 않는 형식/);
  expect((screen.getByRole('button', { name: '임시 저장' }) as HTMLButtonElement).disabled).toBe(true); expect(api.page).not.toHaveBeenCalled();
});
it('lets a published non-HTML page be moved back to draft without touching its body', async () => {
  const blocksPage = (status: StoreMlcStatus) => ({ ...localePage('ko', 'Imported blocks', status), contentFormat: 'blocks', content: { blocks: [] } });
  const published = group({ pages: [blocksPage('published')] });
  api.list.mockResolvedValue([published]); api.get.mockResolvedValue(published); api.status.mockResolvedValue(group({ pages: [blocksPage('draft')] }));
  editor(); await screen.findByText(/HTML 편집을 지원하지 않는 형식/);
  expect((screen.getByRole('button', { name: '저장 후 이 언어 발행' }) as HTMLButtonElement).disabled).toBe(true);
  const unpublish = screen.getByRole('button', { name: '초안으로 내리기' }) as HTMLButtonElement; expect(unpublish.disabled).toBe(false);
  fireEvent.click(unpublish); await waitFor(() => expect(api.status).toHaveBeenCalledWith('group', 'ko', 'draft'));
  await waitFor(() => expect(screen.queryByRole('button', { name: '초안으로 내리기' })).toBeNull()); expect(api.page).not.toHaveBeenCalled();
});
it('clears old product drafts and ignores an old save when the route changes', async () => {
  const pending = deferred<StoreMlcGroupDetail>(); api.page.mockReturnValue(pending.promise);
  function Host() { const nav = useNavigate(); return <><button onClick={() => nav('/store/products/multilingual/local/local-b')}>Other product</button><Routes><Route path="/store/products/multilingual/:targetKind/:targetId" element={<Editor />} /></Routes></>; }
  render(wrap(<Host />, '/store/products/multilingual/local/local-a')); await screen.findByLabelText('언어별 제목'); fireEvent.click(screen.getByRole('button', { name: '임시 저장' }));
  api.list.mockResolvedValue([]); fireEvent.click(screen.getByText('Other product')); await screen.findByText(/먼저/);
  await act(async () => pending.resolve(group())); expect(screen.queryByLabelText('언어별 제목')).toBeNull(); expect(api.success).not.toHaveBeenCalled();
});
it('serializes public issuance and exposes QR failures for retry', async () => {
  const pending = deferred<{ url: string }>(); api.key.mockReturnValueOnce(pending.promise); api.qr.mockRejectedValueOnce(new Error('private'));
  render(wrap(<MultilingualPublicActions groupId="group" publishable />)); const qr = screen.getByRole('button', { name: 'QR 보기' }); fireEvent.click(qr); fireEvent.click(qr); expect(api.key).toHaveBeenCalledTimes(1);
  await act(async () => pending.resolve({ url: 'https://example.test/key' })); await screen.findByRole('alert'); fireEvent.click(screen.getByRole('button', { name: 'QR 보기' })); await screen.findByRole('button', { name: 'QR 숨기기' });
});
it('does not issue a second QR request under the newly selected store', async () => {
  const pending = deferred<{ url: string }>(); api.key.mockReturnValue(pending.promise); const h = render(wrap(<MultilingualPublicActions groupId="group" publishable />)); fireEvent.click(screen.getByRole('button', { name: 'QR 보기' }));
  api.active = api.store = 'B'; h.rerender(wrap(<MultilingualPublicActions groupId="other-group" publishable />)); await act(async () => pending.resolve({ url: 'https://example.test/key' })); expect(api.qr).not.toHaveBeenCalled(); expect(screen.queryByRole('button', { name: 'QR 숨기기' })).toBeNull();
});
it('clears old QR and copy status when the group changes', async () => {
  const h = render(wrap(<MultilingualPublicActions groupId="group" publishable />)); fireEvent.click(screen.getByRole('button', { name: 'QR 보기' })); await screen.findByRole('button', { name: 'QR 숨기기' });
  h.rerender(wrap(<MultilingualPublicActions groupId="other" publishable />)); expect(screen.queryByRole('button', { name: 'QR 숨기기' })).toBeNull();
});
it('serializes public issuance with editor writes so a draft change cannot race the public-key promotion', async () => {
  const published = group({ pages: [localePage('ko', 'Saved KO', 'published'), localePage('en', 'Saved EN')] });
  api.list.mockResolvedValue([published]); api.get.mockResolvedValue(published); const issuing = deferred<{ url: string }>(); api.key.mockReturnValue(issuing.promise);
  editor(); fireEvent.click(await screen.findByRole('button', { name: 'QR 보기' })); await waitFor(() => expect(api.key).toHaveBeenCalledTimes(1));
  const unpublish = screen.getByRole('button', { name: '초안으로 내리기' }) as HTMLButtonElement;
  expect(unpublish.disabled).toBe(true); expect((screen.getByRole('button', { name: '임시 저장' }) as HTMLButtonElement).disabled).toBe(true);
  expect((screen.getByRole('button', { name: '저장 후 이 언어 발행' }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(unpublish); expect(api.status).not.toHaveBeenCalled();
  await act(async () => issuing.resolve({ url: 'https://example.test/multilingual-products/key' }));
  await screen.findByRole('button', { name: 'QR 숨기기' }); expect(api.qr).toHaveBeenCalledWith('group');
  await waitFor(() => expect((screen.getByRole('button', { name: '초안으로 내리기' }) as HTMLButtonElement).disabled).toBe(false));
});
it('does not start a public action while the shared editor lock is held', async () => {
  vi.spyOn(window, 'open');
  render(wrap(<MultilingualPublicActions groupId="group" publishable acquireLock={() => null} />));
  fireEvent.click(screen.getByRole('button', { name: '고객용 보기' })); fireEvent.click(screen.getByRole('button', { name: 'QR 보기' }));
  await screen.findByText(/편집 내용을 저장하는 중입니다/); expect(api.key).not.toHaveBeenCalled(); expect(window.open).not.toHaveBeenCalled();
});
it('releases the shared lock after a public action, including a blocked popup', async () => {
  const release = vi.fn(); const acquire = vi.fn(() => release); vi.spyOn(window, 'open').mockReturnValue(null);
  render(wrap(<MultilingualPublicActions groupId="group" publishable acquireLock={acquire} />));
  fireEvent.click(screen.getByRole('button', { name: '고객용 보기' })); expect(release).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'QR 보기' })); await screen.findByRole('button', { name: 'QR 숨기기' });
  expect(acquire).toHaveBeenCalledTimes(2); expect(release).toHaveBeenCalledTimes(2);
});
it('cancels link delivery and closes the popup when the publication refresh was not applied', async () => {
  const popup = { opener: {}, close: vi.fn(), location: { replace: vi.fn() } };
  vi.spyOn(window, 'open').mockReturnValue(popup as unknown as Window);
  render(wrap(<MultilingualPublicActions groupId="group" publishable onPublished={async () => false} />));
  fireEvent.click(screen.getByRole('button', { name: '고객용 보기' }));
  await screen.findByText(/고객용 링크·QR 전달을 중단했습니다/);
  expect(popup.close).toHaveBeenCalled(); expect(popup.location.replace).not.toHaveBeenCalled(); expect(api.error).not.toHaveBeenCalled();
});
it('opens a tab synchronously and closes a stale pending popup on unmount', async () => {
  const pending = deferred<{ url: string }>(); api.key.mockReturnValue(pending.promise); const popup = { opener: {}, close: vi.fn(), location: { replace: vi.fn() } };
  vi.spyOn(window, 'open').mockReturnValue(popup as unknown as Window); const h = render(wrap(<MultilingualPublicActions groupId="group" publishable />)); fireEvent.click(screen.getByRole('button', { name: '고객용 보기' }));
  expect(window.open).toHaveBeenCalledWith('about:blank', '_blank'); expect(popup.opener).toBeNull(); h.unmount(); expect(popup.close).toHaveBeenCalled();
  await act(async () => pending.resolve({ url: 'https://example.test/key' })); expect(popup.location.replace).not.toHaveBeenCalled();
});
it('reports blocked popups without publishing and copies a usable URL', async () => {
  vi.spyOn(window, 'open').mockReturnValue(null); render(wrap(<MultilingualPublicActions groupId="group" publishable />)); fireEvent.click(screen.getByRole('button', { name: '고객용 보기' }));
  expect(screen.getByText(/새 창이 차단/)).toBeTruthy(); expect(api.key).not.toHaveBeenCalled(); fireEvent.click(screen.getByRole('button', { name: 'URL 복사' }));
  await screen.findByRole('button', { name: '복사됨' }); expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://example.test/multilingual-products/key');
});
it('survives StrictMode read cleanup without showing a stale failure', async () => {
  render(wrap(<StrictMode><StoreMultilingualContentsMyPage /></StrictMode>)); await screen.findByRole('heading', { name: 'Store guide' }); expect(screen.queryByRole('alert')).toBeNull();
});
it('treats only non-archived groups with a saved non-archived page as publicly publishable', () => {
  expect(hasPublishableMlcPage(group())).toBe(true);
  expect(hasPublishableMlcPage(group({ pages: [localePage('ko', 'Live', 'published')] }))).toBe(true);
  expect(hasPublishableMlcPage(group({ pages: [] }))).toBe(false);
  expect(hasPublishableMlcPage(group({ pages: [localePage('ko', 'Old', 'archived'), localePage('en', 'Old', 'archived')] }))).toBe(false);
  expect(hasPublishableMlcPage(group({ status: 'archived' }))).toBe(false);
  expect(hasPublishableMlcPage(null)).toBe(false);
  expect(hasPublishableMlcSummary({ status: 'draft', locales: ['ko'] })).toBe(true);
  expect(hasPublishableMlcSummary({ status: 'draft', locales: [] })).toBe(false);
  expect(hasPublishableMlcSummary({ status: 'archived', locales: ['ko'] })).toBe(false);
});
it('disables customer link and QR actions for groups without a publishable page', async () => {
  api.list.mockResolvedValue([
    group({ id: 'empty', title: 'Empty guide', pages: [] }),
    group({ id: 'archived', title: 'Archived pages', pages: [localePage('ko', 'Old', 'archived')] }),
  ]);
  render(wrap(<StoreMultilingualContentsMyPage />));
  for (const name of ['Empty guide', 'Archived pages']) {
    const card = await screen.findByRole('region', { name });
    for (const label of ['고객용 보기', '태블릿 보기', 'URL 복사', 'QR 보기']) {
      const button = Array.from(card.querySelectorAll('button')).find(b => b.textContent?.includes(label)) as HTMLButtonElement;
      expect(button.disabled).toBe(true); fireEvent.click(button);
    }
    expect(card.textContent).toContain('공개할 수 있는 저장된 언어 페이지가 없습니다');
  }
  expect(api.key).not.toHaveBeenCalled(); expect(api.qr).not.toHaveBeenCalled();
});
it('keeps public actions enabled for a group with a saved draft page', async () => {
  render(wrap(<StoreMultilingualContentsMyPage />)); const card = await screen.findByRole('region', { name: 'Store guide' });
  const qr = Array.from(card.querySelectorAll('button')).find(b => b.textContent?.includes('QR 보기')) as HTMLButtonElement;
  expect(qr.disabled).toBe(false); fireEvent.click(qr); await waitFor(() => expect(api.qr).toHaveBeenCalledWith('group'));
});
it('disables public actions in the product editor when every saved page is archived', async () => {
  api.get.mockResolvedValue(group({ pages: [localePage('ko', 'Old', 'archived')] })); api.list.mockResolvedValue([group({ pages: [localePage('ko', 'Old', 'archived')] })]);
  editor('/store/products/multilingual/local/local-a?groupId=group');
  const qr = await screen.findByRole('button', { name: 'QR 보기' }); expect((qr as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(qr); expect(api.key).not.toHaveBeenCalled();
});
it('blocks the public action component itself when not publishable', () => {
  render(wrap(<MultilingualPublicActions groupId="group" publishable={false} />));
  fireEvent.click(screen.getByRole('button', { name: 'QR 보기' })); expect(api.key).not.toHaveBeenCalled();
  expect((screen.getByRole('button', { name: 'URL 복사' }) as HTMLButtonElement).disabled).toBe(true);
});
