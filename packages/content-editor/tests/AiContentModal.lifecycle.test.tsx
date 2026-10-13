import { useState } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AiContentModal } from '../src/components/AiContentModal';

function Harness({ onSaved }: { onSaved?: (id: string | undefined) => void } = {}) {
  const [open, setOpen] = useState(true);
  return <>
    <button onClick={() => setOpen(true)}>Reopen fixture</button>
    <button onClick={() => setOpen(false)}>External close fixture</button>
    <AiContentModal open={open} onClose={() => setOpen(false)} editor={null}
      initialText="Fixture input" showStoreSave showProductionMaterialSave onProductionMaterialSaved={onSaved} />
  </>;
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ success: true, html: '<p>Fixture</p>', title: 'Generated title', summary: 'Summary' }),
  }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.useRealTimers(); });

async function generate() {
  fireEvent.click(screen.getByRole('button', { name: '✨ AI로 생성' }));
  await screen.findByRole('button', { name: '내 매장 저장' });
}

function deferred<T = unknown>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}
function response(title = 'Current title') {
  return { ok: true, json: async () => ({ success: true, html: `<p>${title}</p>`, title, summary: '' }) };
}
function selectUrl() {
  fireEvent.click(screen.getByRole('button', { name: 'URL에서 가져오기' }));
  fireEvent.change(screen.getByPlaceholderText('https://example.com/article'), { target: { value: 'https://example.invalid/article' } });
}

describe('real AiContentModal save-panel lifecycle', () => {
  it('close/reopen clears store draft before a new generated result opens the panel', async () => {
    render(<Harness />);
    await generate();
    fireEvent.click(screen.getByRole('button', { name: '내 매장 저장' }));
    const title = screen.getByPlaceholderText('저장할 콘텐츠 제목을 입력하세요');
    expect((title as HTMLInputElement).value).toBe('Generated title');
    fireEvent.change(title, { target: { value: 'Old draft' } });
    fireEvent.click(screen.getByRole('button', { name: '×' }));
    expect(screen.queryByPlaceholderText('저장할 콘텐츠 제목을 입력하세요')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Reopen fixture' }));
    await generate();
    fireEvent.click(screen.getByRole('button', { name: '내 매장 저장' }));
    expect((screen.getByPlaceholderText('저장할 콘텐츠 제목을 입력하세요') as HTMLInputElement).value).toBe('Generated title');
  });

  it('store and material panels keep independent drafts while both are open', async () => {
    render(<Harness />);
    await generate();
    fireEvent.click(screen.getByRole('button', { name: '내 매장 저장' }));
    fireEvent.click(screen.getByRole('button', { name: '제작 자료로 저장' }));
    const store = screen.getByPlaceholderText('저장할 콘텐츠 제목을 입력하세요');
    const material = screen.getByPlaceholderText('저장할 매장 제작 자료 제목을 입력하세요');
    fireEvent.change(store, { target: { value: 'Store draft' } });
    fireEvent.change(material, { target: { value: 'Material draft' } });
    expect((store as HTMLInputElement).value).toBe('Store draft');
    expect((material as HTMLInputElement).value).toBe('Material draft');
  });

  it('ignores a generation reply from the modal session before close/reopen', async () => {
    let reply!: (value: unknown) => void;
    vi.stubGlobal('fetch', vi.fn(() => new Promise(resolve => { reply = resolve; })));
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: '✨ AI로 생성' }));
    fireEvent.click(screen.getByRole('button', { name: '×' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reopen fixture' }));
    await act(async () => reply({ ok: true, json: async () => ({ success: true, html: '<p>Late result</p>', title: 'Late old title' }) }));
    expect(screen.queryByRole('button', { name: '내 매장 저장' })).toBeNull();
    expect(screen.queryByText('Late result')).toBeNull();
    expect((screen.getByRole('button', { name: '✨ AI로 생성' }) as HTMLButtonElement).disabled).toBe(false);
  });


  it.each(['success', 'failure'])('old %s and finally cannot overwrite a newer pending request', async outcome => {
    const old = deferred();
    const current = deferred();
    vi.stubGlobal('fetch', vi.fn().mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise));
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: '✨ AI로 생성' }));
    fireEvent.click(screen.getByRole('button', { name: '×' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reopen fixture' }));
    fireEvent.click(screen.getByRole('button', { name: '✨ AI로 생성' }));
    await act(async () => outcome === 'success' ? old.resolve(response('Old title')) : old.reject(new Error('Old failure')));
    expect((screen.getByRole('button', { name: '생성 중...' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByRole('button', { name: '내 매장 저장' })).toBeNull();
    expect(screen.queryByText('Old failure')).toBeNull();
    await act(async () => current.resolve(response('New title')));
    fireEvent.click(await screen.findByRole('button', { name: '내 매장 저장' }));
    expect((screen.getByPlaceholderText('저장할 콘텐츠 제목을 입력하세요') as HTMLInputElement).value).toBe('New title');
  });

  it('external open=false invalidates the old request without relying on handleClose', async () => {
    const old = deferred();
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(old.promise));
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: '✨ AI로 생성' }));
    fireEvent.click(screen.getByRole('button', { name: 'External close fixture' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reopen fixture' }));
    await act(async () => old.resolve(response('Old external title')));
    expect(screen.queryByRole('button', { name: '내 매장 저장' })).toBeNull();
    expect((screen.getByRole('button', { name: '✨ AI로 생성' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('close while JSON is pending cannot apply the decoded old result', async () => {
    const body = deferred();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => body.promise }));
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: '✨ AI로 생성' }));
    await act(async () => { await Promise.resolve(); });
    fireEvent.click(screen.getByRole('button', { name: '×' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reopen fixture' }));
    await act(async () => body.resolve({ success: true, html: '<p>Old body</p>', title: 'Old body' }));
    expect(screen.queryByRole('button', { name: '내 매장 저장' })).toBeNull();
  });

  it('source changes supersede pending text generation and release its spinner', async () => {
    const old = deferred();
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(old.promise));
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: '✨ AI로 생성' }));
    selectUrl();
    expect((screen.getByRole('button', { name: '🔗 URL로 생성' }) as HTMLButtonElement).disabled).toBe(false);
    await act(async () => old.resolve(response('Old text title')));
    expect(screen.queryByRole('button', { name: '내 매장 저장' })).toBeNull();
  });

  it('old URL result cannot replace a new text request or clear its loading flag', async () => {
    const old = deferred();
    const current = deferred();
    vi.stubGlobal('fetch', vi.fn().mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise));
    render(<Harness />);
    selectUrl();
    fireEvent.click(screen.getByRole('button', { name: '🔗 URL로 생성' }));
    fireEvent.click(screen.getByRole('button', { name: '기존 입력' }));
    fireEvent.click(screen.getByRole('button', { name: '✨ AI로 생성' }));
    await act(async () => old.resolve({ ok: true, json: async () => ({ success: true, title: 'Old URL', blocks: [{ type: 'o4o/paragraph', content: 'Old URL' }] }) }));
    expect((screen.getByRole('button', { name: '생성 중...' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByText('Old URL')).toBeNull();
    await act(async () => current.resolve(response('Current text')));
    await screen.findByRole('button', { name: '내 매장 저장' });
  });

  it('current URL success still converts blocks and opens the save panel', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, title: 'URL title', blocks: [{ type: 'o4o/paragraph', content: 'URL body' }] }) }));
    render(<Harness />);
    selectUrl();
    fireEvent.click(screen.getByRole('button', { name: '🔗 URL로 생성' }));
    fireEvent.click(await screen.findByRole('button', { name: '내 매장 저장' }));
    expect((screen.getByPlaceholderText('저장할 콘텐츠 제목을 입력하세요') as HTMLInputElement).value).toBe('URL title');
  });

  it('current text failure still shows the error and releases the spinner', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Current generation failure')));
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: '✨ AI로 생성' }));
    await screen.findByText('Current generation failure');
    expect((screen.getByRole('button', { name: '✨ AI로 생성' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('current URL timeout retains the existing 90-second error and loading behavior', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn((_url, init: RequestInit) => new Promise((_resolve, reject) => {
      init.signal?.addEventListener('abort', () => reject(new DOMException('timeout', 'AbortError')));
    })));
    render(<Harness />);
    selectUrl();
    fireEvent.click(screen.getByRole('button', { name: '🔗 URL로 생성' }));
    await act(async () => { await vi.advanceTimersByTimeAsync(90000); });
    expect(screen.getByText('URL 분석 시간이 초과되었습니다. (90초) 다시 시도하거나 다른 URL을 입력해 주세요.')).toBeTruthy();
    expect((screen.getByRole('button', { name: '🔗 URL로 생성' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('confirmed material save keeps its success callback after the modal closes', async () => {
    const saved = deferred();
    const onSaved = vi.fn();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(response()).mockReturnValueOnce(saved.promise));
    render(<Harness onSaved={onSaved} />);
    await generate();
    fireEvent.click(screen.getByRole('button', { name: '제작 자료로 저장' }));
    const save = screen.getAllByRole('button', { name: '제작 자료로 저장' })[0];
    fireEvent.click(save);
    fireEvent.click(screen.getByRole('button', { name: '×' }));
    expect(onSaved).not.toHaveBeenCalled();
    await act(async () => saved.resolve({ ok: true, json: async () => ({ success: true, data: { id: 'fixture-asset' } }) }));
    expect(onSaved).toHaveBeenCalledExactlyOnceWith('fixture-asset');
  });


  it('selecting the current source tab does not supersede its pending request', async () => {
    const current = deferred();
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(current.promise));
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: '✨ AI로 생성' }));
    fireEvent.click(screen.getByRole('button', { name: '기존 입력' }));
    expect((screen.getByRole('button', { name: '생성 중...' }) as HTMLButtonElement).disabled).toBe(true);
    await act(async () => current.resolve(response()));
    await screen.findByRole('button', { name: '내 매장 저장' });
  });

});
