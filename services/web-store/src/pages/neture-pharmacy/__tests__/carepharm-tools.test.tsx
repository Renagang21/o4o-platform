import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ get: vi.fn(), organizationId: 'selected-store' as string | null }));
vi.mock('../../../contexts/StoreContext', () => ({ useUnifiedStore: () => ({ organizationId: state.organizationId }) }));
vi.mock('../../../api/neturePharmacy', () => ({ neturePharmacyApi: { getStoreContext: state.get } }));
vi.mock('../shared', () => ({ PharmacyPage: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));
import CarePharmToolsPage from '../CarePharmToolsPage';
beforeEach(() => { state.organizationId = 'selected-store'; state.get.mockReset(); });
afterEach(cleanup);
it('direct navigation requires CarePharm approval for the selected pharmacy', async () => {
  state.get.mockResolvedValue({ organizationId: 'selected-store', semiFranchiseKeys: ['pharmacy'] });
  render(<MemoryRouter><CarePharmToolsPage /></MemoryRouter>); await screen.findByText(/가입 승인 후/);
  expect(screen.queryByRole('link', { name: '공급 상품' })).toBeNull();
});
it('shows scoped existing resources and no nonfunctional CGM or redemption actions', async () => {
  state.get.mockResolvedValue({ organizationId: 'selected-store', semiFranchiseKeys: ['carepharm'] });
  render(<MemoryRouter><CarePharmToolsPage /></MemoryRouter>);
  expect((await screen.findByRole('link', { name: '사업 자료 가져오기' })).getAttribute('href')).toBe('/store/pharmacy/contents?business=carepharm');
  expect(screen.getByRole('link', { name: '공급 상품' }).getAttribute('href')).toContain('sf%3Acarepharm');
  expect(screen.queryByRole('textbox')).toBeNull(); expect(screen.getByText('CGM 서비스')).toBeTruthy();
});
it('does not reuse the previous store approval after switching pharmacies', async () => {
  state.get.mockResolvedValueOnce({ organizationId: 'selected-store', semiFranchiseKeys: ['carepharm'] }).mockResolvedValueOnce({ organizationId: 'next-store', semiFranchiseKeys: [] });
  const ui = render(<MemoryRouter><CarePharmToolsPage /></MemoryRouter>); await screen.findByText('CGM 서비스');
  state.organizationId = 'next-store'; ui.rerender(<MemoryRouter><CarePharmToolsPage /></MemoryRouter>);
  expect(screen.queryByText('CGM 서비스')).toBeNull(); await screen.findByText(/가입 승인 후/);
});
it('fails closed if the server returns another pharmacy context', async () => {
  state.get.mockResolvedValue({ organizationId: 'foreign-store', semiFranchiseKeys: ['carepharm'] });
  render(<MemoryRouter><CarePharmToolsPage /></MemoryRouter>); await screen.findByRole('alert');
  expect(screen.queryByText('CGM 서비스')).toBeNull();
});
