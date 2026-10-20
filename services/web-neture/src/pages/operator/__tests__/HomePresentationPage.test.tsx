import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { initialHomePresentation } from '@o4o/types';
const state = vi.hoisted(() => ({ user: 'operator-a', get: vi.fn(), put: vi.fn() }));
vi.mock('../../../contexts', () => ({ useAuth: () => ({ user: { id: state.user } }) }));
vi.mock('../../../lib/apiClient', () => ({ api: { get: state.get, put: state.put } }));
import HomePresentationPage from '../HomePresentationPage';
const response = (title: string) => {
  const draft = initialHomePresentation('carepharm'); draft.slides[0].title = title;
  return { data: { success: true, data: { revision: 1, draft, published: null } } };
};
beforeEach(() => { state.user = 'operator-a'; state.get.mockReset(); state.put.mockReset(); });
afterEach(cleanup);
it('keeps the representative home editor in its own scope and links to the business-owned editor', async () => {
  state.get.mockResolvedValue(response('대표 홈'));
  render(<HomePresentationPage surface="neture" />); await screen.findAllByLabelText('제목');
  expect(state.get).toHaveBeenCalledExactlyOnceWith('/home-presentation/neture/manage');
  expect(screen.getByRole('link', { name: 'CarePharm 홈·공지 관리' }).getAttribute('href')).toBe('https://carepharm.neture.co.kr/operator/home-presentation/carepharm');
});
it('removes an old account draft immediately and ignores its late response', async () => {
  let finish!: (value: unknown) => void;
  state.get.mockResolvedValueOnce(response('이전 운영자 초안')).mockReturnValueOnce(new Promise(resolve => { finish = resolve; })).mockRejectedValue(new Error('denied'));
  const ui = render(<HomePresentationPage surface="carepharm" />); await screen.findByDisplayValue('이전 운영자 초안');
  state.user = 'operator-b'; ui.rerender(<HomePresentationPage surface="carepharm" />);
  expect(screen.queryByDisplayValue('이전 운영자 초안')).toBeNull();
  state.user = 'operator-c'; ui.rerender(<HomePresentationPage surface="carepharm" />);
  await screen.findByRole('alert');
  await act(async () => finish(response('늦게 도착한 비공개 초안')));
  expect(screen.queryByDisplayValue('늦게 도착한 비공개 초안')).toBeNull(); expect(state.put).not.toHaveBeenCalled();
});
