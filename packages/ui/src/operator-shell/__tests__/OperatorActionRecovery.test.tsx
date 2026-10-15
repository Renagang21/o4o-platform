import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react';
import { OperatorActionType } from '@o4o/types';
import { OperatorConfirmModal } from '../OperatorConfirmModal';
import { useOperatorAction } from '../useOperatorAction';

afterEach(cleanup);
describe('operator confirmation recovery', () => {
  it('reports failure without closing the pending action, then allows retry', async () => {
    const api = vi
      .fn()
      .mockRejectedValueOnce(new Error('저장 실패'))
      .mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => useOperatorAction());
    act(() => result.current.requestAction(OperatorActionType.REJECT));
    await act(async () =>
      expect(await result.current.executeAction(api)).toBe(false),
    );
    expect(result.current.pendingAction).toBe(OperatorActionType.REJECT);
    expect(result.current.error).toBe('저장 실패');
    await act(async () =>
      expect(await result.current.executeAction(api)).toBe(true),
    );
    expect(api).toHaveBeenCalledTimes(2);
    expect(result.current.pendingAction).toBeNull();
  });
  it('preserves the reason when the caller returns false and shows its error', async () => {
    const confirm = vi.fn().mockResolvedValue(false);
    render(
      <OperatorConfirmModal
        open
        actionType={OperatorActionType.REJECT}
        onClose={vi.fn()}
        onConfirm={confirm}
        error="실패 안내"
      />,
    );
    fireEvent.change(screen.getByLabelText('처리 사유'), {
      target: { value: '재시도 사유' },
    });
    fireEvent.click(screen.getByRole('button', { name: '거절' }));
    await waitFor(() => expect(confirm).toHaveBeenCalledWith('재시도 사유'));
    expect(
      (screen.getByLabelText('처리 사유') as HTMLTextAreaElement).value,
    ).toBe('재시도 사유');
    expect(screen.getByRole('alert').textContent).toBe('실패 안내');
  });
  it('retains the existing void callback behavior', async () => {
    const confirm = vi.fn();
    render(
      <OperatorConfirmModal
        open
        actionType={OperatorActionType.REJECT}
        onClose={vi.fn()}
        onConfirm={confirm}
      />,
    );
    fireEvent.change(screen.getByLabelText('처리 사유'), {
      target: { value: '기존 호출자' },
    });
    fireEvent.click(screen.getByRole('button', { name: '거절' }));
    await waitFor(() =>
      expect(
        (screen.getByLabelText('처리 사유') as HTMLTextAreaElement).value,
      ).toBe(''),
    );
  });
  it('prevents duplicate confirmation and close while an async callback is pending', async () => {
    let release!: (value: boolean) => void;
    const confirm = vi.fn(
      () =>
        new Promise<boolean>((resolve) => {
          release = resolve;
        }),
    );
    const close = vi.fn();
    render(
      <OperatorConfirmModal
        open
        actionType={OperatorActionType.APPROVE}
        onClose={close}
        onConfirm={confirm}
      />,
    );
    const button = screen.getByRole('button', { name: '승인' });
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(close).not.toHaveBeenCalled();
    await act(async () => release(false));
  });
});
