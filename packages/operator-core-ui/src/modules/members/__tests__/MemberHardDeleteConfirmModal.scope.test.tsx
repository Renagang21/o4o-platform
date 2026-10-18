import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemberHardDeleteConfirmModal } from '../components/MemberHardDeleteConfirmModal';
afterEach(cleanup);
it('shows actual relationship cleanup scope and blocks submission while the caller cannot verify the target', () => {
  const confirm = vi.fn();
  const props = { open: true, member: { id: 'a', name: '합성 회원' }, serviceLabel: 'Fixture', onClose: vi.fn(), onConfirm: confirm, relationshipOnly: true };
  const view = render(<MemberHardDeleteConfirmModal {...props} confirmDisabled />);
  expect(screen.getByText(/공통 계정·다른 서비스 가입·게시글·댓글·감사 기록 전체를 삭제하는 기능이 아닙니다/)).toBeTruthy();
  fireEvent.change(screen.getByRole('textbox'), { target: { value: '가입정리' } });
  fireEvent.click(screen.getByRole('button', { name: '서비스 가입 정리' })); expect(confirm).not.toHaveBeenCalled();
  view.rerender(<MemberHardDeleteConfirmModal {...props} />);
  fireEvent.click(screen.getByRole('button', { name: '서비스 가입 정리' })); expect(confirm).toHaveBeenCalledTimes(1);
});
it('changing the target requires confirmation again and legacy callers retain their existing contract', () => {
  const props = { open: true, member: { id: 'a' }, serviceLabel: 'Fixture', onClose: vi.fn(), onConfirm: vi.fn() };
  const view = render(<MemberHardDeleteConfirmModal {...props} />);
  fireEvent.change(screen.getByRole('textbox'), { target: { value: '완전삭제' } });
  expect((screen.getByRole('button', { name: '완전삭제', exact: true }) as HTMLButtonElement).disabled).toBe(false);
  view.rerender(<MemberHardDeleteConfirmModal {...props} member={{ id: 'b' }} />);
  expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('');
  expect((screen.getByRole('button', { name: '완전삭제', exact: true }) as HTMLButtonElement).disabled).toBe(true);
});
