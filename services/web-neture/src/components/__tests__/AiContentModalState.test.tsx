import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import {
  AiContentModal,
  type AiContentModalProps,
} from '../../../../../packages/content-editor/src/components/AiContentModal';
import {
  aiContentGenerationReducer,
  INITIAL_GENERATION_STATE,
} from '../../../../../packages/content-editor/src/components/ai-content-generation-state';

const fetchMock = vi.fn();
const generated = {
  success: true,
  html: '<p>Generated body</p>',
  title: 'Generated title',
  summary: 'Generated summary',
};
const headers = { 'X-Request-Context': 'synthetic-context' };
const reply = (data: unknown, status = 200) => ({
  ok: status < 400,
  status,
  json: async () => data,
});
beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
function mount(overrides: Partial<AiContentModalProps> = {}) {
  const props = {
    open: true,
    editor: null,
    onClose: vi.fn(),
    aiRequestHeaders: headers,
    initialText: 'Initial source',
    ...overrides,
  };
  return { ...render(<AiContentModal {...props} />), props };
}
async function generate() {
  fetchMock.mockResolvedValueOnce(reply(generated));
  fireEvent.click(
    screen.getByRole('button', {
      name: /AI로 생성|컨텍스트 생성|POP용 정리 시작|QR 안내문 시작|블로그 글 시작/,
    }),
  );
  await screen.findByText('Generated body');
}
function request(path: string) {
  return fetchMock.mock.calls.find(([url]) =>
    String(url).endsWith(path),
  )?.[1] as RequestInit;
}

describe('AI modal generation and lifecycle preserve the caller context', () => {
  it('keeps validation errors alongside existing preview and applies distinct source/close reset boundaries', () => {
    let state = aiContentGenerationReducer(INITIAL_GENERATION_STATE, {
      type: 'result',
      result: generated,
    });
    state = aiContentGenerationReducer(state, {
      type: 'result_tab',
      tab: 'html',
    });
    state = aiContentGenerationReducer(state, { type: 'copied', copied: true });
    state = aiContentGenerationReducer(state, { type: 'usage_snippets' });
    state = aiContentGenerationReducer(state, {
      type: 'error',
      error: 'Invalid URL',
    });
    expect(state.result?.html).toBe(generated.html);
    const source = aiContentGenerationReducer(state, {
      type: 'source_changed',
    });
    expect(source).toMatchObject({
      result: null,
      error: '',
      copied: true,
      showUsageSnippets: true,
      resultTab: 'html',
    });
    expect(aiContentGenerationReducer(state, { type: 'closed' })).toMatchObject(
      {
        result: null,
        error: '',
        copied: false,
        showUsageSnippets: false,
        resultTab: 'html',
      },
    );
  });
  it('uses flexible output for general entry and forwards credentials and caller headers', async () => {
    mount();
    await generate();
    const init = request('/api/ai/content');
    expect(init.credentials).toBe('include');
    expect(init.headers).toMatchObject(headers);
    expect(JSON.parse(String(init.body))).toMatchObject({
      input: 'Initial source',
      outputType: 'flexible',
      options: { tone: 'professional', length: 'medium' },
    });
  });
  it('applies initial mode, text and template options on open while preserving user options until their dependencies change', async () => {
    const templateForcedOptions = {
      tone: 'friendly',
      length: 'short',
    } as const;
    const { rerender, props } = mount({
      initialMode: 'store_qr',
      initialText: '  Imported source  ',
      templateForcedOptions,
      templateSystemPrompt: 'Template instruction',
    });
    fireEvent.change(screen.getAllByRole('textbox')[0], {
      target: { value: 'User instruction' },
    });
    fireEvent.click(screen.getByRole('button', { name: '간결함' }));
    rerender(<AiContentModal {...props} headerLabel="Updated header" />);
    await generate();
    expect(JSON.parse(String(request('/api/ai/content').body))).toMatchObject({
      input: 'Imported source',
      outputType: 'store_qr',
      customPrompt: 'Template instruction\n\nUser instruction',
      options: { tone: 'concise', length: 'short' },
    });
  });
  it('resets generation and input on explicit close and uses the latest initial input after reopening', async () => {
    const { props, rerender } = mount();
    await generate();
    fireEvent.click(screen.getByRole('button', { name: '×' }));
    expect(props.onClose).toHaveBeenCalledTimes(1);
    rerender(<AiContentModal {...props} open={false} />);
    rerender(<AiContentModal {...props} initialText="Next context" />);
    expect(screen.queryByText('Generated body')).toBeNull();
    expect(
      (
        screen.getByPlaceholderText(
          '원본 정보를 입력하거나 에디터에서 가져오세요...',
        ) as HTMLTextAreaElement
      ).value,
    ).toBe('Next context');
    expect(screen.queryByRole('button', { name: '복사' })).toBeNull();
  });
  it('clears a generation error on source switch and allows retry after a provider failure', async () => {
    mount();
    fetchMock.mockResolvedValueOnce(
      reply({ success: false, error: 'Provider unavailable' }, 503),
    );
    fireEvent.click(screen.getByRole('button', { name: /AI로 생성/ }));
    await screen.findByText('Provider unavailable');
    expect(
      (screen.getByRole('button', { name: /AI로 생성/ }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'URL에서 가져오기' }));
    expect(screen.queryByText('Provider unavailable')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '기존 입력' }));
    await generate();
  });
  it('preserves URL request options and delivers YouTube and source URL to insertion before close', async () => {
    const setContent = vi.fn(),
      youtube = vi.fn(),
      onInsert = vi.fn(),
      onClose = vi.fn();
    const editor = {
      commands: { setContent, setYoutubeVideo: youtube },
      getHTML: () => '<p>Original editor</p>',
    };
    mount({
      editor: editor as any,
      initialSourceTab: 'url',
      onInsert,
      onClose,
    });
    fireEvent.change(
      screen.getByPlaceholderText('https://example.com/article'),
      { target: { value: 'https://example.com/video' } },
    );
    fetchMock.mockResolvedValueOnce(
      reply({
        success: true,
        title: 'Video title',
        blocks: [
          { type: 'o4o/paragraph', content: 'Video description' },
          {
            type: 'o4o/youtube',
            attributes: { url: 'https://www.youtube.com/watch?v=sample' },
          },
        ],
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: /URL로 생성/ }));
    await screen.findByText('Video description');
    const init = request('/api/ai/url-to-blocks');
    expect(init.credentials).toBe('include');
    expect(init.headers).toMatchObject(headers);
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(JSON.parse(String(init.body))).toEqual({
      url: 'https://example.com/video',
      length: 'medium',
      tone: 'normal',
      customInstruction: '',
    });
    fireEvent.click(screen.getByRole('button', { name: '에디터에 삽입' }));
    expect(setContent).toHaveBeenCalledWith(expect.any(String), true);
    expect(youtube).toHaveBeenCalledWith({
      src: 'https://www.youtube.com/watch?v=sample',
    });
    expect(onInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Video title',
        sourceUrl: 'https://example.com/video',
      }),
    );
    expect(setContent.mock.invocationCallOrder[0]).toBeLessThan(
      onInsert.mock.invocationCallOrder[0],
    );
    expect(onInsert.mock.invocationCallOrder[0]).toBeLessThan(
      onClose.mock.invocationCallOrder[0],
    );
  });
  it('does not duplicate an already parsed YouTube embed', async () => {
    const youtube = vi.fn();
    mount({
      initialSourceTab: 'url',
      editor: {
        commands: { setContent: vi.fn(), setYoutubeVideo: youtube },
        getHTML: () => 'https://www.youtube.com/embed/sample',
      } as any,
    });
    fireEvent.change(
      screen.getByPlaceholderText('https://example.com/article'),
      { target: { value: 'https://example.com/video' } },
    );
    fetchMock.mockResolvedValueOnce(
      reply({
        success: true,
        blocks: [
          { type: 'o4o/paragraph', content: 'Video description' },
          {
            type: 'o4o/youtube',
            attributes: { url: 'https://www.youtube.com/watch?v=sample' },
          },
        ],
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: /URL로 생성/ }));
    await screen.findByText('Video description');
    fireEvent.click(screen.getByRole('button', { name: '에디터에 삽입' }));
    expect(youtube).not.toHaveBeenCalled();
  });
  it('preserves the 90-second URL timeout and clears loading without a second request', async () => {
    vi.useFakeTimers();
    mount({ initialSourceTab: 'url' });
    fireEvent.change(
      screen.getByPlaceholderText('https://example.com/article'),
      { target: { value: 'https://example.com/timeout' } },
    );
    fetchMock.mockImplementationOnce(
      (_url, init) =>
        new Promise((_resolve, reject) =>
          init.signal.addEventListener('abort', () =>
            reject(new DOMException('timeout', 'AbortError')),
          ),
        ),
    );
    fireEvent.click(screen.getByRole('button', { name: /URL로 생성/ }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(90000);
    });
    expect(screen.getByText(/URL 분석 시간이 초과되었습니다/)).toBeTruthy();
    expect(
      (screen.getByRole('button', { name: /URL로 생성/ }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('independent save controllers preserve business requests and result semantics', () => {
  it('keeps three panels independent and sends community blocks, title and chosen forum with authentication context', async () => {
    mount({
      showCommunitySave: true,
      showStoreSave: true,
      showProductionMaterialSave: true,
    });
    await generate();
    fetchMock.mockResolvedValueOnce(
      reply({
        success: true,
        data: [{ id: 'forum-one', name: 'First forum' }],
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: '커뮤니티 저장' }));
    await screen.findByRole('combobox');
    fireEvent.click(screen.getByRole('button', { name: '내 매장 저장' }));
    fireEvent.click(screen.getByRole('button', { name: '제작 자료로 저장' }));
    expect(
      screen.getByPlaceholderText('저장할 콘텐츠 제목을 입력하세요'),
    ).toBeTruthy();
    expect(
      screen.getByPlaceholderText('저장할 매장 제작 자료 제목을 입력하세요'),
    ).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText('게시글 제목을 입력하세요'), {
      target: { value: '  Forum draft  ' },
    });
    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'forum-one' },
    });
    fetchMock.mockResolvedValueOnce(
      reply({ success: true, data: { id: 'post-one' } }),
    );
    fireEvent.click(screen.getByRole('button', { name: '게시글 저장' }));
    await screen.findByText(/게시글이 저장되었습니다/);
    const init = request('/api/v1/forum/posts');
    expect(init.credentials).toBe('include');
    expect(init.headers).toMatchObject(headers);
    expect(JSON.parse(String(init.body))).toMatchObject({
      title: 'Forum draft',
      type: 'discussion',
      forumId: 'forum-one',
      content: [{ type: 'paragraph', content: 'Generated body' }],
    });
  });
  it('retains the forum catalog cache across close/reopen but clears the selected forum and saved receipt', async () => {
    const { props, rerender } = mount({ showCommunitySave: true });
    await generate();
    fetchMock.mockResolvedValueOnce(
      reply({
        success: true,
        data: [{ id: 'forum-one', name: 'First forum' }],
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: '커뮤니티 저장' }));
    await screen.findByText('First forum');
    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'forum-one' },
    });
    fireEvent.click(screen.getByRole('button', { name: '×' }));
    rerender(<AiContentModal {...props} open={false} />);
    rerender(<AiContentModal {...props} />);
    await generate();
    fireEvent.click(screen.getByRole('button', { name: '커뮤니티 저장' }));
    expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('');
    expect(
      fetchMock.mock.calls.filter(([url]) =>
        String(url).endsWith('/api/v1/forum/categories'),
      ),
    ).toHaveLength(1);
  });
  it('permits community save without a forum when the catalog fetch fails', async () => {
    mount({ showCommunitySave: true });
    await generate();
    fetchMock.mockRejectedValueOnce(new Error('catalog unavailable'));
    fireEvent.click(screen.getByRole('button', { name: '커뮤니티 저장' }));
    await waitFor(() =>
      expect(screen.queryByText('불러오는 중...')).toBeNull(),
    );
    fetchMock.mockResolvedValueOnce(reply({ success: true }));
    fireEvent.click(screen.getByRole('button', { name: '게시글 저장' }));
    await screen.findByText(/게시글이 저장되었습니다/);
    expect(
      JSON.parse(String(request('/api/v1/forum/posts').body)),
    ).not.toHaveProperty('forumId');
  });
  it('keeps store 403 semantics and permits retry while sending the original store payload', async () => {
    mount({ showStoreSave: true });
    await generate();
    fireEvent.click(screen.getByRole('button', { name: '내 매장 저장' }));
    fetchMock.mockResolvedValueOnce(reply({ success: false }, 403));
    fireEvent.click(
      screen.getByRole('button', { name: '매장에 저장', exact: true }),
    );
    await screen.findByText(/매장 소속이 없습니다/);
    fetchMock.mockResolvedValueOnce(
      reply({ success: true, data: { id: 'content-one' } }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: '매장에 저장', exact: true }),
    );
    await screen.findByText('내 매장 콘텐츠에 저장되었습니다 ✓');
    const init = request('/api/v1/kpa/store-contents');
    expect(init.credentials).toBe('include');
    expect(init.headers).toMatchObject(headers);
    expect(JSON.parse(String(init.body))).toMatchObject({
      title: 'Generated title',
      contentJson: [{ type: 'paragraph', content: 'Generated body' }],
    });
  });
  it.each([
    ['pop', 'pop'],
    ['store_qr', 'qr'],
    ['blog', null],
  ] as const)(
    'preserves production category %s, usageType and provenance; callback does not close the modal',
    async (initialMode, usageType) => {
      const saved = vi.fn();
      const { props } = mount({
        initialMode,
        showProductionMaterialSave: true,
        sourceMetadata: {
          sourceContentId: 'source-one',
          sourceOrigin: 'library',
        },
        templateId: 'template-one',
        onProductionMaterialSaved: saved,
      });
      await generate();
      fireEvent.click(
        screen.getByRole('button', { name: '제작 자료로 저장', exact: true }),
      );
      fireEvent.change(
        screen.getByPlaceholderText('저장할 매장 제작 자료 제목을 입력하세요'),
        { target: { value: '  Material draft  ' } },
      );
      fetchMock.mockResolvedValueOnce(
        reply({ success: true, data: { id: 'asset-one' } }, 201),
      );
      fireEvent.click(
        screen.getByRole('button', { name: '제작 자료로 저장', exact: true }),
      );
      await screen.findByText(/매장 제작 자료에 저장되었습니다/);
      const init = request('/api/v1/kpa/store/assets');
      expect(init.credentials).toBe('include');
      expect(init.headers).toMatchObject(headers);
      expect(JSON.parse(String(init.body))).toEqual({
        title: 'Material draft',
        description: generated.summary,
        assetType: 'content',
        htmlContent: generated.html,
        category: initialMode,
        usageType,
        sourceType: 'generated',
        sourceMetadata: {
          sourceContentId: 'source-one',
          sourceOrigin: 'library',
        },
        templateId: 'template-one',
      });
      expect(saved).toHaveBeenCalledWith('asset-one');
      expect(props.onClose).not.toHaveBeenCalled();
    },
  );
  it('prevents a second channel dispatch while pending and displays callback failure before retry', async () => {
    let complete!: (value: { success: boolean; error?: string }) => void;
    const onChannelSave = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            complete = resolve;
          }),
      )
      .mockResolvedValueOnce({ success: true, fieldLabel: 'Draft field' });
    mount({ onChannelSave });
    await generate();
    fireEvent.click(screen.getByRole('button', { name: '채널에 저장' }));
    fireEvent.click(screen.getByRole('button', { name: '저장 중...' }));
    expect(onChannelSave).toHaveBeenCalledTimes(1);
    await act(async () => {
      complete({ success: false, error: 'Channel unavailable' });
    });
    expect(screen.getByText('저장 실패: Channel unavailable')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '채널에 저장' }));
    await screen.findByText('저장 완료 — Draft field ✓');
    expect(onChannelSave).toHaveBeenLastCalledWith({
      outputType: 'pop',
      html: generated.html,
      title: generated.title,
      summary: generated.summary,
      mode: 'pop',
    });
  });
});

it('keeps a pending store request disabled after hiding and reopening its panel, without dispatching again', async () => {
  mount({ showStoreSave: true });
  await generate();
  fireEvent.click(screen.getByRole('button', { name: '내 매장 저장' }));
  let complete!: (value: unknown) => void;
  fetchMock.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        complete = resolve;
      }),
  );
  fireEvent.click(screen.getByRole('button', { name: '매장에 저장' }));
  fireEvent.click(screen.getByRole('button', { name: '내 매장 저장 ▲' }));
  fireEvent.click(screen.getByRole('button', { name: '내 매장 저장' }));
  fireEvent.click(screen.getByRole('button', { name: '저장 중...' }));
  expect(
    fetchMock.mock.calls.filter(([url]) =>
      String(url).endsWith('/api/v1/kpa/store-contents'),
    ),
  ).toHaveLength(1);
  await act(async () => {
    complete(reply({ success: true, data: { id: 'content-one' } }));
  });
  // Current main invalidates the hidden panel receipt while retaining the issued write.
  expect(screen.queryByText('내 매장 콘텐츠에 저장되었습니다 ✓')).toBeNull();
  expect((screen.getByRole('button', { name: '매장에 저장' }) as HTMLButtonElement).disabled).toBe(false);
  fetchMock.mockResolvedValueOnce(reply({ success: true, data: { id: 'content-two' } }));
  fireEvent.click(screen.getByRole('button', { name: '매장에 저장' }));
  await screen.findByText('내 매장 콘텐츠에 저장되었습니다 ✓');
  expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/api/v1/kpa/store-contents'))).toHaveLength(2);
});
it('preserves production 403 and completion-callback failure handling without repeating the successful server write', async () => {
  const callback = vi.fn(() => {
    throw new Error('Refresh unavailable');
  });
  mount({
    showProductionMaterialSave: true,
    onProductionMaterialSaved: callback,
  });
  await generate();
  fireEvent.click(
    screen.getByRole('button', { name: '제작 자료로 저장', exact: true }),
  );
  fetchMock.mockResolvedValueOnce(reply({ success: false }, 403));
  fireEvent.click(
    screen.getByRole('button', { name: '제작 자료로 저장', exact: true }),
  );
  await screen.findByText(/매장 경영자만 매장 제작 자료를 저장할 수 있습니다/);
  expect(callback).not.toHaveBeenCalled();
  fetchMock.mockResolvedValueOnce(
    reply({ success: true, data: { id: 'asset-one' } }, 201),
  );
  fireEvent.click(
    screen.getByRole('button', { name: '제작 자료로 저장', exact: true }),
  );
  await screen.findByText('저장 실패: Refresh unavailable');
  expect(callback).toHaveBeenCalledTimes(1);
  expect(
    fetchMock.mock.calls.filter(([url]) =>
      String(url).endsWith('/api/v1/kpa/store/assets'),
    ),
  ).toHaveLength(2);
  expect(
    (
      screen.getByRole('button', {
        name: '제작 자료로 저장',
        exact: true,
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(false);
});
it('sanitizes preview while preserving the original HTML for callback insertion and copying', async () => {
  const onInsert = vi.fn(),
    writeText = vi.fn(async () => {});
  const clipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  });
  try {
    mount({ onInsert });
    const html =
      '<p onclick="unsafe()">Safe visible body</p><script>unsafe()</script>';
    fetchMock.mockResolvedValueOnce(reply({ ...generated, html }));
    fireEvent.click(screen.getByRole('button', { name: /AI로 생성/ }));
    const preview = await screen.findByText('Safe visible body');
    expect(preview.getAttribute('onclick')).toBeNull();
    expect(preview.parentElement?.querySelector('script')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '복사' }));
    await screen.findByRole('button', { name: '복사됨 ✓' });
    expect(writeText).toHaveBeenCalledWith(html);
    fireEvent.click(screen.getByRole('button', { name: '에디터에 삽입' }));
    expect(onInsert).toHaveBeenCalledWith({
      html,
      title: generated.title,
      sourceUrl: undefined,
    });
  } finally {
    if (clipboard) Object.defineProperty(navigator, 'clipboard', clipboard);
    else delete (navigator as any).clipboard;
  }
});
