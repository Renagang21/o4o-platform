import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation, useNavigate, Link } from 'react-router-dom';
import { useStoreLibraryRoute } from '../useStoreLibraryRoute';
import StoreLibraryContentsPage from '../../StoreLibraryContentsPage';
const context = vi.hoisted(() => ({ scope: 'A:kpa-society', organizationId: 'A' }));
vi.mock('../useLibraryScope', () => ({ useLibraryScope: () => context }));
vi.mock('../../../../components/store/StoreTaskPageShell', () => ({ StoreTaskPageShell: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('../../../../components/StoreLibraryNavigation', () => ({ StoreLibraryNavigation: () => null }));
vi.mock('../../../../api/assetSnapshot', () => ({ storeAssetControlApi: {} }));
vi.mock('../../StoreContentsSelector', () => ({ StoreContentsSelector: () => null }));
vi.mock('../../StartProductionModal', () => ({ StartProductionModal: () => null }));
vi.mock('../../ContentCreationGuideModal', () => ({ ContentCreationGuideModal: () => null }));
vi.mock('../../CreateContentFromResourcesModal', () => ({ CreateContentFromResourcesModal: ({ open, onClose }: { open: boolean; onClose: () => void }) => open ? <button onClick={onClose}>작성 취소</button> : null }));
afterEach(() => { cleanup(); context.scope = 'A:kpa-society'; });
function Probe() {
  const { base, libraryPath, returnState, backPath } = useStoreLibraryRoute();
  const location = useLocation();
  return <><output data-testid="return">{libraryPath}</output><output data-testid="back">{backPath}</output><output data-testid="state">{JSON.stringify(location.state)}</output><Link to={`${base}/content/direct/one`} state={returnState}>편집</Link></>;
}
it('editing retains the scoped library search and removes creation-only parameters', () => {
  const base = '/work/kpa-society/store';
  render(<MemoryRouter initialEntries={[`${base}/library/contents?librarySearch=Guide&librarySource=mine&create=1&pType=local&pId=one&pName=Sample&pStore=A`]}><Routes><Route path="*" element={<Probe />} /></Routes></MemoryRouter>);
  fireEvent.click(screen.getByRole('link', { name: '편집' }));
  expect(screen.getByTestId('return').textContent).toBe(`${base}/library/contents?librarySearch=Guide&librarySource=mine`);
});
it.each(['https://untrusted.example/path', '/store/other', '/store/library/contents/other'])('rejects a return target outside the exact library route: %s', libraryReturn => {
  render(<MemoryRouter initialEntries={[{ pathname: '/store/content/direct/one', state: { libraryReturn, libraryScope: context.scope } }]}><Probe /></MemoryRouter>);
  expect(screen.getByTestId('return').textContent).toBe('/store/library/contents');
});
it('another store cannot inherit the previous library query', () => {
  render(<MemoryRouter initialEntries={[{ pathname: '/store/content/direct/one', state: { libraryReturn: '/store/library/contents?librarySearch=Old', libraryScope: 'other:kpa-society' } }]}><Probe /></MemoryRouter>);
  expect(screen.getByTestId('return').textContent).toBe('/store/library/contents');
});
it.each(['/store', '/work/kpa-society/store'])('the new studio list retains its own search and return route: %s', base => {
 render(<MemoryRouter initialEntries={[`${base}/workspace/studio?librarySearch=Guide&librarySource=mine&libraryPage=2`]}><Routes><Route path="*" element={<Probe />} /></Routes></MemoryRouter>);
 fireEvent.click(screen.getByRole('link',{name:'편집'}));
 expect(screen.getByTestId('return').textContent).toBe(`${base}/workspace/studio?librarySearch=Guide&librarySource=mine&libraryPage=2`);
});
it.each(['/store', '/work/kpa-society/store'])('product-origin editing carries the exact scoped product return through the library: %s', base => {
  const productReturn = { path: `${base}/workspace/commerce?q=Sample&source=local&page=2&limit=50`, scope: context.scope, selectedKey: 'local:one' };
  render(<MemoryRouter initialEntries={[{ pathname: `${base}/library/contents`, state: { productReturn } }]}><Probe /></MemoryRouter>);
  fireEvent.click(screen.getByRole('link', { name: '편집' }));
  expect(screen.getByTestId('back').textContent).toBe(productReturn.path);
  expect(JSON.parse(screen.getByTestId('state').textContent!).productReturn).toEqual(productReturn);
});
it.each(['/store', '/work/kpa-society/store'])('cancel returns to the existing product entry so one Back leaves the list: %s', async base => {
  const path = `${base}/workspace/commerce?q=Sample&source=local&page=2&limit=50`;
  const productReturn = { path, scope: context.scope, selectedKey: 'local:one' };
  function HistoryButtons() { const navigate = useNavigate(); return <><button onClick={() => navigate(-1)}>뒤로</button><button onClick={() => navigate(1)}>앞으로</button></>; }
  render(<MemoryRouter initialIndex={2} initialEntries={[
    `${base}/workspace/studio`,
    { pathname: `${base}/workspace/commerce`, search: '?q=Sample&source=local&page=2&limit=50', state: { productReturn } },
    { pathname: `${base}/library/contents`, search: '?create=1&pType=local&pId=one&pStore=A', state: { productReturn } },
  ]}><HistoryButtons /><Routes>
    <Route path={`${base}/workspace/studio`} element={<p>이전 화면</p>} />
    <Route path={`${base}/workspace/commerce`} element={<Probe />} />
    <Route path={`${base}/library/contents`} element={<StoreLibraryContentsPage />} />
  </Routes></MemoryRouter>);
  fireEvent.click(await screen.findByRole('button', { name: '작성 취소' }));
  expect(screen.getByTestId('back').textContent).toBe(path);
  expect(JSON.parse(screen.getByTestId('state').textContent!).productReturn).toEqual(productReturn);
  fireEvent.click(screen.getByRole('button', { name: '뒤로' }));
  expect(screen.getByText('이전 화면')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '앞으로' }));
  expect(JSON.parse(screen.getByTestId('state').textContent!).productReturn).toEqual(productReturn);
});
it.each([
  { path: 'https://untrusted.example/store/my-products', scope: 'A:kpa-society' },
  { path: '/store/my-products/other', scope: 'A:kpa-society' },
  { path: '/store/my-products', scope: 'B:kpa-society' },
  { path: '/work/other/store/my-products', scope: 'A:kpa-society' },
  { path: '/store/my-products', scope: 'A:other-service' },
])('rejects an unrelated product return: %j', value => {
  render(<MemoryRouter initialEntries={[{ pathname: '/store/library/contents', state: { productReturn: { ...value, selectedKey: 'local:one' } } }]}><Probe /></MemoryRouter>);
  expect(screen.getByTestId('back').textContent).toBe('/store/library/contents');
});
