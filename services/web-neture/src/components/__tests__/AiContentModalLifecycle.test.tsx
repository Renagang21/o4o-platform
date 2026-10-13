import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { StrictMode } from 'react';
import {
  AiContentModal,
  type AiContentModalProps,
} from '../../../../../packages/content-editor/src/components/AiContentModal';
const fetchMock = vi.fn();
const generated = (name: string) => ({
  success: true,
  html: `<p>${name}</p>`,
  title: `Title ${name}`,
  summary: `Summary ${name}`,
});
const response = (data: unknown, status = 200) => ({
  ok: status < 400,
  status,
  json: async () => data,
});
function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (reason: unknown) => void;
  const promise = new Promise<T>((a, b) => {
    resolve = a;
    reject = b;
  });
  return { promise, resolve, reject };
}
const originalClipboard = Object.getOwnPropertyDescriptor(
  navigator,
  'clipboard',
);
const originalExec = Object.getOwnPropertyDescriptor(document, 'execCommand');
beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  if (originalClipboard)
    Object.defineProperty(navigator, 'clipboard', originalClipboard);
  else delete (navigator as any).clipboard;
  if (originalExec)
    Object.defineProperty(document, 'execCommand', originalExec);
  else delete (document as any).execCommand;
});
function mount(options: Partial<AiContentModalProps> = {}) {
  const props = {
    open: true,
    editor: null,
    onClose: vi.fn(),
    initialText: 'Synthetic source',
    aiRequestHeaders: { 'X-Context': 'context-a' },
    ...options,
  };
  return { ...render(<AiContentModal {...props} />), props };
}
const generateButton = () =>
  screen.getByRole('button', {
    name: /AI로 생성|POP용 정리 시작|QR 안내문 시작|블로그 글 시작/,
  });
async function generate(name = 'Current result') {
  fetchMock.mockResolvedValueOnce(response(generated(name)));
  fireEvent.click(generateButton());
  await screen.findByText(name);
}
async function resolve(
  request: ReturnType<typeof deferred<any>>,
  value: unknown,
) {
  await act(async () => {
    request.resolve(value);
    await request.promise;
  });
}
function clipboard(writeText: ReturnType<typeof vi.fn>) {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  });
}

describe('AI modal keeps view lifetime separate from submitted saves', () => {
  it('aborts generation on external close and discards an old response even if the transport ignores abort', async () => {
    const old = deferred<any>();
    fetchMock.mockReturnValueOnce(old.promise);
    const { props, rerender } = mount();
    fireEvent.click(generateButton());
    const oldSignal = fetchMock.mock.calls[0][1].signal as AbortSignal;
    rerender(<AiContentModal {...props} open={false} />);
    expect(oldSignal.aborted).toBe(true);
    rerender(<AiContentModal {...props} initialText="Next source" />);
    await generate('New result');
    await resolve(old, response(generated('Old result')));
    expect(screen.queryByText('Old result')).toBeNull();
    expect(screen.getAllByText('New result').length).toBeGreaterThan(0);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).input).toBe(
      'Next source',
    );
  });
  it('does not let an old failure clear the current loading state after a new request starts', async () => {
    const old = deferred<any>(),
      next = deferred<any>();
    fetchMock
      .mockReturnValueOnce(old.promise)
      .mockReturnValueOnce(next.promise);
    const { props, rerender } = mount();
    fireEvent.click(generateButton());
    rerender(<AiContentModal {...props} initialText="Next entry" />);
    fireEvent.click(generateButton());
    await resolve(
      old,
      response({ success: false, error: 'Old provider error' }, 503),
    );
    expect(screen.queryByText('Old provider error')).toBeNull();
    expect(screen.getByText('생성 중...')).toBeTruthy();
    await resolve(next, response(generated('Latest result')));
    expect(screen.getAllByText('Latest result').length).toBeGreaterThan(0);
  });
  it('cancels generation on source switch and allows URL generation to finish independently', async () => {
    const old = deferred<any>();
    fetchMock.mockReturnValueOnce(old.promise);
    mount();
    fireEvent.click(generateButton());
    fireEvent.click(screen.getByRole('button', { name: /URL에서 가져오기/ }));
    expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true);
    fireEvent.change(
      screen.getByPlaceholderText('https://example.com/article'),
      { target: { value: 'https://example.com/source' } },
    );
    fetchMock.mockResolvedValueOnce(
      response({
        success: true,
        blocks: [{ type: 'o4o/paragraph', content: 'URL current' }],
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: '🔗 URL로 생성' }));
    await screen.findByText('URL current');
    await resolve(old, response(generated('Text stale')));
    expect(screen.queryByText('Text stale')).toBeNull();
  });
  it('keeps same-value header rerenders stable in StrictMode and invalidates a changed request context', async () => {
    const props = {
      open: true,
      editor: null,
      onClose: vi.fn(),
      initialText: 'Synthetic source',
      aiRequestHeaders: { 'X-A': 'a', 'X-B': 'b' },
    };
    const { rerender } = render(
      <StrictMode>
        <AiContentModal {...props} />
      </StrictMode>,
    );
    await generate();
    rerender(
      <StrictMode>
        <AiContentModal
          {...props}
          aiRequestHeaders={{ 'X-B': 'b', 'X-A': 'a' }}
        />
      </StrictMode>,
    );
    expect(screen.getAllByText('Current result').length).toBeGreaterThan(0);
    rerender(
      <StrictMode>
        <AiContentModal {...props} aiRequestHeaders={{ 'X-A': 'new' }} />
      </StrictMode>,
    );
    expect(screen.queryByText('Current result')).toBeNull();
  });
  it('preserves the 90 second URL timeout and removes its timer on unmount', async () => {
    const { unmount } = mount({ initialSourceTab: 'url' });
    fireEvent.change(
      screen.getByPlaceholderText('https://example.com/article'),
      { target: { value: 'https://example.com/source' } },
    );
    fetchMock.mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) =>
          init.signal.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          ),
        ),
    );
    vi.useFakeTimers();
    fireEvent.click(screen.getByRole('button', { name: '🔗 URL로 생성' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(90000);
    });
    expect(screen.getByText(/URL 분석 시간이 초과되었습니다/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '🔗 URL로 생성' }));
    const signal = fetchMock.mock.calls[1][1].signal;
    unmount();
    expect(signal.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('ignores clipboard completion after close instead of updating the reopened view', async () => {
    const writing = deferred<void>(),
      write = vi.fn(() => writing.promise);
    clipboard(write);
    const { props, rerender } = mount();
    await generate();
    fireEvent.click(screen.getByRole('button', { name: '복사' }));
    fireEvent.click(screen.getByRole('button', { name: '×' }));
    rerender(<AiContentModal {...props} open={false} />);
    rerender(<AiContentModal {...props} />);
    await generate('Reopened result');
    await resolve(writing, undefined);
    expect(screen.queryByRole('button', { name: '복사됨 ✓' })).toBeNull();
    expect(write).toHaveBeenCalledTimes(1);
  });
  it('does not run clipboard fallback for an obsolete copy and lets only the latest timer clear feedback', async () => {
    const stale = deferred<void>(),
      current = deferred<void>();
    const write = vi
      .fn()
      .mockReturnValueOnce(stale.promise)
      .mockReturnValueOnce(current.promise);
    clipboard(write);
    const fallback = vi.fn();
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: fallback,
    });
    mount();
    await generate();
    vi.useFakeTimers();
    fireEvent.click(screen.getByRole('button', { name: '복사' }));
    fireEvent.click(screen.getByRole('button', { name: '복사' }));
    await resolve(current, undefined);
    await act(async () => {
      stale.reject(new Error('Synthetic clipboard unavailable'));
      try {
        await stale.promise;
      } catch {
        // The rejected stale request is intentional; the view must keep the latest copy result.
      }
    });
    expect(fallback).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: '복사됨 ✓' })).toBeTruthy();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(screen.getByRole('button', { name: '복사' })).toBeTruthy();
  });
  it('keeps a submitted production write pending across reopen, suppresses its receipt and still calls its original completion callback once', async () => {
    const save = deferred<any>(),
      saved = vi.fn(),
      nextSaved = vi.fn();
    const { props, rerender } = mount({
      showProductionMaterialSave: true,
      onProductionMaterialSaved: saved,
    });
    await generate('Old content');
    fireEvent.click(screen.getByRole('button', { name: '제작 자료로 저장' }));
    fetchMock.mockReturnValueOnce(save.promise);
    fireEvent.click(
      screen.getByRole('button', { name: '제작 자료로 저장' }),
    );
    const init = fetchMock.mock.calls.at(-1)![1];
    expect(init.signal).toBeUndefined();
    expect(JSON.parse(init.body).htmlContent).toBe('<p>Old content</p>');
    rerender(<AiContentModal {...props} open={false} />);
    rerender(
      <AiContentModal {...props} onProductionMaterialSaved={nextSaved} />,
    );
    await generate('New content');
    fireEvent.click(screen.getByRole('button', { name: '제작 자료로 저장' }));
    expect(
      (screen.getByRole('button', { name: '저장 중...' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    await resolve(
      save,
      response({ success: true, data: { id: 'old-asset' } }, 201),
    );
    expect(saved).toHaveBeenCalledExactlyOnceWith('old-asset');
    expect(nextSaved).not.toHaveBeenCalled();
    expect(screen.queryByText(/매장 제작 자료에 저장되었습니다/)).toBeNull();
    expect(
      (
        screen.getByRole('button', {
          name: '제작 자료로 저장',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false);
  });
  it('tracks channel and store writes independently and refuses duplicate submits in the same area', async () => {
    const channel = deferred<any>(),
      store = deferred<any>();
    const onChannelSave = vi.fn(() => channel.promise);
    mount({ showStoreSave: true, onChannelSave });
    await generate();
    fireEvent.click(screen.getByRole('button', { name: '채널에 저장' }));
    fireEvent.click(screen.getByRole('button', { name: '저장 중...' }));
    fireEvent.click(screen.getByRole('button', { name: '내 매장 저장' }));
    fetchMock.mockReturnValueOnce(store.promise);
    fireEvent.click(screen.getByRole('button', { name: '매장에 저장' }));
    expect(onChannelSave).toHaveBeenCalledTimes(1);
    expect(
      fetchMock.mock.calls.filter(([url]) =>
        String(url).endsWith('/api/v1/kpa/store-contents'),
      ),
    ).toHaveLength(1);
    await resolve(channel, { success: true, fieldLabel: 'Synthetic field' });
    await resolve(
      store,
      response({ success: true, data: { id: 'store-content' } }),
    );
    expect(screen.getByText(/Synthetic field/)).toBeTruthy();
    expect(screen.getByText(/내 매장 콘텐츠에 저장되었습니다/)).toBeTruthy();
  });
  it('discards an old category response and refetches on the next view instead of caching stale data', async () => {
    const catalog = deferred<any>();
    const { props, rerender } = mount({ showCommunitySave: true });
    await generate();
    fetchMock.mockReturnValueOnce(catalog.promise);
    fireEvent.click(screen.getByRole('button', { name: '커뮤니티 저장' }));
    rerender(<AiContentModal {...props} open={false} />);
    rerender(<AiContentModal {...props} />);
    await generate();
    await resolve(
      catalog,
      response({ success: true, data: [{ id: 'stale', name: 'Stale forum' }] }),
    );
    fetchMock.mockResolvedValueOnce(
      response({
        success: true,
        data: [{ id: 'current', name: 'Current forum' }],
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: '커뮤니티 저장' }));
    await screen.findByText('Current forum');
    expect(screen.queryByText('Stale forum')).toBeNull();
  });
  it('invalidates a completed forum cache when request headers change, while preserving it across ordinary close/reopen', async () => {
    const { props, rerender } = mount({ showCommunitySave: true });
    await generate();
    fetchMock.mockResolvedValueOnce(
      response({
        success: true,
        data: [{ id: 'old', name: 'Old context forum' }],
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: '커뮤니티 저장' }));
    await screen.findByText('Old context forum');
    rerender(
      <AiContentModal
        {...props}
        aiRequestHeaders={{ 'X-Context': 'context-b' }}
      />,
    );
    await generate();
    fetchMock.mockResolvedValueOnce(
      response({
        success: true,
        data: [{ id: 'new', name: 'New context forum' }],
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: '커뮤니티 저장' }));
    await screen.findByText('New context forum');
    expect(screen.queryByText('Old context forum')).toBeNull();
    expect(fetchMock.mock.calls.at(-1)![1].headers).toMatchObject({
      'X-Context': 'context-b',
    });
  });
});
