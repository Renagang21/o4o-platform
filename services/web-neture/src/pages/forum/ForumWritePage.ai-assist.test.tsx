import { afterEach, beforeEach, expect, it, vi, describe } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const m = vi.hoisted(() => ({
  categories: vi.fn(),
  contacts: vi.fn(),
  create: vi.fn(),
  status: vi.fn(),
  compose: vi.fn(),
  similar: vi.fn(),
  similarAi: vi.fn(),
  library: vi.fn(),
  read: vi.fn(),
}));
vi.mock('../../contexts', () => ({
  useAuth: () => ({ isAuthenticated: true, user: { id: 'author' } }),
  useLoginModal: () => ({ openLoginModal: vi.fn() }),
}));
vi.mock('../../lib/api', () => ({ supplierApi: { getLibraryItem: m.library } }));
vi.mock('../../services/forumApi', () => ({
  fetchForumPostBySlug: m.read,
  fetchForumCategories: m.categories,
  fetchUserContactSettings: m.contacts,
  updateForumPost: vi.fn(),
  createForumPost: m.create,
}));
vi.mock('../../lib/apiClient', () => ({ api: { get: vi.fn(), post: vi.fn() } }));
vi.mock('../../services/forumAiApi', async (actual) => ({
  ...(await actual<typeof import('../../services/forumAiApi')>()),
  fetchForumAiStatus: m.status,
  requestForumComposeAssist: m.compose,
  fetchSimilarForumPosts: m.similar,
  searchSimilarForumPostsWithAi: m.similarAi,
}));
vi.mock('@o4o/content-editor', () => ({
  RichTextEditor: ({ value, onChange }: { value: string; onChange: (v: { html: string }) => void }) => (
    <textarea aria-label="본문" value={value} onChange={(e) => onChange({ html: e.target.value })} />
  ),
  ContentRenderer: () => null,
}));

import { ForumWritePage } from './ForumWritePage';
import { forumHtmlToText, forumTextToHtml } from './ForumAiAssist';

const base = '/communities/community/forum';
const on = { available: true, reason: null, dailyLimit: 10, remainingToday: 10 };
const suggestion = {
  titles: ['제목 후보 일', '제목 후보 이', '제목 후보 삼'],
  body: { suggestion: '다듬은 본문입니다 <b>굵게</b>', note: '문장을 다듬었습니다' },
  tags: ['재고', '운영'],
  board: { id: 'second', name: '질문게시판', reason: '질문 글입니다' },
};

function mount(props: Record<string, unknown> = { aiAssist: true }, search = '') {
  return render(
    <MemoryRouter initialEntries={[`${base}/write${search}`]}>
      <ForumWritePage communityLabel="커뮤니티" categorySlug="" backPath={base} {...props} />
    </MemoryRouter>,
  );
}
const titleInput = () => screen.getByPlaceholderText('제목을 입력하시기 바랍니다') as HTMLInputElement;
const bodyInput = () => screen.getByLabelText('본문') as HTMLTextAreaElement;
function fill(title = '재고 관리 문의', body = '<p>재고를 어떻게 관리하시나요</p>') {
  fireEvent.change(titleInput(), { target: { value: title } });
  fireEvent.change(bodyInput(), { target: { value: body } });
}
async function openSuggestions() {
  await waitFor(() => expect((screen.getByRole('button', { name: 'AI 도움 받기' }) as HTMLButtonElement).disabled).toBe(true));
  fill();
  await waitFor(() => expect((screen.getByRole('button', { name: 'AI 도움 받기' }) as HTMLButtonElement).disabled).toBe(false));
  fireEvent.click(screen.getByRole('button', { name: 'AI 도움 받기' }));
  await screen.findByText('제목 후보');
}

beforeEach(() => {
  vi.resetAllMocks();
  m.contacts.mockResolvedValue(null);
  m.categories.mockResolvedValue({ data: [
    { id: 'first', slug: 'first', name: '자유게시판', tags: [] },
    { id: 'second', slug: 'second', name: '질문게시판', tags: [] },
  ] });
  m.status.mockResolvedValue(on);
  m.compose.mockResolvedValue(suggestion);
  m.similar.mockResolvedValue({ source: 'keyword', keywords: [], posts: [], enough: false });
  m.create.mockResolvedValue({ success: true, data: { slug: 'created' } });
});
afterEach(cleanup);

describe('writing assistant', () => {
  it('never calls AI on its own while typing', async () => {
    mount();
    fill();
    await new Promise((resolve) => setTimeout(resolve, 700));
    expect(m.compose).not.toHaveBeenCalled();
    expect(m.similarAi).not.toHaveBeenCalled();
  });
  it('sends plain text with the current board on request and changes nothing by itself', async () => {
    mount();
    await openSuggestions();
    expect(m.compose).toHaveBeenCalledTimes(1);
    expect(m.compose).toHaveBeenCalledWith({ title: '재고 관리 문의', body: '재고를 어떻게 관리하시나요', forumId: 'first' });
    expect(titleInput().value).toBe('재고 관리 문의');
    expect(bodyInput().value).toBe('<p>재고를 어떻게 관리하시나요</p>');
    expect(m.create).not.toHaveBeenCalled();
  });
  it('applies each item only when chosen, escaping the body, and publishing stays on the form button', async () => {
    mount();
    await openSuggestions();
    fireEvent.click(screen.getByRole('button', { name: '제목 적용: 제목 후보 이' }));
    await waitFor(() => expect(titleInput().value).toBe('제목 후보 이'));
    expect(bodyInput().value).toBe('<p>재고를 어떻게 관리하시나요</p>');

    fireEvent.click(screen.getByRole('button', { name: '본문에 적용' }));
    await waitFor(() => expect(bodyInput().value).toBe('<p>다듬은 본문입니다 &lt;b&gt;굵게&lt;/b&gt;</p>'));
    fireEvent.click(screen.getByRole('button', { name: '적용 취소' }));
    await waitFor(() => expect(bodyInput().value).toBe('<p>재고를 어떻게 관리하시나요</p>'));

    fireEvent.click(screen.getByRole('button', { name: '#재고 추가' }));
    fireEvent.click(screen.getByRole('button', { name: '이 게시판으로 변경' }));
    await screen.findByRole('button', { name: '선택됨' });
    expect(m.create).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: '등록하기' }));
    await waitFor(() => expect(m.create).toHaveBeenCalledTimes(1));
    expect(m.create.mock.calls[0][0]).toMatchObject({ title: '제목 후보 이', forumId: 'second', tags: ['재고'] });
  });
  it('undo returns to the original after repeated applies and a new suggestion', async () => {
    mount();
    await openSuggestions();
    const applied = '<p>다듬은 본문입니다 &lt;b&gt;굵게&lt;/b&gt;</p>';
    fireEvent.click(screen.getByRole('button', { name: '본문에 적용' }));
    await waitFor(() => expect(bodyInput().value).toBe(applied));
    fireEvent.click(screen.getByRole('button', { name: '본문에 적용' }));
    await waitFor(() => expect(bodyInput().value).toBe(applied));

    fireEvent.click(screen.getByRole('button', { name: 'AI 도움 받기' }));
    await waitFor(() => expect(m.compose).toHaveBeenCalledTimes(2));
    await screen.findByText('제목 후보');

    fireEvent.click(screen.getByRole('button', { name: '적용 취소' }));
    await waitFor(() => expect(bodyInput().value).toBe('<p>재고를 어떻게 관리하시나요</p>'));
    expect(screen.queryByRole('button', { name: '적용 취소' })).toBeNull();
  });
  it('an unchosen suggestion does not reach the post', async () => {
    mount();
    await openSuggestions();
    fireEvent.click(screen.getByRole('button', { name: '등록하기' }));
    await waitFor(() => expect(m.create).toHaveBeenCalledTimes(1));
    expect(m.create.mock.calls[0][0].title).toBe('재고 관리 문의');
    expect(m.create.mock.calls[0][0].forumId).toBe('first');
    expect(m.create.mock.calls[0][0].tags).toBeUndefined();
  });
});

describe('AI off and limits', () => {
  it.each([
    ['AI_DISABLED', /꺼져 있습니다/],
    ['AI_DAILY_LIMIT_EXCEEDED', /횟수를 모두 사용/],
    ['AI_QUOTA_EXCEEDED', /한도에 도달/],
  ])('%s disables the button, says why, and writing still publishes', async (reason, text) => {
    m.status.mockResolvedValue({ available: false, reason, dailyLimit: 10, remainingToday: 0 });
    mount();
    await screen.findByText(text);
    fill();
    expect((screen.getByRole('button', { name: 'AI 도움 받기' }) as HTMLButtonElement).disabled).toBe(true);
    await waitFor(() => expect(m.similar).toHaveBeenCalledWith('재고 관리 문의'), { timeout: 2000 });
    fireEvent.click(screen.getByRole('button', { name: '등록하기' }));
    await waitFor(() => expect(m.create).toHaveBeenCalledTimes(1));
    expect(m.compose).not.toHaveBeenCalled();
  });
  it('a status failure closes AI without blocking the form', async () => {
    m.status.mockRejectedValue(new Error('down'));
    mount();
    await screen.findByText(/지금 사용할 수 없습니다/);
    fill();
    fireEvent.click(screen.getByRole('button', { name: '등록하기' }));
    await waitFor(() => expect(m.create).toHaveBeenCalledTimes(1));
  });
  it('a refusal at request time keeps the draft and closes the button', async () => {
    m.compose.mockRejectedValue({ response: { data: { code: 'AI_DAILY_LIMIT_EXCEEDED' } } });
    mount();
    fill();
    await waitFor(() => expect((screen.getByRole('button', { name: 'AI 도움 받기' }) as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(screen.getByRole('button', { name: 'AI 도움 받기' }));
    expect((await screen.findAllByText(/횟수를 모두 사용/)).length).toBeGreaterThan(0);
    expect(titleInput().value).toBe('재고 관리 문의');
    expect((screen.getByRole('button', { name: 'AI 도움 받기' }) as HTMLButtonElement).disabled).toBe(true);
  });
  it('over-long text is refused on the client with the cap explained', async () => {
    mount();
    fill('재고 관리', `<p>${'가'.repeat(4001)}</p>`);
    await screen.findByText(/4,000자까지/);
    expect((screen.getByRole('button', { name: 'AI 도움 받기' }) as HTMLButtonElement).disabled).toBe(true);
  });
  it('AI output that the server rejected is not shown', async () => {
    m.compose.mockRejectedValue({ response: { data: { code: 'AI_OUTPUT_INVALID' } } });
    mount();
    fill();
    await waitFor(() => expect((screen.getByRole('button', { name: 'AI 도움 받기' }) as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(screen.getByRole('button', { name: 'AI 도움 받기' }));
    await screen.findByText(/표시하지 않았습니다/);
    expect(screen.queryByText('제목 후보')).toBeNull();
  });
});

describe('similar posts', () => {
  it('debounces, opens results in a new tab, and keeps the draft', async () => {
    m.similar.mockResolvedValue({ source: 'keyword', keywords: ['재고'], enough: false, posts: [
      { id: 'p', title: '재고 관리 사례', slug: 'stock case', excerpt: '', forumId: 'first', forumName: '자유게시판', createdAt: '2026-11-01' },
    ] });
    mount();
    fireEvent.change(titleInput(), { target: { value: '재' } });
    fireEvent.change(titleInput(), { target: { value: '재고' } });
    fireEvent.change(titleInput(), { target: { value: '재고 관리' } });
    const link = await screen.findByRole('link', { name: '재고 관리 사례' }, { timeout: 2000 });
    expect(m.similar).toHaveBeenCalledTimes(1);
    expect(m.similar).toHaveBeenCalledWith('재고 관리');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
    expect(link.getAttribute('href')).toBe(`${base}/post/stock%20case`);
    expect(titleInput().value).toBe('재고 관리');
  });
  it('asks AI only on "더 찾기"; a failure keeps the keyword results', async () => {
    m.similar.mockResolvedValue({ source: 'keyword', keywords: ['재고'], enough: false, posts: [
      { id: 'p', title: '재고 글', slug: 's', excerpt: '', forumId: 'first', forumName: '', createdAt: '2026-11-01' },
    ] });
    m.similarAi.mockRejectedValue({ response: { data: { code: 'AI_DISABLED' } } });
    mount();
    fireEvent.change(titleInput(), { target: { value: '재고 관리' } });
    await screen.findByRole('link', { name: '재고 글' }, { timeout: 2000 });
    expect(m.similarAi).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'AI로 더 찾기' }));
    await screen.findByText(/꺼져 있습니다/);
    expect(m.similarAi).toHaveBeenCalledWith('재고 관리');
    expect(screen.getByRole('link', { name: '재고 글' })).toBeTruthy();
  });
  it('a search failure stays silent and does not touch the form', async () => {
    m.similar.mockRejectedValue(new Error('down'));
    mount();
    fireEvent.change(titleInput(), { target: { value: '재고 관리' } });
    await waitFor(() => expect(m.similar).toHaveBeenCalled(), { timeout: 2000 });
    expect(screen.queryByLabelText('비슷한 글')).toBeNull();
    expect(titleInput().value).toBe('재고 관리');
  });
});

describe('scope', () => {
  it('stays off without the flag, in edit mode, and for library publishing', async () => {
    mount({});
    expect(screen.queryByRole('button', { name: 'AI 도움 받기' })).toBeNull();
    expect(m.status).not.toHaveBeenCalled();
    cleanup();
    m.library.mockResolvedValue({ title: '자료', blocks: [], description: '자료 설명' });
    mount({ aiAssist: true }, '?library=lib-1');
    await screen.findByDisplayValue('자료');
    expect(screen.queryByRole('button', { name: 'AI 도움 받기' })).toBeNull();
    expect(m.status).not.toHaveBeenCalled();
    cleanup();
    m.read.mockResolvedValue({ success: true, data: { title: '기존 글', slug: 'a', authorId: 'author', content: '<p>기존</p>', status: 'publish' } });
    mount({ aiAssist: true }, '?edit=a');
    await screen.findByDisplayValue('기존 글');
    expect(screen.queryByRole('button', { name: 'AI 도움 받기' })).toBeNull();
    expect(m.status).not.toHaveBeenCalled();
    expect(m.similar).not.toHaveBeenCalled();
  });
});

describe('text conversion', () => {
  it('does not execute or load anything from a draft', () => {
    expect(forumHtmlToText('<p>첫 줄</p><p>둘째 <b>줄</b></p><img src=x onerror=alert(1)>')).toBe('첫 줄\n둘째 줄');
    expect(forumTextToHtml('a<b>\n\nc&d')).toBe('<p>a&lt;b&gt;</p><p>c&amp;d</p>');
  });
});
