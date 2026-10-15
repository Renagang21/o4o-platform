import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
const { get, handoff } = vi.hoisted(() => ({ get: vi.fn(), handoff: vi.fn() }));
vi.mock('../../lib/apiClient', () => ({ api: { get } }));
vi.mock('@o4o/auth-react', () => ({ requestServiceHandoff: handoff }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ logout: vi.fn() }) }));
import { MyHomeStoreBusinesses } from './MyHomePanels';
const row = (key: string, status = 'active') => ({ key, name: `사업 ${key}`, communityKey: `business:${key}`, membershipStatus: status });
const post = (id: string, pinned: boolean) => ({ id, slug: id, title: `소식 ${id}`, createdAt: '2026-10-15T00:00:00Z', isPinned: pinned });
const response = (data: unknown) => ({ data: { success: true, data } });
const tree = (account = 'member', store = 'store-a', canEnterCommunity = true) => <MemoryRouter><MyHomeStoreBusinesses accountId={account} organizationId={store} canEnterCommunity={canEnterCommunity} /></MemoryRouter>;
beforeEach(() => { get.mockReset(); handoff.mockReset(); handoff.mockImplementation(() => new Promise(() => {}));
  get.mockImplementation(async (path: string, config: { params?: { isPinned: string } }) => path.endsWith('/semi-franchises') ? response([row('pharmacy'), row('pending', 'pending')]) : response([post(config.params?.isPinned === 'true' ? 'pin' : 'recent', config.params?.isPinned === 'true')]));
});
afterEach(cleanup);
it('shows pinned and recent separately only for active businesses and uses scoped post handoff', async () => {
  render(tree());
  expect(await screen.findByText('소식 recent')).toBeTruthy();
  expect(screen.getByText('소식 pin')).toBeTruthy();
  expect(get.mock.calls.filter(([path]) => path.includes('/forum/')).length).toBe(2);
  expect(get).toHaveBeenCalledWith('/communities/business%3Apharmacy/forum/posts', { params: { page: 1, limit: 2, sortBy: 'latest', isPinned: 'false' } });
  fireEvent.click(within(screen.getByText('소식 recent').closest('li')!).getByRole('button', { name: '게시글 보기' }));
  expect(handoff).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ serviceKey: 'kpa-society', returnPath: '/community/post/recent?store=store-a' }));
});
it('staff does not request community data', async () => {
  render(tree('staff', 'store-a', false));
  await screen.findByText('사업 pharmacy');
  expect(get.mock.calls.some(([path]) => path.includes('/forum/'))).toBe(false);
  expect(screen.queryByText('사업 소식')).toBeNull();
});
it('keeps other businesses and retries a failed business without calling their feeds again', async () => {
  let fail = true;
  get.mockImplementation(async (path: string, config: { params?: { isPinned: string } }) => {
    if (path.endsWith('/semi-franchises')) return response([row('pharmacy'), row('network')]);
    if (path.includes('business%3Apharmacy') && fail) throw new Error('Offline');
    return response(config.params?.isPinned === 'true' ? [] : [post(path.includes('network') ? 'network' : 'pharmacy', false)]);
  });
  render(tree());
  await screen.findByText('소식 network');
  const count = get.mock.calls.filter(([path]) => path.includes('business%3Anetwork')).length;
  fail = false; fireEvent.click(await screen.findByRole('button', { name: '다시 불러오기' }));
  await screen.findByText('소식 pharmacy');
  expect(get.mock.calls.filter(([path]) => path.includes('business%3Anetwork')).length).toBe(count);
});
it('drops late feed replies after the account and pharmacy change', async () => {
  const resolves: ((value: unknown) => void)[] = [];
  get.mockImplementation(async (path: string) => path.endsWith('/semi-franchises') ? response([row('pharmacy')]) : new Promise(r => { resolves.push(r); }));
  const view = render(tree());
  await waitFor(() => expect(get.mock.calls.filter(([path]) => path.includes('/forum/')).length).toBe(2));
  get.mockImplementation(async (path: string) => path.endsWith('/semi-franchises') ? response([]) : response([]));
  view.rerender(tree('second', 'store-b'));
  await screen.findByText('운영 중인 약국 협력사업에 표시할 참여 기록이 없습니다.');
  await act(async () => { resolves.forEach((resolve, i) => resolve(response([post('old', i === 0)]))); });
  expect(screen.queryByText('소식 old')).toBeNull();
});
