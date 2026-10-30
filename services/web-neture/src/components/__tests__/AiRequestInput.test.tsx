import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AiRequestInput } from '@o4o/ui/ai';

afterEach(cleanup);

describe('shared AI request entry', () => {
  it('sends with Enter, keeps Shift+Enter and Korean composition, and preserves paste handlers', () => {
    const send = vi.fn(), paste = vi.fn();
    render(<form onSubmit={event => { event.preventDefault(); send(); }}>
      <AiRequestInput aria-label="업무 요청" value="약국 업무" onChange={() => {}} onPaste={paste} submitLabel="보내기" />
    </form>);
    const field = screen.getByRole('textbox');
    fireEvent.keyDown(field, { key: 'Enter', isComposing: true });
    fireEvent.keyDown(field, { key: 'Enter', keyCode: 229 });
    fireEvent.keyDown(field, { key: 'Enter', shiftKey: true });
    expect(send).not.toHaveBeenCalled();
    fireEvent.paste(field);
    expect(paste).toHaveBeenCalledOnce();
    fireEvent.keyDown(field, { key: 'Enter' });
    expect(send).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: '보내기' }));
    expect(send).toHaveBeenCalledTimes(2);
  });

  it('blocks empty, busy and externally blocked requests through keyboard and button', () => {
    const send = vi.fn();
    const props = { 'aria-label': '업무 요청', onChange: () => {}, onSend: send, submitLabel: '보내기' };
    const view = render(<AiRequestInput {...props} value=" " />);
    for (const state of [{ value: ' ' }, { value: '조회', busy: true }, { value: '조회', submitDisabled: true }]) {
      view.rerender(<AiRequestInput {...props} {...state} />);
      fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
      expect(screen.getByRole('button')).toHaveProperty('disabled', true);
    }
    expect(send).not.toHaveBeenCalled();
  });

  it('does not turn a content prompt into an implicit parent form submit', () => {
    const send = vi.fn();
    render(<form onSubmit={send}><AiRequestInput aria-label="추가 요청" value="표로 정리" onChange={() => {}} /></form>);
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
    expect(send).not.toHaveBeenCalled();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('lets hosts keep drafting while a request is busy without allowing a duplicate send', () => {
    const change = vi.fn(), send = vi.fn();
    render(<AiRequestInput aria-label="업무 요청" value="다음 업무" onChange={change} busy submitLabel="보내기" onSend={send} />);
    expect(screen.getByRole('textbox')).toHaveProperty('disabled', false);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '다음 업무 보충' } });
    expect(change).toHaveBeenCalledOnce();
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
    expect(send).not.toHaveBeenCalled();
  });
});
