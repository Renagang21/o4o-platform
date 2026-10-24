import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { CooperationOperationsOverview } from './CooperationOperationsOverview';

afterEach(() => { cleanup(); vi.useRealTimers(); });
const summary = (name = '가상 사업') => ({ name, contact: { pending: 2, oldest: '2026-10-20', deliveryAttention: 1 }, tasks: [
  { key: 'contents', label: '자료 검토', count: 0, oldest: null, available: true },
  { key: 'members', label: '가입 검토', count: null, oldest: null, available: false },
  { key: 'future-task', label: '추가 업무', count: 3, oldest: '2026-10-21', available: true },
] });
const envelope = (data: unknown) => ({ data: { data } });
const client = () => ({ get: vi.fn().mockResolvedValue(envelope(summary())), patch: vi.fn() });
function view(api: ReturnType<typeof client>, scopeKey = 'account:business', endpoint = '/operator-inbox/business/pharmacy') {
  return <CooperationOperationsOverview client={api} endpoint={endpoint} scopeKey={scopeKey}
    inboxHref="/operator/inbox/business/pharmacy" taskHref={key => key === 'contents' ? '/operator/semi-franchises?key=pharmacy&tab=contents' : undefined}
    areas={[{ title: '공지', description: '회원 안내 관리', links: [{ label: '공지 관리', href: '/community' }] }]} />;
}
it('distinguishes an available zero from unavailable work and keeps unknown tasks visible without trusting remote links', async () => {
  const api = client(); render(view(api));
  await screen.findByText('자료 검토 0건');
  expect(screen.getByText(/가입 검토 조회 불가/)).toBeTruthy();
  expect(screen.getByText(/추가 업무 3건/)).toBeTruthy();
  expect(screen.getByRole('link', { name: '자료 검토 0건' }).getAttribute('href')).toContain('key=pharmacy&tab=contents');
  expect(screen.getByRole('link', { name: '미처리 문의 2건' }).getAttribute('href')).toBe('/operator/inbox/business/pharmacy');
  expect(api.get.mock.calls).toEqual([['/operator-inbox/business/pharmacy/manage']]);
  expect(api.patch).not.toHaveBeenCalled();
});
it('reports initial failure without claiming zero and supports recovery', async () => {
  const api = client(); api.get.mockRejectedValueOnce(new Error('denied'));
  render(view(api)); await screen.findByRole('alert');
  expect(screen.queryByText('미처리 문의 0건')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '대기 건 새로고침' }));
  await screen.findByText('자료 검토 0건'); expect(screen.queryByRole('alert')).toBeNull();
});
it.each(['account:other-business', 'other-account:business'])('clears old results and ignores late responses when scope becomes %s', async scope => {
  const api = client();
  const page = render(view(api)); await screen.findByText('자료 검토 0건');
  let resolve!: (value: ReturnType<typeof envelope>) => void;
  api.get.mockReturnValueOnce(new Promise(r => { resolve = r; }));
  fireEvent.click(screen.getByRole('button', { name: '대기 건 새로고침' }));
  await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
  api.get.mockResolvedValue(envelope(summary('새 사업')));
  page.rerender(view(api, scope));
  expect(screen.queryByText('자료 검토 0건')).toBeNull();
  await screen.findByText('처리할 상황 · 새 사업');
  await act(async () => resolve(envelope(summary('이전 사업'))));
  expect(screen.queryByText('처리할 상황 · 이전 사업')).toBeNull();
});
it('does not overlap minute refreshes and labels the previous result after a refresh failure', async () => {
  const api = client(); render(view(api)); await screen.findByText('자료 검토 0건');
  vi.useFakeTimers();
  let reject!: (error: Error) => void;
  api.get.mockReturnValueOnce(new Promise((_resolve, r) => { reject = r; }));
  fireEvent.click(screen.getByRole('button', { name: '대기 건 새로고침' }));
  await act(async () => { vi.advanceTimersByTime(180_000); });
  expect(api.get).toHaveBeenCalledTimes(2);
  await act(async () => reject(new Error('refresh failed')));
  expect(screen.getByRole('alert').textContent).toContain('이전 조회 결과');
});
