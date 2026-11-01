import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({
  get: vi.fn(), list: vi.fn(), handoff: vi.fn(), organizationId: 'store-a' as string | null,
  account: 'owner' as string | null, role: 'owner', service: 'kpa-society',
}));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: state.account ? { id: state.account } : null, isAuthenticated: !!state.account }) }));
vi.mock('../../../contexts/StoreContext', () => ({ useUnifiedStore: () => ({
  organizationId: state.organizationId, organizationName: '선택 약국', effectiveServiceKey: state.service,
  stores: [{ organizationId: state.organizationId, memberRole: state.role }],
}) }));
vi.mock('../../../api/neturePharmacy', () => ({ neturePharmacyApi: { getStoreContext: state.get, listContents: state.list } }));
vi.mock('../../../lib/apiClient', () => ({ api: {} }));
vi.mock('@o4o/auth-react', () => ({ requestServiceHandoff: state.handoff }));
import CarePharmToolsPage from '../CarePharmToolsPage';
const approved = (organizationId = 'store-a') => ({ organizationId, semiFranchiseKeys: ['carepharm'] });
const material = { id: 'material-a', title: '매장 안내 자료', summary: '자료 요약', semiFranchiseKey: 'carepharm', publishedAt: '2026-10-20T00:00:00Z' };
const tree = () => <MemoryRouter initialEntries={['/store/pharmacy/carepharm']}><CarePharmToolsPage /></MemoryRouter>;
beforeEach(() => {
  vi.resetAllMocks(); state.organizationId = 'store-a'; state.account = 'owner'; state.role = 'owner'; state.service = 'kpa-society';
  state.get.mockResolvedValue(approved()); state.list.mockResolvedValue({ items: [material], total: 1 });
  state.handoff.mockRejectedValue(new Error('Synthetic handoff failure'));
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

it.each([{ keys: [] }, { keys: ['pharmacy'] }, { keys: ['drugstore'] }])('requires this pharmacy CarePharm approval: $keys', async ({ keys }) => {
  state.get.mockResolvedValue({ organizationId: 'store-a', semiFranchiseKeys: keys });
  render(tree()); await screen.findByText(/가입 승인 후/);
  expect(screen.queryByRole('link', { name: '공급제품 보기' })).toBeNull();
  expect(state.list).not.toHaveBeenCalled();
});
it('connects actual supply, material, production and order routes without unplanned services', async () => {
  render(tree()); await screen.findByText(material.title);
  expect(screen.getByRole('link', { name: '공급제품 보기' }).getAttribute('href')).toBe('/store/pharmacy/supply?source=sf%3Acarepharm');
  expect(screen.getByRole('link', { name: '회원자료 가져오기' }).getAttribute('href')).toBe('/store/pharmacy/contents?business=carepharm');
  expect(screen.getByRole('link', { name: material.title }).getAttribute('href')).toBe('/store/pharmacy/contents?business=carepharm&content=material-a');
  expect(state.list).toHaveBeenCalledWith({ sf: 'carepharm', page: 1, limit: 3 });
  for (const [name, href] of [['POP 만들기', '/store/marketing/pop-v2'], ['정보 QR 관리', '/store/marketing/qr'], ['내 자료함 · 편집', '/store/library/contents']]) {
    expect(screen.getByRole('link', { name }).getAttribute('href')).toBe(href);
  }
  expect(screen.queryByRole('link', { name: '블로그 만들기' })).toBeNull();
  expect(screen.queryByText(/CGM|무료혈당기|Study|상담/)).toBeNull();
});
it('discards an old pharmacy late response during a store switch', async () => {
  let release!: (value: unknown) => void;
  state.list.mockReturnValueOnce(new Promise(resolve => { release = resolve; }));
  const ui = render(tree()); await waitFor(() => expect(state.list).toHaveBeenCalledTimes(1));
  state.organizationId = 'store-b'; state.get.mockResolvedValue({ organizationId: 'store-b', semiFranchiseKeys: ['pharmacy'] });
  ui.rerender(tree()); expect(screen.queryByRole('link', { name: '공급제품 보기' })).toBeNull();
  await screen.findByText(/가입 승인 후/);
  await act(async () => release({ items: [material], total: 1 }));
  expect(screen.queryByText(material.title)).toBeNull();
});
it.each(['account', 'service'])('invalidates pending resources after %s changes', async change => {
  let release!: (value: unknown) => void;
  state.list.mockReturnValueOnce(new Promise(resolve => { release = resolve; }));
  const ui = render(tree()); await waitFor(() => expect(state.list).toHaveBeenCalledTimes(1));
  state.list.mockResolvedValue({ items: [], total: 0 });
  if (change === 'account') state.account = 'another-account'; else state.service = 'neture';
  ui.rerender(tree()); await screen.findByText('아직 게시된 회원자료가 없습니다.');
  await act(async () => release({ items: [material], total: 1 }));
  expect(screen.queryByText(material.title)).toBeNull();
});
it('fails closed on a context mismatch and can retry without joining anything', async () => {
  state.get.mockResolvedValueOnce(approved('foreign-store'));
  render(tree()); await screen.findByRole('alert');
  expect(state.list).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: '다시 확인' }));
  await screen.findByText(material.title);
});
it('rejects other business material responses and distinguishes retry from empty', async () => {
  state.list.mockResolvedValueOnce({ items: [{ ...material, semiFranchiseKey: 'pharmacy' }], total: 1 }).mockResolvedValue({ items: [], total: 0 });
  render(tree()); await screen.findByRole('alert'); expect(screen.queryByText(material.title)).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '회원자료 다시 불러오기' }));
  await screen.findByText('아직 게시된 회원자료가 없습니다.');
});
it('keeps supply and production actions available when only materials fail', async () => {
  state.list.mockRejectedValue(new Error('Synthetic'));
  render(tree()); await screen.findByText('회원자료를 불러오지 못했습니다.');
  expect(screen.getByRole('link', { name: '공급제품 보기' })).toBeTruthy();
  expect(screen.getByRole('link', { name: 'POP 만들기' })).toBeTruthy();
});
it('refreshes approval and removes resources on returning after suspension', async () => {
  render(tree()); await screen.findByText(material.title);
  state.get.mockResolvedValue({ organizationId: 'store-a', semiFranchiseKeys: [] });
  fireEvent(document, new Event('visibilitychange'));
  await screen.findByText(/가입 승인 후/); expect(screen.queryByText(material.title)).toBeNull();
});
it('rechecks approval at the periodic refresh', async () => {
  vi.useFakeTimers();
  render(tree()); await act(async () => { await Promise.resolve(); await Promise.resolve(); });
  expect(screen.getByText(material.title)).toBeTruthy();
  state.get.mockResolvedValue({ organizationId: 'store-a', semiFranchiseKeys: [] });
  await act(async () => { vi.advanceTimersByTime(60_000); });
  expect(screen.getByText(/가입 승인 후/)).toBeTruthy();
});
it('uses the existing CarePharm handoff and selected organization, prevents double click, and retries errors', async () => {
  let reject!: (error: unknown) => void;
  state.handoff.mockReturnValueOnce(new Promise((_resolve, fail) => { reject = fail; }));
  render(tree()); await screen.findByText(material.title);
  fireEvent.click(screen.getByRole('button', { name: '회원 커뮤니티 · 문의' }));
  await waitFor(() => expect(state.handoff).toHaveBeenCalledTimes(1));
  expect(state.handoff).toHaveBeenCalledWith({}, {
    serviceKey: 'carepharm', origin: 'https://carepharm.neture.co.kr',
    returnPath: '/communities/business%3Acarepharm/forum?store=store-a',
  });
  fireEvent.click(screen.getByRole('button', { name: '이동 중…' })); expect(state.handoff).toHaveBeenCalledTimes(1);
  await act(async () => reject(new Error('Synthetic'))); await screen.findByRole('alert');
  expect(screen.getByRole('button', { name: '회원 커뮤니티 · 문의' }).hasAttribute('disabled')).toBe(false);
});
it('does not issue a community handoff after approval removal', async () => {
  render(tree()); await screen.findByText(material.title);
  state.get.mockResolvedValue({ organizationId: 'store-a', semiFranchiseKeys: [] });
  fireEvent.click(screen.getByRole('button', { name: '회원 커뮤니티 · 문의' }));
  await screen.findByText(/가입 승인 후/); expect(state.handoff).not.toHaveBeenCalled();
});
it('discards late community errors after a pharmacy switch', async () => {
  let reject!: (error: unknown) => void;
  state.handoff.mockReturnValueOnce(new Promise((_resolve, fail) => { reject = fail; }));
  const ui = render(tree()); await screen.findByText(material.title);
  fireEvent.click(screen.getByRole('button', { name: '회원 커뮤니티 · 문의' })); await waitFor(() => expect(state.handoff).toHaveBeenCalled());
  state.organizationId = 'store-b'; state.get.mockResolvedValue({ organizationId: 'store-b', semiFranchiseKeys: [] });
  ui.rerender(tree()); await screen.findByText(/가입 승인 후/);
  await act(async () => reject(new Error('Synthetic'))); expect(screen.queryByRole('alert')).toBeNull();
});
it('retains staff store work without a manager-only community entry', async () => {
  state.role = 'staff'; render(tree()); await screen.findByText(material.title);
  expect(screen.queryByRole('button', { name: '회원 커뮤니티 · 문의' })).toBeNull();
  expect(screen.getByRole('link', { name: '회원자료 가져오기' })).toBeTruthy();
});
it.each(['signed-out', 'no-store'])('does not read protected data with %s', async scenario => {
  if (scenario === 'signed-out') state.account = null; else state.organizationId = null;
  render(tree()); expect(screen.getByText(scenario === 'signed-out' ? '로그인 후 이용해 주세요.' : '약국을 먼저 선택해 주세요.')).toBeTruthy();
  expect(state.get).not.toHaveBeenCalled(); expect(state.list).not.toHaveBeenCalled();
});
