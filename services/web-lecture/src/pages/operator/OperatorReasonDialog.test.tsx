import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import Dialog from './OperatorReasonDialog';
afterEach(cleanup);
it('keeps focus inside the decision and prevents dismissal while its write is pending', () => {
  const cancel = vi.fn();
  const props = { title: '강좌 반려', target: '합성 강좌', busy: false, onConfirm: vi.fn(), onCancel: cancel };
  const view = render(<Dialog {...props} />);
  const input = screen.getByRole('textbox');
  fireEvent.change(input, { target: { value: '자료 보완' } });
  const confirm = screen.getByRole('button', { name: '처리 확인' }); confirm.focus();
  fireEvent.keyDown(confirm, { key: 'Tab' }); expect(document.activeElement).toBe(input);
  view.rerender(<Dialog {...props} busy />);
  expect(document.activeElement).toBe(screen.getByRole('dialog'));
  fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' }); expect(cancel).not.toHaveBeenCalled();
  view.rerender(<Dialog {...props} />);
  fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' }); expect(cancel).toHaveBeenCalledTimes(1);
});
