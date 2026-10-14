import { afterEach, beforeEach, expect, it, describe, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
const mocks = vi.hoisted(() => ({ courses: vi.fn(), applications: vi.fn(), approve: vi.fn(), approveApplication: vi.fn(), rejectApplication: vi.fn(), success: vi.fn(), error: vi.fn() }));
vi.mock('../../api/lecture', () => ({ operatorApi: mocks, errorMessage: (_err: unknown, fallback: string) => fallback }));
vi.mock('../../components/Toast', () => ({ useToast: () => ({ success: mocks.success, error: mocks.error }) }));
import OperatorCoursesPage from './OperatorCoursesPage';
import OperatorInstructorsPage from './OperatorInstructorsPage';
const row = (name: string, status: string) => ({ id: name, title: name, user: { name }, userId: name, status, createdAt: '2026-10-11' });
beforeEach(() => vi.resetAllMocks());
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe.each([
  { name: '강좌', Page: OperatorCoursesPage, fetch: mocks.courses, mutate: mocks.approve, pending: 'pending_review', filter: '게시 중', next: 'published', button: '승인(게시)' },
  { name: '강사', Page: OperatorInstructorsPage, fetch: mocks.applications, mutate: mocks.approveApplication, pending: 'pending', filter: '승인', next: 'approved', button: '승인' },
])('$name 운영 목록', ({ Page, fetch, mutate, pending, filter, next, button }) => {
  it('a late pending response cannot replace the selected status', async () => {
    let old!: (data: unknown) => void;
    fetch.mockImplementationOnce(() => new Promise(done => { old = done; })).mockResolvedValueOnce({ data: [row('현재 필터 결과', next)] });
    render(<MemoryRouter><Page /></MemoryRouter>);
    fireEvent.click(screen.getAllByRole('button', { name: filter }).find(element => element.classList.contains('chip'))!);
    await screen.findByText('현재 필터 결과');
    await act(async () => old({ data: [row('늦은 신청', pending)] }));
    expect(screen.queryByText('늦은 신청')).toBeNull();
    expect(fetch).toHaveBeenLastCalledWith(expect.objectContaining({ status: next }));
  });
  it('read failure hides old action rows and supports retry', async () => {
    fetch.mockResolvedValueOnce({ data: [row('기존 신청', pending)] }).mockRejectedValueOnce(new Error('fixture')).mockResolvedValueOnce({ data: [] });
    render(<MemoryRouter><Page /></MemoryRouter>);
    await screen.findByText('기존 신청');
    fireEvent.click(screen.getAllByRole('button', { name: filter }).find(element => element.classList.contains('chip'))!);
    await screen.findByRole('alert');
    expect(screen.queryByText('기존 신청')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '다시 조회' }));
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
  });
  it('one pending action locks other rows/filters and late completion cannot notify an unmounted page', async () => {
    let complete!: () => void;
    fetch.mockResolvedValue({ data: [row('첫 신청', pending), row('다른 신청', pending)] });
    mutate.mockImplementation(() => new Promise<void>(done => { complete = done; }));
    const view = render(<MemoryRouter><Page /></MemoryRouter>);
    await screen.findByText('첫 신청');
    const buttons = screen.getAllByRole('button', { name: button }).filter(element => !element.classList.contains('chip'));
    fireEvent.click(buttons[0]);
    fireEvent.click(buttons[1]);
    expect(mutate).toHaveBeenCalledTimes(1);
    expect((buttons[1] as HTMLButtonElement).disabled).toBe(true);
    view.unmount();
    await act(async () => complete());
    expect(mocks.success).not.toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

it.each([null, ''])('instructor rejection keeps the optional-reason policy (prompt=%j)', async reason => {
  mocks.applications.mockResolvedValue({ data: [row('반려 검증 강사', 'pending')] });
  mocks.rejectApplication.mockResolvedValue({});
  vi.spyOn(window, 'prompt').mockReturnValue(reason);
  render(<MemoryRouter><OperatorInstructorsPage /></MemoryRouter>);
  await screen.findByText('반려 검증 강사');
  const button = screen.getAllByRole('button', { name: '반려' }).find(element => element.classList.contains('btn'))!;
  fireEvent.click(button);
  if (reason === null) expect(mocks.rejectApplication).not.toHaveBeenCalled();
  else await waitFor(() => expect(mocks.rejectApplication).toHaveBeenCalledWith('반려 검증 강사', ''));
});
