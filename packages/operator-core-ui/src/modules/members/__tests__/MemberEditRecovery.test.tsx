import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
vi.mock('@o4o/ui', async (original) => ({
  ...(await original<object>()),
  AddressSearch: () => null,
}));
import { CommonEditUserModal } from '../CommonEditUserModal';
import { OperatorMemberSoftDeleteFlow } from '../OperatorMemberSoftDeleteFlow';
const id = '11111111-2222-4333-8444-555555555555';
const data = (nickname = '검증회원') => ({
  user: { id, nickname, firstName: '회원', lastName: '검증' },
  roles: [],
  memberships: [],
});
function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}
afterEach(cleanup);
const config = (makeRequest: any) => ({
  serviceKey: 'lecture',
  makeRequest,
  membershipRoleOptions: [],
  adminRoleOptions: [],
});
describe('common member editor recovery', () => {
  it('retains input on failure and retries once while guarding duplicate submit and close', async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(data())
      .mockRejectedValueOnce(new Error('수정 장애'));
    const closed = vi.fn(),
      saved = vi.fn();
    render(
      <CommonEditUserModal
        userId={id}
        config={config(request)}
        onClose={closed}
        onSuccess={saved}
      />,
    );
    const nickname = await screen.findByLabelText('닉네임');
    fireEvent.change(nickname, { target: { value: '보존할이름' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await screen.findByRole('alert');
    expect((nickname as HTMLInputElement).value).toBe('보존할이름');
    const pending = deferred<object>();
    request.mockReturnValueOnce(pending.promise);
    const form = nickname.closest('form')!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    fireEvent.click(screen.getByRole('button', { name: '닫기' }));
    expect(request).toHaveBeenCalledTimes(3);
    expect(closed).not.toHaveBeenCalled();
    await act(async () => pending.resolve({}));
    expect(saved).toHaveBeenCalledTimes(1);
    expect(closed).toHaveBeenCalledTimes(1);
  });
  it('ignores a previous user load after selecting another member', async () => {
    const pending = deferred<ReturnType<typeof data>>();
    const request = vi
      .fn()
      .mockReturnValueOnce(pending.promise)
      .mockResolvedValueOnce(data('새회원'));
    const view = render(
      <CommonEditUserModal
        userId={id}
        config={config(request)}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );
    view.rerender(
      <CommonEditUserModal
        userId="aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee"
        config={config(request)}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );
    const nickname = await screen.findByLabelText('닉네임');
    await act(async () => pending.resolve(data('이전회원')));
    expect((nickname as HTMLInputElement).value).toBe('새회원');
  });
  it('does not publish a save receipt after unmount', async () => {
    const pending = deferred<object>();
    const request = vi
      .fn()
      .mockResolvedValueOnce(data())
      .mockReturnValueOnce(pending.promise);
    const saved = vi.fn();
    const view = render(
      <CommonEditUserModal
        userId={id}
        config={config(request)}
        onClose={vi.fn()}
        onSuccess={saved}
      />,
    );
    await screen.findByLabelText('닉네임');
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    view.unmount();
    await act(async () => pending.resolve({}));
    expect(saved).not.toHaveBeenCalled();
  });
  it('does not allow saving when the initial member read failed', async () => {
    const request = vi.fn().mockRejectedValue(new Error('조회 장애'));
    render(
      <CommonEditUserModal
        userId={id}
        config={config(request)}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );
    await screen.findByRole('alert');
    expect(
      (screen.getByRole('button', { name: '저장' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });
});
it('locks the service withdrawal confirmation against duplicate submits and Escape while pending', async () => {
  const pending = deferred<void>();
  const execute = vi.fn().mockReturnValueOnce(pending.promise),
    close = vi.fn(),
    deleted = vi.fn();
  render(
    <OperatorMemberSoftDeleteFlow
      user={{
        id,
        email: 'fixture@example.test',
        status: 'active',
        createdAt: '2026-10-15',
      }}
      execute={execute}
      onClose={close}
      onDeleted={deleted}
      title="서비스 탈퇴"
      confirmText="탈퇴 처리"
      buildMessage={() => '검증 대상'}
      successMessage="완료"
      errorMessage="실패"
    />,
  );
  const confirm = screen.getByRole('button', { name: '탈퇴 처리' });
  fireEvent.click(confirm);
  fireEvent.click(confirm);
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(execute).toHaveBeenCalledTimes(1);
  expect(close).not.toHaveBeenCalled();
  await act(async () => pending.resolve());
  expect(deleted).toHaveBeenCalledTimes(1);
});
