import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation, Link } from 'react-router-dom';
import { useStoreLibraryRoute } from '../useStoreLibraryRoute';
const context = vi.hoisted(() => ({ scope: 'A:kpa-society' }));
vi.mock('../useLibraryScope', () => ({ useLibraryScope: () => context }));
afterEach(() => { cleanup(); context.scope = 'A:kpa-society'; });
function Probe() {
  const { base, libraryPath, returnState } = useStoreLibraryRoute();
  const location = useLocation();
  return <><output data-testid="return">{libraryPath}</output><output data-testid="state">{JSON.stringify(location.state)}</output><Link to={`${base}/content/direct/one`} state={returnState}>편집</Link></>;
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
