import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppGuard } from '../components/common/AppGuard';
import PointSpendPage from '../pages/operator/PointSpendPage';
import PointBudgetPage from '../pages/operator/PointBudgetPage';

const mocks = vi.hoisted(() => ({
  get: vi.fn(), post: vi.fn(),
  status: { isLoading: false, isUnavailable: false, installed: true, active: true },
}));
vi.mock('@o4o/auth-client', () => ({ authClient: { api: { get: mocks.get, post: mocks.post } } }));
vi.mock('@/hooks/useAppStatus', () => ({ useAppStatus: () => ({
  ...mocks.status, isInstalled: () => mocks.status.installed, isActive: () => mocks.status.active,
}) }));
vi.mock('react-hot-toast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(mocks.status, { isLoading: false, isUnavailable: false, installed: true, active: true });
  mocks.get.mockResolvedValue({ data: { data: { budgets: [], transactions: [], pagination: { page: 1, total: 0, totalPages: 0 } } } });
  mocks.post.mockResolvedValue({ data: { data: { granted: 100, transactionId: 'synthetic-transaction', deduped: false, balance: 900 } } });
});

describe('retired AppStore links preserve app availability guards', () => {
  it.each(['installed', 'active', 'isUnavailable'] as const)('blocks child effects when %s prevents access', (condition) => {
    if (condition === 'isUnavailable') mocks.status.isUnavailable = true;
    else mocks.status[condition] = false;
    const childEffect = vi.fn();
    function Child() { childEffect(); return <div>protected content</div>; }
    render(<MemoryRouter><AppGuard appId="synthetic-app" appName="테스트 기능" requireActive><Child /></AppGuard></MemoryRouter>);
    expect(childEffect).not.toHaveBeenCalled();
    expect(screen.queryByText('protected content')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /설치|활성화/ })).not.toBeInTheDocument();
    if (condition !== 'isUnavailable') expect(screen.getByRole('link', { name: '관리자 홈으로 이동' })).toHaveAttribute('href', '/admin');
  });
  it('still renders available features', () => {
    render(<MemoryRouter><AppGuard appId="synthetic-app" appName="테스트 기능" requireActive><div>protected content</div></AppGuard></MemoryRouter>);
    expect(screen.getByText('protected content')).toBeInTheDocument();
  });
});

function renderPoints() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(<QueryClientProvider client={client}><MemoryRouter initialEntries={['/operator/points']}><Routes>
    <Route path="/operator/points" element={<PointSpendPage />} />
    <Route path="/operator/points/budget" element={<PointBudgetPage />} />
  </Routes></MemoryRouter></QueryClientProvider>);
}
const userId = '00000000-0000-4000-8000-000000000001';
function fill(id: string, value: string) { fireEvent.change(document.getElementById(id)!, { target: { value } }); }

describe('point operations retain existing transaction behavior', () => {
  it('navigates to budget and back without a write', async () => {
    renderPoints();
    fireEvent.click(screen.getByRole('link', { name: '서비스 예산' }));
    await screen.findByRole('heading', { name: '서비스 포인트 예산' });
    await waitFor(() => expect(mocks.get).toHaveBeenCalledWith('/points/budget'));
    fireEvent.click(screen.getByRole('link', { name: '지급·차감·거래 조회' }));
    expect(screen.getByRole('heading', { name: '포인트 운영' })).toBeInTheDocument();
    expect(mocks.post).not.toHaveBeenCalled();
  });
  it('requires confirmation for spend and preserves the grant and spend payloads', async () => {
    renderPoints();
    fill('grantUserId', userId); fill('grantAmount', '100'); fill('grantDescription', '합성 지급 검증');
    fireEvent.click(screen.getByRole('button', { name: '지급 실행' }));
    await waitFor(() => expect(mocks.post).toHaveBeenCalledWith('/points/admin/grant', { userId, amount: 100, description: '합성 지급 검증' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '지급 실행' })).toBeDisabled());
    mocks.post.mockClear();
    fill('userId', userId); fill('amount', '25'); fill('payoutType', 'reward_payout_offline'); fill('description', '합성 차감 검증');
    const spendSection = document.getElementById('point-spend')!;
    fireEvent.submit(spendSection.querySelector('form')!);
    const dialog = screen.getByRole('dialog');
    expect(mocks.post).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: '취소' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(mocks.post).not.toHaveBeenCalled();
    fireEvent.submit(spendSection.querySelector('form')!);
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: '차감 실행' }));
    await waitFor(() => expect(mocks.post).toHaveBeenCalledWith('/points/admin/spend', { userId, amount: 25, payoutType: 'reward_payout_offline', description: '합성 차감 검증' }));
    expect(mocks.post).toHaveBeenCalledTimes(1);
  });
});
