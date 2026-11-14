import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { TabletKioskPage, type TabletKioskApi, type TabletScreenResponse } from '@o4o/tablet-kiosk-core';

vi.mock('@o4o/content-editor', () => ({
  ContentRenderer: ({ html }: { html: string }) => <div>{html}</div>,
  hasStoreDescriptionMarkup: () => false,
}));

afterEach(() => { cleanup(); vi.useRealTimers(); });

const sections = [
  { blockType: 'corner_description', sortOrder: 10, data: { title: '영상 코너', body: '짧은 안내' } },
  { blockType: 'product_list', sortOrder: 20, data: { selectionMode: 'selected', products: [
    { id: 'product-a', type: 'supplier', name: '제품 A', specification: '10개', description: '제품 A 설명',
      videos: [{ id: 'v1', title: '사용법', kind: 'youtube', url: 'https://www.youtube.com/watch?v=aaaaaaaaaaa' }] },
  ] } },
];
const tablet: TabletScreenResponse = { mode: 'screen_set', templateKey: 'product_focus', screenSet: { id: 'screen-a', name: '내부 이름' }, qrUrl: '/qr/corner-a', sections };
const api: TabletKioskApi = {
  fetchProducts: async () => ({ data: [], meta: { page: 1, limit: 50, total: 0, totalPages: 1 } }),
  submitInterest: async () => { throw new Error('not supported'); },
  checkStatus: async () => { throw new Error('not supported'); },
};

it('does not drop to the idle screen while a product video is playing, and resumes the idle timer once it is closed', async () => {
  vi.useFakeTimers();
  render(<TabletKioskPage slug="fixture" api={api} previewScreen={tablet} idleTimeoutMs={1000} />);
  await act(async () => undefined);
  fireEvent.click(screen.getByRole('button', { name: /제품 A.*자세히 보기/ }));
  fireEvent.click(screen.getByRole('button', { name: '▶ 영상 보기' }));
  act(() => vi.advanceTimersByTime(300_000));
  expect(screen.getByRole('button', { name: '■ 영상 닫기' })).toBeTruthy();
  expect(screen.queryByText(/화면을 터치/)).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '■ 영상 닫기' }));
  act(() => vi.advanceTimersByTime(121_000));
  expect(screen.getByText(/화면을 터치/)).toBeTruthy();
});

it('returns to the idle screen after the cap even if a product video is left open (paused or failed)', async () => {
  vi.useFakeTimers();
  render(<TabletKioskPage slug="fixture" api={api} previewScreen={tablet} idleTimeoutMs={1000} />);
  await act(async () => undefined);
  fireEvent.click(screen.getByRole('button', { name: /제품 A.*자세히 보기/ }));
  fireEvent.click(screen.getByRole('button', { name: '▶ 영상 보기' }));
  act(() => vi.advanceTimersByTime(14 * 60_000));
  expect(screen.queryByText(/화면을 터치/)).toBeNull();
  // 상한(15분)은 재생기 상태가 바뀐 시점부터 다시 센다 — 17분 안에는 대기화면으로 돌아간다.
  act(() => vi.advanceTimersByTime(3 * 60_000));
  expect(screen.getByText(/화면을 터치/)).toBeTruthy();
});
