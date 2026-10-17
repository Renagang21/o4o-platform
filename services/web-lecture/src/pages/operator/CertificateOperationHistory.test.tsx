import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import History from './CertificateOperationHistory';
const { read } = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock('../../api/lecture', () => ({ operatorApi: { certificateOperations: read }, errorMessage: () => '이력 조회 실패' }));
afterEach(cleanup); beforeEach(() => vi.resetAllMocks());
const data = { items: [{ id: 'log', createdAt: '2026-10-17T00:00:00Z', actorId: 'operator', action: 'revoke', reason: '발급 오류', before: { isValid: true, expiresAt: null }, after: { isValid: false, expiresAt: null } }], page: 1, hasMore: false };
it('does not query while an id is being entered, then reads only the requested history', async () => {
  read.mockResolvedValue({ data });
  const view = render(<History key="" id="" disabled={false} revision={0} />);
  expect(read).not.toHaveBeenCalled();
  view.rerender(<History key="cert" id="cert" disabled={false} revision={0} />);
  expect(read).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: '처리 이력 조회' }));
  await screen.findByText('사유: 발급 오류');
  expect(read).toHaveBeenCalledWith('cert', 1);
  expect(screen.getByText('처리자: operator')).toBeTruthy();
});
it('keeps a read error distinct from an empty history and retries only the read', async () => {
  read.mockRejectedValueOnce(Error('offline')).mockResolvedValueOnce({ data: { items: [], hasMore: false, page: 1 } });
  render(<History id="cert" disabled={false} revision={1} />);
  await screen.findByRole('alert');
  expect(screen.queryByText('기록된 처리 이력이 없습니다.')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '이력 다시 조회' }));
  await screen.findByText('기록된 처리 이력이 없습니다.'); expect(read).toHaveBeenCalledTimes(2);
});
it('ignores the previous target response when switching targets', async () => {
  let finish!: (value: unknown) => void;
  read.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; })).mockResolvedValueOnce({ data: { items: [], hasMore: false, page: 1 } });
  const view = render(<History key="old" id="old" disabled={false} revision={1} />);
  view.rerender(<History key="new" id="new" disabled={false} revision={1} />);
  await screen.findByText('기록된 처리 이력이 없습니다.');
  await act(async () => finish({ data })); expect(screen.queryByText('사유: 발급 오류')).toBeNull();
});
it('refreshes after another successful command and rejects an older history response', async () => {
  let finish!: (value: unknown) => void;
  read.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; })).mockResolvedValueOnce({ data });
  const view = render(<History id="cert" disabled={false} revision={1} />);
  view.rerender(<History id="cert" disabled={false} revision={2} />);
  await screen.findByText('사유: 발급 오류');
  await act(async () => finish({ data: { items: [], hasMore: false } }));
  expect(screen.getByText('사유: 발급 오류')).toBeTruthy();
});
it('requests the next page and retries that page after a read failure', async () => {
  read.mockResolvedValueOnce({ data: { ...data, hasMore: true } }).mockRejectedValueOnce(Error('offline')).mockResolvedValueOnce({ data: { ...data, page: 2 } });
  render(<History id="cert" disabled={false} revision={1} />);
  await screen.findByText('사유: 발급 오류');
  fireEvent.click(screen.getByRole('button', { name: '다음 이력' })); await screen.findByRole('alert');
  fireEvent.click(screen.getByRole('button', { name: '이력 다시 조회' }));
  await screen.findByText('2 페이지'); expect(read).toHaveBeenLastCalledWith('cert', 2);
});
it('disables reads during a command and distinguishes malformed responses from empty results', async () => {
  read.mockResolvedValue({ data: { items: null } });
  const view = render(<History id="cert" disabled={true} revision={0} />);
  expect((screen.getByRole('button', { name: '처리 이력 조회' }) as HTMLButtonElement).disabled).toBe(true);
  view.rerender(<History id="cert" disabled={false} revision={0} />);
  fireEvent.click(screen.getByRole('button', { name: '처리 이력 조회' })); await screen.findByRole('alert');
  expect(screen.queryByText('기록된 처리 이력이 없습니다.')).toBeNull();
});
