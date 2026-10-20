import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, Outlet } from 'react-router-dom';
import { StoreHomePage } from '../../StoreHomePage';
import StoreAssetsPage from '../../StoreAssetsPage';
import { StoreWorkspacePage } from '../../StoreWorkspacePage';
import { StoreContentNextSteps } from '../../../../components/store/StoreContentNextSteps';

const api = vi.hoisted(() => ({ store: 'A', analytics: vi.fn(), scans: vi.fn(), assets: vi.fn(), products: vi.fn(), signals: vi.fn(), list: vi.fn(), update: vi.fn() }));
vi.mock('../../../../hooks/useStoreOrganizationId', () => ({ useStoreOrganizationId: () => ({ organizationId: api.store }) }));
vi.mock('../../../../contexts/StoreContext', () => ({ useUnifiedStore: () => ({ effectiveServiceKey: 'kpa-society', workServiceKeys: [] }) }));
vi.mock('../../../../lib/storeOrganizationHeader', () => ({ getActiveStoreOrganizationId: () => api.store }));
vi.mock('../../../../lib/serviceContext', () => ({ getActiveServiceKey: () => 'kpa-society', isUnifiedServiceKey: () => true }));
vi.mock('../../../../api/storeAnalytics', () => ({ getMarketingAnalytics: api.analytics, getRecentScans: api.scans }));
vi.mock('../../../../api/storeExecutionAssets', () => ({ getStoreExecutionAssets: api.assets }));
vi.mock('../../../../api/pharmacyProducts', () => ({ getListings: api.products }));
vi.mock('../../../../api/client', () => ({ apiClient: { get: api.signals } }));
vi.mock('../../../../api/assetSnapshot', () => ({ storeAssetControlApi: { list: api.list, updatePublishStatus: api.update } }));
vi.mock('../../../../components/guide', () => ({ GuideEditableSection: ({ defaultContent }: { defaultContent: string }) => <p>{defaultContent}</p> }));
vi.mock('../../../../components/store/StoreQrCreateModal', () => ({ StoreQrCreateModal: ({ open, target }: { open: boolean; target: { id: string } | null }) => open ? <p>QR fixture {target?.id}</p> : null }));
const item = (id = 'one', store = 'A') => ({ id, organizationId: store, title: `${store} Fixture ${id}`, assetType: 'cms', sourceService: 'kpa-society', sourceAssetId: 'source',
  createdAt: '2026-10-15T00:00:00Z', publishStatus: 'draft', channelMap: { home: true }, isForced: false, snapshotType: 'user_copy', lifecycleStatus: 'active' });
beforeEach(() => {
  vi.resetAllMocks(); api.store = 'A';
  api.analytics.mockResolvedValue({ success: true, data: { activeQrCount: 0, weeklyScans: 0, topQrCodes: [] } });
  api.scans.mockResolvedValue({ success: true, data: [] }); api.assets.mockResolvedValue({ success: true, data: { total: 0, items: [] } });
  api.products.mockResolvedValue({ success: true, data: [] }); api.signals.mockResolvedValue({ success: true, data: { newOrders: 0, pendingTabletRequests: 0, pendingSalesRequests: 0, surveyRequests: 0 } });
  api.list.mockImplementation(async () => ({ success: true, data: { items: [item('one', api.store)], total: 1 } }));
  api.update.mockImplementation(async (id: string, status: string) => ({ success: true, data: { snapshotId: id, publishStatus: status } }));
});
afterEach(cleanup);
it('home starts work before overview finishes and loads recent activity only when opened', async () => {
  let resolve!: (value: unknown) => void;
  api.analytics.mockReturnValueOnce(new Promise(r => { resolve = r; }));
  render(<MemoryRouter><StoreHomePage /></MemoryRouter>);
  expect(screen.getByRole('link', { name: '매장 컨텐츠' })).toBeTruthy();
  expect(api.scans).not.toHaveBeenCalled();
  expect(screen.getByText(/매장 현황을 불러오는 중/)).toBeTruthy();
  await act(async () => resolve({ success: true, data: { activeQrCount: 0, weeklyScans: 0, topQrCodes: [] } }));
  await screen.findByText('조회된 주문·상담·판매 요청 대기 항목이 없습니다.');
  fireEvent.click(screen.getByText('최근 QR 활동 보기'));
  await screen.findByText('최근 활동 기록이 없습니다');
  expect(api.scans).toHaveBeenCalledTimes(1);
});
it('home overview and optional activity failures have separate retries and never become zero results', async () => {
  api.analytics.mockRejectedValue(Error('synthetic')); api.scans.mockRejectedValue(Error('synthetic'));
  render(<MemoryRouter><StoreHomePage /></MemoryRouter>);
  await screen.findByRole('alert');
  expect(screen.queryByText('최근 활동 기록이 없습니다')).toBeNull();
  fireEvent.click(screen.getByText('최근 QR 활동 보기'));
  await screen.findByText(/최근 활동을 확인하지 못했습니다/);
  api.analytics.mockResolvedValue({ success: true, data: { activeQrCount: 0, weeklyScans: 0, topQrCodes: [] } });
  fireEvent.click(screen.getByRole('button', { name: '현황 다시 시도' }));
  await waitFor(() => expect(screen.queryByText(/확인하지 못한 현황/)).toBeNull());
  expect(screen.getByText(/최근 활동을 확인하지 못했습니다/)).toBeTruthy();
  api.scans.mockResolvedValue({ success: true, data: [] });
  fireEvent.click(screen.getByRole('button', { name: '최근 활동 다시 시도' }));
  await screen.findByText('최근 활동 기록이 없습니다'); expect(screen.queryByRole('alert')).toBeNull();
});
it('home shortcuts preserve the selected service path without displaying all tools', async () => {
  render(<MemoryRouter initialEntries={['/work/kpa-society/store']}><StoreHomePage /></MemoryRouter>);
  expect(screen.getByRole('link', { name: '매장 컨텐츠' }).getAttribute('href')).toBe('/work/kpa-society/store/workspace/studio');
  expect(screen.getByRole('link', { name: '운영 확인' }).getAttribute('href')).toBe('/work/kpa-society/store/workspace/use');
  expect(screen.queryByRole('link', { name: 'QR 배치·출력' })).toBeNull();
  await screen.findByText('조회된 주문·상담·판매 요청 대기 항목이 없습니다.');
});
it('publishing page reports load failure and recovers through the existing panel retry', async () => {
  api.list.mockRejectedValueOnce(Error('synthetic'));
  render(<MemoryRouter><StoreAssetsPage /></MemoryRouter>);
  await screen.findByRole('alert'); expect(screen.queryByText('복사된 자산이 없습니다.')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
  await screen.findByText('A Fixture one'); expect(screen.queryByRole('alert')).toBeNull();
});
it('a failed status update retains its row and exposes a retry instead of claiming playback', async () => {
  api.update.mockResolvedValueOnce({ success: false, data: { snapshotId: 'one', publishStatus: 'published' } });
  render(<MemoryRouter><StoreAssetsPage /></MemoryRouter>); const title = await screen.findByText('A Fixture one');
  fireEvent.click(within(title.closest('tr')!).getByRole('button', { name: '초안' }));
  await screen.findByRole('alert'); expect(within(title.closest('tr')!).getByRole('button', { name: '초안' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '실패한 1건 다시 시도' }));
  await waitFor(() => expect(within(title.closest('tr')!).getByRole('button', { name: '게시됨' })).toBeTruthy());
  expect(screen.getByRole('status').textContent).toContain('기기 적용·재생 여부는 활용 화면에서 확인');
});
it('store switch remounts publishing selection and rejects late old-store completion', async () => {
  let resolve!: (value: unknown) => void;
  api.update.mockReturnValueOnce(new Promise(done => { resolve = done; }));
  const { rerender } = render(<MemoryRouter><StoreAssetsPage /></MemoryRouter>);
  const old = await screen.findByText('A Fixture one'); fireEvent.click(within(old.closest('tr')!).getByRole('button', { name: '초안' }));
  api.store = 'B'; rerender(<MemoryRouter><StoreAssetsPage /></MemoryRouter>);
  const current = await screen.findByText('B Fixture one');
  await act(async () => { resolve({ success: true, data: { snapshotId: 'one', publishStatus: 'published' } }); });
  expect(within(current.closest('tr')!).getByRole('button', { name: '초안' })).toBeTruthy(); expect(screen.queryByText('A Fixture one')).toBeNull();
});
it('truncated publishing counts explicitly state the loaded scope', async () => {
  api.list.mockResolvedValue({ success: true, data: { items: [item()], total: 250 } });
  render(<MemoryRouter><StoreAssetsPage /></MemoryRouter>);
  await screen.findByText(/전체 250건 중/); expect(screen.getByText(/아래 필터와 현황은 조회한 자료 기준/)).toBeTruthy();
});
it('new content identity closes the old QR target while preserving scoped next-step links', () => {
  const { rerender } = render(<MemoryRouter initialEntries={['/work/kpa-society/store/content/direct/one']}><StoreContentNextSteps contentId="one" /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: '이 콘텐츠로 QR 만들기' })); expect(screen.getByText('QR fixture one')).toBeTruthy();
  rerender(<MemoryRouter initialEntries={['/work/kpa-society/store/content/direct/one']}><StoreContentNextSteps contentId="two" /></MemoryRouter>);
  expect(screen.queryByText('QR fixture one')).toBeNull(); expect(screen.queryByText('QR fixture two')).toBeNull();
  expect(screen.getByRole('link', { name: '자료 선택·제작' }).getAttribute('href')).toBe('/work/kpa-society/store/library/contents');
});
it('store switch closes the old QR target and missing direct identity exposes no creation button', () => {
  const { rerender } = render(<MemoryRouter><StoreContentNextSteps contentId="one" /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: '이 콘텐츠로 QR 만들기' })); api.store = 'B';
  rerender(<MemoryRouter><StoreContentNextSteps contentId="one" /></MemoryRouter>);
  expect(screen.queryByText('QR fixture one')).toBeNull();
  rerender(<MemoryRouter><StoreContentNextSteps /></MemoryRouter>);
  expect(screen.queryByRole('button', { name: '이 콘텐츠로 QR 만들기' })).toBeNull();
});
it('use landing keeps only permitted targets when execution capability is absent', async () => {
  const config = { basePath: '/work/kpa-society/store', menuSections: [{ items: [{ key: 'library-contents', label: '자료함', subPath: '/library/contents' }, { key: 'qr', label: 'QR', subPath: '/marketing/qr' }] }] };
  render(<MemoryRouter initialEntries={['/work/kpa-society/store/workspace/use']}><Routes><Route element={<Outlet context={{ config }} />}><Route path="/work/kpa-society/store/workspace/use" element={<StoreWorkspacePage area="use" />} /></Route></Routes></MemoryRouter>);
  await screen.findByRole('heading', { name: 'QR' });
  fireEvent.click(screen.getByText('배치·이용 현황 확인'));
  expect(screen.queryByRole('link', { name: '위치별 저장 설정' })).toBeNull();
  expect(screen.getByRole('link', { name: /게시·활용 상태/ }).getAttribute('href')).toBe('/work/kpa-society/store/content');
  expect(screen.getByRole('link', { name: /QR 배치·출력/ }).getAttribute('href')).toContain('workspace=use');
  expect(screen.queryByRole('navigation', { name: '상담 참고 자료' })).toBeNull();
});
