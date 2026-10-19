import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { initialHomePresentation } from '@o4o/types';
const mocks = vi.hoisted(() => ({ get: vi.fn(), user: { id: 'member-a' } }));
vi.mock('../../../contexts/AuthContext', () => ({ authClient: { api: { get: mocks.get } }, useAuth: () => ({ user: mocks.user }) }));
import BusinessHomeFeature from '../BusinessHomeFeature';
const publication = (title = '본부의 실제 캠페인') => {
  const base = initialHomePresentation('pharmacy');
  return { ...base, slides: [{ ...base.slides[0], title, linkText: '내용 확인', linkUrl: '/materials' }], promotions: [] };
};
const response = (data: unknown) => ({ data: { success: true, data } });
beforeEach(() => { mocks.get.mockReset(); mocks.user = { id: 'member-a' }; });
afterEach(cleanup);
it('게시 전에는 일반 소개 슬라이드나 가짜 캠페인을 만들지 않는다', async () => {
  mocks.get.mockResolvedValue(response(null));
  const view = render(<BusinessHomeFeature businessKey="pharmacy" />);
  await waitFor(() => expect(view.container.textContent).toBe(''));
  expect(mocks.get).toHaveBeenCalledWith('/home-presentation/pharmacy/business/pharmacy');
});
it('기존 게시 원장의 실제 전시와 상세 연결을 h2로 표시한다', async () => {
  mocks.get.mockResolvedValue(response(publication()));
  render(<BusinessHomeFeature businessKey="pharmacy" />);
  expect(await screen.findByRole('heading', { level: 2, name: '본부의 실제 캠페인' })).toBeTruthy();
  expect(screen.getByRole('link', { name: /내용 확인/ }).getAttribute('href')).toBe('/materials');
  expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
});
it('전시 오류를 빈 상태와 구분하고 재시도한다', async () => {
  mocks.get.mockRejectedValueOnce(new Error('Offline')).mockResolvedValue(response(publication()));
  render(<BusinessHomeFeature businessKey="pharmacy" />);
  await screen.findByRole('alert');
  fireEvent.click(screen.getByRole('button', { name: '전시 소식 다시 확인' }));
  expect(await screen.findByText('본부의 실제 캠페인')).toBeTruthy();
  expect(screen.queryByRole('alert')).toBeNull();
});
it.each(['pharmacy', 'megapharm'])('계정 전환 및 사업 %s 이동 시 이전 전시와 늦은 응답을 버린다', async nextBusiness => {
  let resolve!: (value: unknown) => void;
  mocks.get.mockImplementationOnce(() => new Promise(r => { resolve = r; }));
  const view = render(<BusinessHomeFeature businessKey="pharmacy" />);
  await waitFor(() => expect(mocks.get).toHaveBeenCalledTimes(1));
  mocks.user = { id: 'member-b' };
  mocks.get.mockResolvedValue(response(publication('다른 사업의 전시')));
  view.rerender(<BusinessHomeFeature businessKey={nextBusiness} />);
  await screen.findByText('다른 사업의 전시');
  await act(async () => { resolve(response(publication())); });
  expect(screen.queryByText('본부의 실제 캠페인')).toBeNull();
  expect(mocks.get).toHaveBeenLastCalledWith(`/home-presentation/pharmacy/business/${nextBusiness}`);
});
it.each([{ enabled: false }, { startsAt: '2099-01-01T00:00:00Z' }, { endsAt: '2000-01-01T00:00:00Z' }])('비활성·예약·종료 전시는 노출하지 않는다 (%j)', async schedule => {
  const config = publication();
  config.slides[0] = { ...config.slides[0], ...schedule };
  mocks.get.mockResolvedValue(response(config));
  const view = render(<BusinessHomeFeature businessKey="pharmacy" />);
  await waitFor(() => expect(view.container.textContent).toBe(''));
  expect(screen.queryByText('본부의 실제 캠페인')).toBeNull();
});
it('슬라이드 없이 게시한 광고도 기존 광고·광고주 표기를 유지한다', async () => {
  const config = publication();
  const promotion = { ...config.slides[0], id: 'advertisement', title: '게시된 협력 광고', kind: 'advertisement' as const, sponsor: '검증 협력사' };
  mocks.get.mockResolvedValue(response({ ...config, slides: [], promotions: [promotion] }));
  render(<BusinessHomeFeature businessKey="pharmacy" />);
  expect(await screen.findByRole('heading', { name: '게시된 협력 광고' })).toBeTruthy();
  expect(screen.getByText('광고 · 검증 협력사')).toBeTruthy();
  expect(screen.queryByRole('heading', { name: '본부 소식' })).toBeNull();
});
