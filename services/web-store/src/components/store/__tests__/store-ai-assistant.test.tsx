import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { Link, MemoryRouter, useLocation } from 'react-router-dom';
import { StoreAiAssistant } from '../StoreAiAssistant';
import { currentWorkspaceArea } from '../../../config/storeWorkspace';

const m = vi.hoisted(() => ({ store: 'A', account: 'owner', service: 'kpa-society' as string | null, ask: vi.fn() }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: m.account }, isAuthenticated: true }) }));
vi.mock('../../../contexts/StoreContext', () => ({ useUnifiedStore: () => ({ organizationId: m.store, effectiveServiceKey: m.service, status: 'ready' }) }));
vi.mock('../../../api/storeAi', async original => ({ ...(await original<object>()), askStoreAi: m.ask }));
function Fixture() {
  const location = useLocation();
  return <><Link to="/store/workspace/use">운영으로 이동</Link><StoreAiAssistant area={currentWorkspaceArea(location.pathname, location.search, '/store')} basePath="/store" items={[{ key: 'tablet', label: '허용된 태블릿', subPath: '/commerce/tablet-displays' }]} /></>;
}
const app = () => <MemoryRouter initialEntries={['/store/workspace/studio']}><Fixture /></MemoryRouter>;
const input = () => screen.getByLabelText('지금 하고 싶은 일 또는 이어서 답할 내용');
function open() { fireEvent.click(screen.getByRole('button', { name: /내 매장 AI/ })); }
function send(value: string) { fireEvent.change(input(), { target: { value } }); fireEvent.click(screen.getByRole('button', { name: '보내기' })); }
afterEach(cleanup);
beforeEach(() => { vi.clearAllMocks(); m.store = 'A'; m.account = 'owner'; m.service = 'kpa-society'; m.ask.mockResolvedValue({ success: true, answer: '어떤 제품을 안내할까요?', remainingQueries: 4 }); });

it('opens without a paid call and submits only the entered question and bounded conversation', async () => {
  render(app()); open(); expect(m.ask).not.toHaveBeenCalled();
  send('고객에게 제품을 설명하고 싶어요');
  await screen.findByText('어떤 제품을 안내할까요?');
  expect(m.ask).toHaveBeenCalledTimes(1);
  const request = m.ask.mock.calls[0][0];
  expect(request).toMatchObject({ question: '고객에게 제품을 설명하고 싶어요', serviceId: 'kpa-society', task: 'question', contextData: { pageTitle: '내 매장 · 안내 만들기', serviceInfo: { previousTurns: [] } } });
  expect(request.storeId).toBeUndefined();
  expect(request.contextData.product).toBeUndefined();
});

it('keeps one conversation and unsent input across work areas, then carries the reply to the next question', async () => {
  render(app()); open(); send('안내를 만들고 싶어요'); await screen.findByText('어떤 제품을 안내할까요?');
  fireEvent.change(input(), { target: { value: '고객 안내 제품 A' } });
  fireEvent.click(screen.getByText('운영으로 이동'));
  expect((input() as HTMLTextAreaElement).value).toBe('고객 안내 제품 A');
  fireEvent.click(screen.getByRole('button', { name: '보내기' }));
  await waitFor(() => expect(m.ask).toHaveBeenCalledTimes(2));
  expect(m.ask.mock.calls[1][0].contextData).toMatchObject({ pageTitle: '내 매장 · 매장 운영', serviceInfo: { previousTurns: [expect.objectContaining({ question: '안내를 만들고 싶어요' })] } });
});

it('locks duplicate sends, keeps later typing and ignores a late reply after a store switch', async () => {
  let resolve!: (value: object) => void;
  m.ask.mockReturnValue(new Promise(yes => { resolve = yes; }));
  const view = render(app()); open(); send('첫 요청');
  fireEvent.submit(input().closest('form')!);
  expect(m.ask).toHaveBeenCalledTimes(1);
  fireEvent.change(input(), { target: { value: '다음 입력' } });
  await act(async () => resolve({ success: true, answer: '첫 답변' }));
  expect((input() as HTMLTextAreaElement).value).toBe('다음 입력');
  m.ask.mockReturnValue(new Promise(yes => { resolve = yes; }));
  fireEvent.click(screen.getByRole('button', { name: '보내기' }));
  m.store = 'B'; view.rerender(app()); open();
  await act(async () => resolve({ success: true, answer: '이전 매장 답변' }));
  expect(screen.queryByText('이전 매장 답변')).toBeNull();
  expect((input() as HTMLTextAreaElement).value).toBe('');
});

it.each(['account', 'service'] as const)('separates the displayed conversation when %s changes', async field => {
  const view = render(app()); open(); send('원래 입력'); await screen.findByText('어떤 제품을 안내할까요?');
  m[field] = field === 'account' ? 'staff' : 'neture'; view.rerender(app()); open();
  expect(screen.queryByText('어떤 제품을 안내할까요?')).toBeNull();
});

it('keeps failed input, reports quota limits and retries only on an explicit request', async () => {
  m.ask.mockRejectedValueOnce({ status: 429 });
  render(app()); open(); send('실패 입력');
  await screen.findByRole('alert'); expect((input() as HTMLTextAreaElement).value).toBe('실패 입력');
  expect(m.ask).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: '다시 요청' })); await screen.findByText('어떤 제품을 안내할까요?');
  expect(m.ask).toHaveBeenCalledTimes(2);
});

it('shows returned text safely and exposes only permission-filtered existing links', async () => {
  m.ask.mockResolvedValue({ success: true, answer: '<script>unsafe()</script> https://untrusted.example.test' });
  render(app()); open(); send('문구'); await screen.findByText(/<script>/);
  expect(document.querySelector('script')).toBeNull();
  expect(document.querySelector('a[href^="https://untrusted"]')).toBeNull();
  fireEvent.click(screen.getByText('안내 만들기에서 작업 이어가기'));
  expect(screen.getByRole('link', { name: '허용된 태블릿' }).getAttribute('href')).toBe('/store/commerce/tablet-displays');
  expect(screen.queryByRole('link', { name: '직원 관리' })).toBeNull();
});

it('allows service-free owners to use the existing general query and clears only UI state for a new task', async () => {
  m.service = null; render(app()); open(); send('설명'); await screen.findByText('어떤 제품을 안내할까요?');
  expect(m.ask.mock.calls[0][0].serviceId).toBe('neture');
  fireEvent.click(screen.getByRole('button', { name: '새 작업' }));
  expect(screen.queryByText('어떤 제품을 안내할까요?')).toBeNull();
  expect(m.ask).toHaveBeenCalledTimes(1);
});

it('uses the explicit service workspace before the common store service context', async () => {
  m.service = 'neture';
  render(<MemoryRouter><StoreAiAssistant area="commerce" basePath="/work/kpa-society/store" items={[]} /></MemoryRouter>);
  open(); send('거래 조건 설명'); await screen.findByText('어떤 제품을 안내할까요?');
  expect(m.ask.mock.calls[0][0].serviceId).toBe('kpa-society');
});
