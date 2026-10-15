import { StrictMode, useRef, useState } from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { OperatorDialog } from '../OperatorDialog';
import { ProductServiceApprovalDecisionModal } from '../ProductServiceApprovalDecisionModal';

afterEach(async () => { cleanup(); await new Promise(resolve => requestAnimationFrame(resolve)); vi.restoreAllMocks(); });
function Harness({ removeTrigger = false }: { removeTrigger?: boolean }) {
  const fallback = useRef<HTMLHeadingElement>(null);
  const [open, setOpen] = useState(false), [child, setChild] = useState(false), [busy, setBusy] = useState(false);
  const [value, setValue] = useState('');
  return <><h1 ref={fallback} tabIndex={-1}>목록</h1>
    {(!removeTrigger || !open) && <button onClick={() => setOpen(true)}>상세 열기</button>}
    {open && <OperatorDialog label="상세" fallbackFocus={fallback} onCancel={() => setOpen(false)}>
      <button data-dialog-initial-focus onClick={() => setOpen(false)}>닫기</button>
      <button onClick={() => setChild(true)}>거절 열기</button>
      {child && <ProductServiceApprovalDecisionModal fallbackFocus={fallback} decision="reject" batch={false} count={1}
        value={value} error={busy ? '실패 안내' : null} busy={busy} canManage onChange={setValue}
        onCancel={() => setChild(false)} onConfirm={() => setBusy(true)} />}
    </OperatorDialog>}
  </>;
}
function click(element: HTMLElement) { element.focus(); fireEvent.click(element); }
function cancel(element: HTMLElement) { fireEvent(element, new Event('cancel', { cancelable: true })); }
it('keeps initial focus through a StrictMode remount and restores the invoker', async () => {
  render(<StrictMode><Harness /></StrictMode>);
  const trigger = screen.getByText('상세 열기'); click(trigger);
  await new Promise(resolve => requestAnimationFrame(resolve));
  expect(document.activeElement).toBe(screen.getByText('닫기'));
  cancel(screen.getByRole('dialog'));
  await waitFor(() => expect(document.activeElement).toBe(trigger));
});
it('wraps Tab and Shift+Tab across only enabled visible controls', () => {
  vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([new DOMRect()] as unknown as DOMRectList);
  render(<Harness />); click(screen.getByText('상세 열기'));
  const first = screen.getByText('닫기'), last = screen.getByText('거절 열기');
  last.focus(); fireEvent.keyDown(last, { key: 'Tab' }); expect(document.activeElement).toBe(first);
  fireEvent.keyDown(first, { key: 'Tab', shiftKey: true }); expect(document.activeElement).toBe(last);
});
it('closes only the nested decision and restores its parent control', async () => {
  render(<Harness />); click(screen.getByText('상세 열기')); const trigger = screen.getByText('거절 열기'); click(trigger);
  const child = screen.getByRole('dialog', { name: '승인 거절' });
  expect(document.activeElement).toBe(within(child).getByRole('textbox', { name: '거절 사유' }));
  const listener = vi.fn(); document.addEventListener('keydown', listener);
  fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
  document.removeEventListener('keydown', listener); expect(listener).not.toHaveBeenCalled();
  cancel(child); await waitFor(() => expect(document.activeElement).toBe(trigger));
  expect(screen.getByRole('dialog', { name: '상세' })).toBeTruthy();
});
it('retains focus, the reason and the error while a decision is busy', () => {
  render(<Harness />); click(screen.getByText('상세 열기')); click(screen.getByText('거절 열기'));
  const child = screen.getByRole('dialog', { name: '승인 거절' });
  fireEvent.change(within(child).getByRole('textbox'), { target: { value: '합성 사유' } });
  click(within(child).getByText('거절 확인')); cancel(child);
  expect(child.getAttribute('aria-busy')).toBe('true'); expect(document.activeElement).toBe(child);
  expect((within(child).getByRole('textbox') as HTMLTextAreaElement).value).toBe('합성 사유');
  expect(within(child).getByRole('alert').textContent).toBe('실패 안내');
});
it('uses the heading when the invoker has been removed', async () => {
  render(<Harness removeTrigger />); click(screen.getByText('상세 열기')); cancel(screen.getByRole('dialog'));
  // The newly rendered button is not the removed invoker.
  await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('heading')));
});
