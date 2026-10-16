import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ list: vi.fn(), handoff: vi.fn(), post: vi.fn(), organization: 'store-a', role: 'owner' }));
vi.mock('../../../contexts/StoreContext', () => ({ useUnifiedStore: () => ({ organizationId: state.organization, stores: [{ organizationId: state.organization, memberRole: state.role }] }) }));
vi.mock('../../../lib/apiClient', () => ({ api: { post: state.post } }));
vi.mock('@o4o/auth-react', () => ({ requestServiceHandoff: state.handoff }));
vi.mock('../../../api/neturePharmacy', () => ({ neturePharmacyApi: { listSemiFranchises: state.list }, pharmacyErrorMessage: () => '조회 실패' }));
vi.mock('../shared', () => ({ PharmacyPage: ({ children }: { children: React.ReactNode }) => <main>{children}</main>, StatusBadge: ({ status }: { status: string }) => <span>{status}</span>, Notice: ({ children }: { children: React.ReactNode }) => <p role="alert">{children}</p>, btn: {}, formatDate: () => '' }));
import SemiFranchisesPage from '../SemiFranchisesPage';
beforeEach(() => {
  state.organization = 'store-a'; state.role = 'owner'; state.list.mockReset(); state.post.mockReset(); state.handoff.mockReset().mockRejectedValue(new Error('handoff unavailable'));
  state.list.mockResolvedValue([{ key: 'carepharm', name: '만성질환관리', membershipStatus: null, communityKey: 'business:carepharm' }]);
});
afterEach(cleanup);
it('moves application management to the independent model and never applies from Store', async () => {
  render(<MemoryRouter><SemiFranchisesPage /></MemoryRouter>);
  fireEvent.click(await screen.findByRole('button', { name: '서비스에서 가입 · 상태 관리' }));
  await screen.findByRole('alert');
  expect(state.handoff).toHaveBeenCalledWith(expect.anything(), { serviceKey: 'carepharm', origin: 'https://carepharm.neture.co.kr', returnPath: '/my/participation?store=store-a' });
  expect(state.post).not.toHaveBeenCalled();
  expect(screen.queryByRole('button', { name: '가입 신청' })).toBeNull();
});
it('only approved CarePharm rows expose this model work entry', async () => {
  state.list.mockResolvedValue([{ key: 'carepharm', name: '만성질환관리', membershipStatus: 'active', communityKey: 'business:carepharm' }, { key: 'other', name: '다른 모델', membershipStatus: 'pending' }]);
  render(<MemoryRouter><SemiFranchisesPage /></MemoryRouter>);
  const link = await screen.findByRole('link', { name: '만성질환관리 업무' }); expect(link.getAttribute('href')).toBe('/store/pharmacy/carepharm');
  expect(within(screen.getByTestId('semi-franchise-other')).queryByRole('link', { name: '공급 상품' })).toBeNull();
});
it('clears another pharmacy membership list while the new pharmacy request is pending', async () => {
  const ui = render(<MemoryRouter><SemiFranchisesPage /></MemoryRouter>); await screen.findByText('만성질환관리');
  state.organization = 'store-b'; state.list.mockReturnValue(new Promise(() => {})); ui.rerender(<MemoryRouter><SemiFranchisesPage /></MemoryRouter>);
  expect(screen.queryByText('만성질환관리')).toBeNull();
});

it('keeps pharmacy staff out of the owner service application action', async () => {
  state.role = 'staff'; render(<MemoryRouter><SemiFranchisesPage /></MemoryRouter>);
  await screen.findByText('만성질환관리');
  expect(screen.queryByRole('button', { name: '서비스에서 가입 · 상태 관리' })).toBeNull();
  expect(state.handoff).not.toHaveBeenCalled();
});
