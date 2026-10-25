import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { initialHomePresentation } from '@o4o/types';
const state = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('../../../lib/apiClient', () => ({ api: { get: state.get } }));
import CarePharmNewsPage, { CarePharmNotices } from '../CarePharmNotices';
const document = () => {
  const config = initialHomePresentation('carepharm');
  config.promotions[0] = { ...config.promotions[0], id: 'first', title: '공개 공지', description: '공개 본문\n두 번째 줄', linkUrl: 'https://study.neture.co.kr/', linkText: '개설 강의 안내' };
  config.promotions.push({ ...config.promotions[0], id: 'second', title: '공급 안내', linkUrl: '', linkText: '', kind: 'advertisement', sponsor: '공급사' });
  return config;
};
const response = (data: unknown) => ({ data: { success: true, data } });
const mount = (path = '/') => render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/" element={<CarePharmNotices />} /><Route path="/news/:noticeId" element={<CarePharmNewsPage />} /></Routes></MemoryRouter>);
beforeEach(() => { state.get.mockReset(); state.get.mockResolvedValue(response(document())); });
afterEach(() => { cleanup(); vi.useRealTimers(); });
it('lists all published announcements, preserves advertising labels and opens detail', async () => {
  mount(); await screen.findByText('공개 공지');
  expect(screen.getByText('공급 안내')).toBeTruthy(); expect(screen.getByText('광고 · 공급사')).toBeTruthy();
  fireEvent.click(screen.getByRole('link', { name: /공지·안내 공개 공지/ }));
  expect(await screen.findByRole('heading', { level: 1, name: '공개 공지' })).toBeTruthy();
  expect(screen.getByRole('link', { name: '개설 강의 안내' }).getAttribute('href')).toBe('https://study.neture.co.kr/');
  expect(state.get.mock.calls.every(([path]) => path === '/home-presentation/carepharm')).toBe(true);
});
it('shows a real empty state rather than the initial editor examples', async () => {
  state.get.mockResolvedValue(response(null)); mount(); await screen.findByText('아직 게시된 공지가 없습니다.');
  expect(screen.queryByText('CarePharm 이용 안내')).toBeNull();
});
it('separates transport errors from empty results and retries without writes', async () => {
  state.get.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(response(null));
  mount(); await screen.findByRole('alert');
  expect(screen.queryByText('아직 게시된 공지가 없습니다.')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '공지 다시 불러오기' }));
  await screen.findByText('아직 게시된 공지가 없습니다.'); expect(state.get).toHaveBeenCalledTimes(2);
});
it('rejects invalid data and unsafe links before rendering content', async () => {
  const config = document(); config.promotions[0].linkUrl = 'javascript:alert(1)';
  state.get.mockResolvedValue(response(config)); mount('/news/first'); await screen.findByRole('alert');
  expect(screen.queryByRole('heading', { name: '공개 공지' })).toBeNull();
});
it.each(['future', 'expired', 'disabled', 'hidden', 'unknown'])('does not expose a %s notice via direct detail', async status => {
  const config = document();
  if (status === 'future') config.promotions[0].startsAt = new Date(Date.now() + 60_000).toISOString();
  if (status === 'expired') config.promotions[0].endsAt = new Date(Date.now() - 1000).toISOString();
  if (status === 'disabled') config.promotions[0].enabled = false;
  if (status === 'hidden') config.enabled = false;
  state.get.mockResolvedValue(response(config)); mount(status === 'unknown' ? '/news/missing' : '/news/first');
  await screen.findByText(/게시 중인 공지를 찾을 수 없습니다/);
  expect(screen.queryByRole('heading', { name: '공개 공지' })).toBeNull();
});
it('removes a withdrawn notice after a visibility refresh, including on detail', async () => {
  mount('/news/first'); await screen.findByRole('heading', { name: '공개 공지' });
  state.get.mockResolvedValue(response(null));
  await act(async () => { window.document.dispatchEvent(new Event('visibilitychange')); });
  await screen.findByText(/게시 중인 공지를 찾을 수 없습니다/);
  expect(screen.queryByText('공개 본문')).toBeNull();
});
it('clears stale public content if the refresh fails', async () => {
  mount(); await screen.findByText('공개 공지'); state.get.mockRejectedValue(new Error('offline'));
  await act(async () => { window.document.dispatchEvent(new Event('visibilitychange')); });
  await screen.findByRole('alert'); expect(screen.queryByText('공개 공지')).toBeNull();
});
it('expires an open detail without navigation when the publishing period ends', async () => {
  vi.useFakeTimers();
  const config = document(); config.promotions[0].endsAt = new Date(Date.now() + 1000).toISOString();
  state.get.mockResolvedValue(response(config));
  await act(async () => { mount('/news/first'); });
  expect(screen.getByRole('heading', { name: '공개 공지' })).toBeTruthy();
  await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
  expect(screen.getByText(/게시 중인 공지를 찾을 수 없습니다/)).toBeTruthy();
});
it('ignores a late response after leaving the page', async () => {
  let finish!: (value: unknown) => void;
  state.get.mockReturnValue(new Promise(resolve => { finish = resolve; }));
  const ui = mount(); await waitFor(() => expect(finish).toBeTypeOf('function')); ui.unmount();
  await act(async () => finish(response(document())));
  expect(screen.queryByText('공개 공지')).toBeNull();
});
