import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'member' }, isLoading: false }), authClient: { api: {} } }));
vi.mock('../api', async importOriginal => ({ ...await importOriginal<typeof import('../api')>(), businessApi: { get: mocks.get } }));
import BusinessWorkspace from '../BusinessWorkspace';
afterEach(cleanup);
it.each(['pharmacy', 'megapharm', 'carepharm'].flatMap(key => ['multiple', 'invalid', 'selected', 'single'].map(mode => ({ key, mode }))))('validates the selected pharmacy before linking support: $key / $mode', async ({ key, mode }) => {
  const stores = [{ organizationId: 'store-a', organizationName: '약국 A', memberRole: 'owner' }, ...(mode === 'single' ? [] : [{ organizationId: 'store-b', organizationName: '약국 B', memberRole: 'owner' }])];
  mocks.get.mockReset();
  mocks.get.mockImplementation(async (path: string) => {
    if (path.endsWith('/businesses/' + key)) return { key, name: '검증 협업체', communityKey: 'business:' + key };
    if (path.endsWith('/access')) return { kind: 'semi-franchise', businessKey: key, allowed: true, canManage: false };
    if (path === '/work-scope/accessible-stores') return { stores };
    if (path.endsWith('/semi-franchises')) return [{ key, membershipStatus: 'active' }];
    throw new Error('Unexpected request ' + path);
  });
  const search = mode === 'invalid' ? '?store=foreign' : mode === 'selected' ? '?store=store-b' : '';
  render(<MemoryRouter initialEntries={[`/businesses/${key}${search}`]}><Routes><Route path="/businesses/:businessKey" element={<BusinessWorkspace memberLayout />}><Route index element={<p>회원 홈</p>} /></Route></Routes></MemoryRouter>);
  await screen.findByText('회원 홈');
  await waitFor(() => expect(mocks.get.mock.calls.filter(([path]) => path.endsWith('/semi-franchises'))).toHaveLength(stores.length));
  await act(async () => { await Promise.resolve(); });
  const href = screen.getByRole('link', { name: '지원' }).getAttribute('href');
  if (mode === 'multiple' || mode === 'invalid') expect(href).toBe('/contact');
  else {
    expect(href).toContain(`?store=${mode === 'single' ? 'store-a' : 'store-b'}#cooperation-support`);
    if (key === 'megapharm') expect(href).toContain('/businesses/megapharm');
  }
});
