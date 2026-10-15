import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { ProductApplicationManagementConsole } from '../ProductApplicationManagementConsole';
import type { ProductApplication, ProductApplicationsApi } from '../types';

afterEach(() => {
  cleanup();
  localStorage.clear();
});
const row = (
  name = '검증상품',
  status: ProductApplication['status'] = 'pending',
): ProductApplication => ({
  id: name,
  organization_id: 'fixture-org',
  organizationName: '검증매장',
  service_key: 'kpa-society',
  external_product_id: 'fixture-product',
  product_name: name,
  product_metadata: {},
  supplierName: null,
  priceGeneral: null,
  priceGold: null,
  consumerReferencePrice: null,
  status,
  reject_reason: null,
  requested_by: 'fixture-user',
  requested_at: '2026-10-15T00:00:00Z',
  reviewed_by: null,
  reviewed_at: null,
});
const list = (rows: ProductApplication[], page = 1) => ({
  data: rows,
  pagination: { page, total: rows.length, totalPages: 1, limit: 20 },
});
function client() {
  return {
    list: vi.fn().mockResolvedValue(list([row()])),
    stats: vi.fn().mockResolvedValue({ pending: 1, approved: 1, rejected: 0 }),
    approve: vi.fn().mockResolvedValue({}),
    reject: vi.fn().mockResolvedValue({}),
    remove: vi.fn(),
    batchApprove: vi.fn(),
    batchReject: vi.fn(),
    batchDelete: vi.fn(),
  } satisfies ProductApplicationsApi;
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}
async function open(action: '승인' | '거절') {
  fireEvent.click(await screen.findByText('검증상품'));
  fireEvent.click(
    await screen.findByRole('button', { name: action }),
  );
}
function confirm(action: '승인' | '거절') {
  const buttons = screen.getAllByRole('button', { name: action });
  fireEvent.click(buttons[buttons.length - 1]);
}

describe('product application workflow recovery', () => {
  it('shows approval failure and retries the same target', async () => {
    const api = client();
    api.approve.mockRejectedValueOnce(new Error('승인 저장 실패'));
    render(<ProductApplicationManagementConsole api={api} />);
    await open('승인');
    confirm('승인');
    await screen.findByText('승인 저장 실패');
    confirm('승인');
    await waitFor(() => expect(api.approve).toHaveBeenCalledTimes(2));
    expect(api.approve.mock.calls[0]).toEqual(api.approve.mock.calls[1]);
    await screen.findByText(/승인 완료/);
  });
  it('preserves rejection reason on failure and reuses it on retry', async () => {
    const api = client();
    api.reject.mockRejectedValueOnce({
      response: { data: { error: '거절 저장 실패' } },
    });
    render(<ProductApplicationManagementConsole api={api} />);
    await open('거절');
    fireEvent.change(screen.getByLabelText('처리 사유'), {
      target: { value: '검토 사유 보존' },
    });
    confirm('거절');
    await screen.findByText('거절 저장 실패');
    expect(
      (screen.getByLabelText('처리 사유') as HTMLTextAreaElement).value,
    ).toBe('검토 사유 보존');
    confirm('거절');
    await waitFor(() => expect(api.reject).toHaveBeenCalledTimes(2));
    expect(api.reject.mock.calls[1]).toEqual(['검증상품', '검토 사유 보존']);
  });
  it('ignores old filter responses and keeps the current approved list', async () => {
    const api = client();
    const old = deferred<ReturnType<typeof list>>();
    api.list.mockImplementation(({ status }) =>
      status === 'pending'
        ? old.promise
        : Promise.resolve(list([row('현재 승인', 'approved')])),
    );
    render(<ProductApplicationManagementConsole api={api} />);
    fireEvent.click(
      await screen.findByRole('button', { name: '승인 (1)' }),
    );
    await screen.findByText('현재 승인');
    await act(async () => old.resolve(list([row('늦은 대기')])));
    expect(screen.queryByText('늦은 대기')).toBeNull();
    expect(screen.getByText('현재 승인')).toBeTruthy();
  });
  it('does not disguise an initial failed read as an empty queue', async () => {
    const api = client();
    api.list.mockRejectedValueOnce(new Error('목록 장애'));
    render(<ProductApplicationManagementConsole api={api} />);
    await screen.findByText('목록 장애');
    expect(screen.queryByText('처리 대기 중인 신청이 없습니다.')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    await screen.findByText('검증상품');
  });
  it('keeps save success distinct from refresh failure and only retries reads', async () => {
    const api = client();
    render(<ProductApplicationManagementConsole api={api} />);
    await open('승인');
    api.list.mockRejectedValueOnce(new Error('갱신 실패'));
    confirm('승인');
    await screen.findByText(/처리는 완료했지만 최신 목록/);
    expect(screen.getByText(/승인 완료/)).toBeTruthy();
    expect(screen.queryByText('승인 확인')).toBeNull();
    fireEvent.click(
      screen.getByRole('button', { name: '최신 정보 다시 조회' }),
    );
    await screen.findByText('검증상품');
    expect(api.approve).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(screen.queryByText(/처리는 완료했지만 최신 목록/)).toBeNull(),
    );
  });
  it('preserves committed approval with listing activation failure', async () => {
    const api = client();
    api.approve.mockResolvedValueOnce({ listingActivated: false });
    render(<ProductApplicationManagementConsole api={api} />);
    await open('승인');
    confirm('승인');
    await screen.findByText(/승인은 완료됐지만 매장 진열 활성화에 실패/);
    await waitFor(() => expect(screen.queryByText('승인 확인')).toBeNull());
    expect(api.approve).toHaveBeenCalledTimes(1);
  });
  it('locks duplicate confirmation and filter changes until refresh finishes', async () => {
    const api = client();
    const pending = deferred<object>();
    api.approve.mockReturnValueOnce(pending.promise);
    render(<ProductApplicationManagementConsole api={api} />);
    await open('승인');
    const confirmButton = screen
      .getAllByRole('button', { name: '승인' })
      .at(-1)!;
    fireEvent.click(confirmButton);
    fireEvent.click(confirmButton);
    expect(api.approve).toHaveBeenCalledTimes(1);
    expect(
      (screen.getByRole('button', { name: '전체 (2)' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    const read = deferred<ReturnType<typeof list>>();
    api.list.mockReturnValueOnce(read.promise);
    await act(async () => pending.resolve({}));
    expect(
      (screen.getByRole('button', { name: '전체 (2)' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    await act(async () => read.resolve(list([row()])));
    await waitFor(() =>
      expect(
        (screen.getByRole('button', { name: '전체 (2)' }) as HTMLButtonElement)
          .disabled,
      ).toBe(false),
    );
  });
  it('does not refetch after an in-flight mutation completes following unmount', async () => {
    const api = client();
    const pending = deferred<object>();
    api.approve.mockReturnValueOnce(pending.promise);
    const view = render(<ProductApplicationManagementConsole api={api} />);
    await open('승인');
    confirm('승인');
    const reads = api.list.mock.calls.length;
    view.unmount();
    await act(async () => pending.resolve({}));
    expect(api.list).toHaveBeenCalledTimes(reads);
  });
  it('allows only one bulk write while a batch is pending', async () => {
    const api = client();
    const pending = deferred<object>();
    api.batchApprove.mockReturnValueOnce(pending.promise);
    render(<ProductApplicationManagementConsole api={api} />);
    await screen.findByText('검증상품');
    fireEvent.click(screen.getAllByRole('checkbox')[1]);
    const buttons = screen.getAllByRole('button', { name: /승인 \(1\)/ });
    const batchButton = buttons[buttons.length - 1];
    fireEvent.click(batchButton);
    fireEvent.click(batchButton);
    expect(api.batchApprove).toHaveBeenCalledTimes(1);
    await act(async () =>
      pending.resolve({
        data: { results: [{ id: '검증상품', status: 'success' }] },
      }),
    );
  });
});
