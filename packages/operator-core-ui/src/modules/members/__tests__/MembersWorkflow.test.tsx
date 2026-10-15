import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { OperatorMembersConsolePage } from '../OperatorMembersConsolePage';
const row = {
  id: 'fixture',
  name: '검증 회원',
  email: 'fixture@example.test',
  status: 'pending',
  createdAt: '2026-10-15',
  role: 'member',
};
const list = (users = [row], page = 1, total = users.length) => ({
  users,
  pagination: { page, limit: 20, total, totalPages: Math.ceil(total / 20) },
});
const api = () => ({
  list: vi.fn().mockResolvedValue(list()),
  stats: vi
    .fn()
    .mockResolvedValue({
      statistics: { total: 1, byStatus: [{ status: 'pending', count: 1 }] },
    }),
  updateStatus: vi.fn().mockResolvedValue(undefined),
  batchUpdateStatus: vi
    .fn()
    .mockResolvedValue({
      data: { results: [{ id: 'fixture', status: 'success' }] },
    }),
});
function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}
function Location() {
  return <output data-testid="location">{useLocation().search}</output>;
}
const props = { serviceKey: 'lecture', roleTabs: [], canManageLifecycle: true };
function mount(client: ReturnType<typeof api>, extra = {}) {
  return render(
    <MemoryRouter>
      <OperatorMembersConsolePage {...props} client={client} {...extra} />
    </MemoryRouter>,
  );
}
afterEach(() => {
  cleanup();
  localStorage.clear();
});
describe('common service member workflow', () => {
  it('keeps a failed rejection target and reason and retries the same request', async () => {
    const client = api();
    client.updateStatus.mockRejectedValueOnce(new Error('반려 장애'));
    mount(client, { rejectReason: { required: true } });
    fireEvent.click(await screen.findByText('검증 회원'));
    fireEvent.change(screen.getByLabelText('반려 사유'), {
      target: { value: '보완해주세요' },
    });
    fireEvent.click(screen.getByRole('button', { name: '반려' }));
    await screen.findByText('반려 장애');
    expect(
      (screen.getByLabelText('반려 사유') as HTMLTextAreaElement).value,
    ).toBe('보완해주세요');
    fireEvent.click(screen.getByRole('button', { name: '반려' }));
    await screen.findByRole('status');
    expect(client.updateStatus).toHaveBeenCalledTimes(2);
    expect(client.updateStatus.mock.calls[1]?.[0]).toBe('fixture');
  });
  it('blocks blank required rejection reasons in members mode as well as approval mode', async () => {
    const client = api();
    mount(client, { rejectReason: { required: true } });
    fireEvent.click(await screen.findByText('검증 회원'));
    expect(
      (screen.getByRole('button', { name: '반려' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(client.updateStatus).not.toHaveBeenCalled();
  });
  it('locks duplicate confirmations and keeps success separate from read failure', async () => {
    const client = api();
    const pending = deferred<void>();
    client.updateStatus.mockReturnValueOnce(pending.promise);
    mount(client);
    fireEvent.click(await screen.findByText('검증 회원'));
    const approve = screen.getByRole('button', { name: '승인' });
    fireEvent.click(approve);
    fireEvent.click(approve);
    expect(client.updateStatus).toHaveBeenCalledTimes(1);
    client.list.mockRejectedValueOnce(new Error('갱신 장애'));
    await act(async () => pending.resolve());
    await screen.findByText(/처리는 완료했지만/);
    expect(screen.getByRole('status').textContent).toContain('처리 완료');
    fireEvent.click(
      screen.getByRole('button', { name: '최신 정보 다시 조회' }),
    );
    await waitFor(() =>
      expect(screen.queryByText(/처리는 완료했지만/)).toBeNull(),
    );
    expect(client.updateStatus).toHaveBeenCalledTimes(1);
  });
  it('holds the write lock until list and statistics refresh complete', async () => {
    const client = api();
    mount(client);
    fireEvent.click(await screen.findByText('검증 회원'));
    const read = deferred<ReturnType<typeof list>>();
    client.list.mockReturnValueOnce(read.promise);
    fireEvent.click(screen.getByRole('button', { name: '승인' }));
    await waitFor(() => expect(client.list).toHaveBeenCalledTimes(2));
    expect(
      (screen.getByRole('button', { name: '새로고침' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    await act(async () => read.resolve(list()));
    await waitFor(() =>
      expect(
        (screen.getByRole('button', { name: '새로고침' }) as HTMLButtonElement)
          .disabled,
      ).toBe(false),
    );
  });
  it('never claims an empty list on read failure and supports refresh', async () => {
    const client = api();
    client.list.mockRejectedValueOnce(new Error('조회 장애'));
    mount(client);
    await screen.findByText('조회 장애');
    expect(screen.queryByText('등록된 사용자가 없습니다.')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '새로고침' }));
    await screen.findByText('검증 회원');
  });
  it('does not refetch after unmounting an in-flight status change', async () => {
    const client = api();
    const pending = deferred<void>();
    client.updateStatus.mockReturnValueOnce(pending.promise);
    const view = mount(client);
    fireEvent.click(await screen.findByText('검증 회원'));
    fireEvent.click(screen.getByRole('button', { name: '승인' }));
    view.unmount();
    await act(async () => pending.resolve());
    expect(client.list).toHaveBeenCalledTimes(1);
  });
  it('serializes bulk writes and refreshes a completed batch immediately', async () => {
    const client = api();
    const pending = deferred<{
      data: { results: { id: string; status: string }[] };
    }>();
    client.batchUpdateStatus.mockReturnValueOnce(pending.promise);
    mount(client);
    await screen.findByText('검증 회원');
    fireEvent.click(screen.getAllByRole('checkbox')[1]);
    const approve = screen.getByRole('button', { name: '승인 (1)' });
    fireEvent.click(approve);
    fireEvent.click(approve);
    expect(client.batchUpdateStatus).toHaveBeenCalledTimes(1);
    await act(async () =>
      pending.resolve({
        data: { results: [{ id: 'fixture', status: 'success' }] },
      }),
    );
    await waitFor(() => expect(client.list).toHaveBeenCalledTimes(2));
  });
  it('restores the URL query and preserves unrelated parameters', async () => {
    const client = api();
    render(
      <MemoryRouter
        initialEntries={[
          '/?keep=1&members_search=fixture&members_page=2&members_sortBy=email&members_sortOrder=asc',
        ]}
      >
        <OperatorMembersConsolePage
          {...props}
          client={client}
          syncUrl
          serverSort
        />
        <Location />
      </MemoryRouter>,
    );
    await screen.findByText('검증 회원');
    expect(client.list).toHaveBeenCalledWith({
      page: 2,
      limit: 20,
      search: 'fixture',
      sortBy: 'email',
      sortOrder: 'ASC',
    });
    expect(screen.getByTestId('location').textContent).toContain('keep=1');
  });
  it('retries only failed batch ids after partial success', async () => {
    const client = api();
    client.list.mockResolvedValue(
      list([row, { ...row, id: 'second', name: '둘째회원' }]),
    );
    client.batchUpdateStatus.mockResolvedValueOnce({
      data: {
        results: [
          { id: 'fixture', status: 'success' },
          { id: 'second', status: 'failed', error: '거부' },
        ],
      },
    });
    mount(client);
    await screen.findByText('검증 회원');
    fireEvent.click(screen.getAllByRole('checkbox')[0]);
    fireEvent.click(screen.getByRole('button', { name: '승인 (2)' }));
    await screen.findByText('실패 1건 재시도');
    await waitFor(() => expect(client.list).toHaveBeenCalledTimes(2));
    client.batchUpdateStatus.mockResolvedValueOnce({ data: { results: [{ id: 'second', status: 'success' }] } });
    fireEvent.click(screen.getByRole('button', { name: '실패 1건 재시도' }));
    await waitFor(() =>
      expect(client.batchUpdateStatus).toHaveBeenCalledTimes(2),
    );
    expect(client.batchUpdateStatus).toHaveBeenNthCalledWith(
      2,
      ['second'],
      'approved',
    );
    await waitFor(() => expect(screen.queryByText('실패 1건 재시도')).toBeNull());
  });
  it('corrects an empty last page after a committed action', async () => {
    const client = api();
    client.list.mockImplementation(async ({ page }: { page: number }) =>
      list([row], page, 21),
    );
    mount(client);
    await screen.findByText('검증 회원');
    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    await waitFor(() => expect(client.list).toHaveBeenCalledTimes(2));
    fireEvent.click(screen.getByText('검증 회원'));
    client.list.mockResolvedValueOnce(list([], 2, 20));
    fireEvent.click(screen.getByRole('button', { name: '승인' }));
    await waitFor(() => expect(client.list).toHaveBeenCalledTimes(4));
    expect(client.list.mock.calls.at(-1)?.[0].page).toBe(1);
    expect(client.updateStatus).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('status').textContent).toContain('처리 완료');
  });
  it('keeps approval-only mode free of editing, deletion and bulk controls', async () => {
    const client = api();
    mount(client, {
      consoleMode: 'approval',
      renderEditModal: vi.fn(),
      renderDeleteFlow: vi.fn(),
      canDeleteMembership: true,
    });
    await screen.findByText('검증 회원');
    expect(screen.queryByRole('checkbox')).toBeNull();
    fireEvent.click(screen.getByText('검증 회원'));
    expect(screen.queryByRole('button', { name: '비활성화' })).toBeNull();
    expect(screen.queryByRole('button', { name: '수정' })).toBeNull();
  });
 it('clears a saved-operation refresh warning when the ordinary refresh succeeds',async()=>{
  const client=api();mount(client);fireEvent.click(await screen.findByText('검증 회원'));client.list.mockRejectedValueOnce(new Error('갱신 실패'));fireEvent.click(screen.getByRole('button',{name:'승인'}));await screen.findByText(/처리는 완료했지만/);
  fireEvent.click(screen.getByRole('button',{name:'새로고침'}));await waitFor(()=>expect(screen.queryByText(/처리는 완료했지만/)).toBeNull());expect(client.updateStatus).toHaveBeenCalledTimes(1);expect(screen.getByRole('status').textContent).toContain('처리 완료');
 });

});
