import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { LlmAssistPanel } from '../../../../../packages/content-editor/src/components/LlmAssistPanel';
import { buildContentAuthoringGuide } from '../../../../../packages/content-editor/src/components/content-authoring-guide';

const copy = vi.fn();
beforeEach(() => {
  copy.mockReset().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: copy } });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const paste = (html = '<p>검토할 결과</p>') => fireEvent.change(screen.getByLabelText('결과 HTML 붙여넣기'), { target: { value: html } });
function review() {
  fireEvent.click(screen.getByRole('button', { name: '결과 미리보기' }));
  fireEvent.click(screen.getByRole('checkbox', { name: '결과와 사실·이용 범위를 확인했습니다' }));
}
function Harness({ scope = 'store-a', disabled = false }: { scope?: string; disabled?: boolean }) {
  const [html, setHtml] = useState('<p>기존 본문</p>');
  return <><output data-testid="body">{html}</output><LlmAssistPanel defaultOpen contextKey={scope} disabled={disabled}
    guideText={({ additionalInstruction }) => buildContentAuthoringGuide({ contextLabel: '콘텐츠', additionalInstruction })}
    currentHtml={html} onApplyHtml={setHtml}
    referenceMaterials={[{ id: 'public', title: '선택할 안내', text: '선택한 자료' }, { id: 'private', title: '내부 자료', text: '자동 전송 금지' }]} /></>;
}
describe('shared external AI authoring workflow', () => {
  it('copies only explicitly selected host materials and shows the exact manual-copy text', async () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('checkbox', { name: '선택할 안내' }));
    fireEvent.click(screen.getByRole('button', { name: '작업 안내 복사' }));
    await waitFor(() => expect(copy).toHaveBeenCalledTimes(1));
    expect(copy.mock.calls[0][0]).toContain('선택한 자료');
    expect(copy.mock.calls[0][0]).not.toContain('자동 전송 금지');
    expect(copy.mock.calls[0][0]).not.toContain('기존 본문');
    expect((screen.getByLabelText('전달할 작업 안내') as HTMLTextAreaElement).value).toBe(copy.mock.calls[0][0]);
  });
  it('requires preview and review before applying, and cancelling replacement preserves both drafts', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false); render(<Harness />); paste();
    expect((screen.getByRole('button', { name: '편집기에 넣기' }) as HTMLButtonElement).disabled).toBe(true);
    review(); fireEvent.click(screen.getByRole('button', { name: '편집기에 넣기' }));
    expect(screen.getByTestId('body').textContent).toBe('<p>기존 본문</p>');
    expect((screen.getByLabelText('결과 HTML 붙여넣기') as HTMLTextAreaElement).value).toContain('검토할 결과');
  });
  it('applies safe HTML, does not save, and restores the previous body explicitly', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true); render(<Harness />);
    paste('```html\n<p onclick="bad()">검토할 결과</p><script>bad()</script>\n```'); review();
    fireEvent.click(screen.getByRole('button', { name: '편집기에 넣기' }));
    expect(screen.getByTestId('body').textContent).toBe('<p>검토할 결과</p>');
    fireEvent.click(screen.getByRole('button', { name: '적용 전 본문으로 되돌리기' }));
    expect(screen.getByTestId('body').textContent).toBe('<p>기존 본문</p>');
  });
  it('isolates preview scripts, styles, external requests and forms in a sandbox', () => {
    render(<Harness />); paste('<style>body{display:none}</style><p>본문</p><img src="https://example.invalid/pixel"><form action="https://example.invalid">test</form>');
    fireEvent.click(screen.getByRole('button', { name: '결과 미리보기' }));
    const frame = screen.getByTitle('결과 미리보기');
    expect(frame.getAttribute('sandbox')).toBe('');
    expect(frame.getAttribute('srcdoc')).toContain("default-src 'none'");
    expect(frame.getAttribute('srcdoc')).toContain("form-action 'none'");
  });
  it('invalidates preview acknowledgement whenever pasted content changes', () => {
    render(<Harness />); paste(); review(); paste('<p>다른 결과</p>');
    expect(screen.queryByTitle('결과 미리보기')).toBeNull();
    expect((screen.getByRole('button', { name: '편집기에 넣기' }) as HTMLButtonElement).disabled).toBe(true);
  });
  it('does not apply a sanitized empty result', () => {
    render(<Harness />); paste('<script>bad()</script>'); fireEvent.click(screen.getByRole('button', { name: '결과 미리보기' }));
    expect(screen.queryByTitle('결과 미리보기')).toBeNull();
    expect(screen.getByText('미리 볼 본문이 없습니다. 결과 HTML을 확인해 주세요.').textContent).toContain('본문이 없습니다');
  });
  it('drops paste, material selection and review when document scope changes', () => {
    const { rerender } = render(<Harness />); paste(); review();
    fireEvent.click(screen.getByRole('checkbox', { name: '선택할 안내' }));
    rerender(<Harness scope="store-b" />);
    expect((screen.getByLabelText('결과 HTML 붙여넣기') as HTMLTextAreaElement).value).toBe('');
    expect((screen.getByRole('checkbox', { name: '선택할 안내' }) as HTMLInputElement).checked).toBe(false);
    expect(screen.queryByTitle('결과 미리보기')).toBeNull();
  });
  it('hides the modal and disables the entry while saving or read-only', () => {
    const { rerender } = render(<Harness />); paste(); rerender(<Harness disabled />);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect((screen.getByRole('button', { name: 'LLM으로 작업하기' }) as HTMLButtonElement).disabled).toBe(true);
  });
  it('preserves result and reports apply failure without a success notification', () => {
    const notify = vi.fn(); render(<LlmAssistPanel defaultOpen guideText="기존 문자열 안내" onApplyHtml={() => { throw Error('fixture'); }} onNotify={notify} />);
    paste(); review(); fireEvent.click(screen.getByRole('button', { name: '편집기에 넣기' }));
    expect(notify).toHaveBeenLastCalledWith(expect.stringContaining('넣지 못했습니다'), 'error');
    expect((screen.getByLabelText('결과 HTML 붙여넣기') as HTMLTextAreaElement).value).toContain('검토할 결과');
  });
  it('reports clipboard fallback failure honestly and keeps manual-copy text available', async () => {
    copy.mockRejectedValue(Error('fixture')); Object.defineProperty(document, 'execCommand', { configurable: true, value: vi.fn(() => false) });
    render(<LlmAssistPanel defaultOpen guideText="직접 복사할 안내" />);
    fireEvent.click(screen.getByRole('button', { name: '작업 안내 복사' }));
    await screen.findByText('복사하지 못했습니다. 아래 내용을 직접 선택해 복사해 주세요.');
    expect(screen.queryByRole('button', { name: '✓ 복사됨' })).toBeNull();
    expect((screen.getByLabelText('전달할 작업 안내') as HTMLTextAreaElement).value).toBe('직접 복사할 안내');
  });
  it('does not notify a new scope when an old clipboard request completes', async () => {
    let finish!: () => void; copy.mockReturnValue(new Promise<void>(resolve => { finish = resolve; }));
    const notify = vi.fn(); const { rerender } = render(<LlmAssistPanel contextKey="a" defaultOpen guideText="a" onNotify={notify} />);
    fireEvent.click(screen.getByRole('button', { name: '작업 안내 복사' }));
    rerender(<LlmAssistPanel contextKey="b" defaultOpen guideText="b" onNotify={notify} />);
    await act(async () => finish());
    expect(screen.queryByRole('button', { name: '✓ 복사됨' })).toBeNull();
    expect(notify).not.toHaveBeenCalled();
  });
  it('preserves string-guide and no-apply legacy consumers', () => {
    render(<LlmAssistPanel defaultOpen guideText="기존 태블릿 안내" />);
    expect(screen.queryByLabelText('결과 HTML 붙여넣기')).toBeNull();
    expect(screen.getAllByText(/HTML 탭/).length).toBeGreaterThan(0);
  });
  it('closes only its own dialog with Escape and returns keyboard focus to the entry', () => {
    render(<LlmAssistPanel guideText="문서 작업" onApplyHtml={vi.fn()} />);
    const entry = screen.getByRole('button', { name: 'LLM으로 작업하기' }); entry.focus(); fireEvent.click(entry);
    const dialog = screen.getByRole('dialog'); fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull(); expect(document.activeElement).toBe(entry);
  });
  it('keeps keyboard focus inside the dialog while tabbing from the last action', () => {
    render(<LlmAssistPanel defaultOpen guideText="문서 작업" onApplyHtml={vi.fn()} />);
    const close = screen.getAllByRole('button', { name: '닫기' });
    close[close.length - 1].focus(); fireEvent.keyDown(close[close.length - 1], { key: 'Tab' });
    expect(document.activeElement).toBe(close[0]);
  });
});
