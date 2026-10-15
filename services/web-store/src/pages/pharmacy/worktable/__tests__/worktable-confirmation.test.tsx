import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { OrderWorktableConfirmation } from '../OrderWorktableConfirmation';
import type { WorktableConfirmation } from '../../hooks/useOrderWorktable';

afterEach(cleanup);
it('prevents cart navigation until a confirmed batch finishes submitting', () => {
  const onViewCart = vi.fn();
  const confirmation: WorktableConfirmation = { targets: [], draftRevision: 0 };
  const props = { confirmation, error: null, onViewCart, onClose: vi.fn(), onAdd: vi.fn() };
  const { rerender } = render(<OrderWorktableConfirmation {...props} adding />);
  const button = screen.getByRole('button', { name: '장바구니 보기' });
  expect(button.hasAttribute('disabled')).toBe(true);
  fireEvent.click(button);
  expect(onViewCart).not.toHaveBeenCalled();
  rerender(<OrderWorktableConfirmation {...props} adding={false} />);
  fireEvent.click(button);
  expect(onViewCart).toHaveBeenCalledOnce();
});
