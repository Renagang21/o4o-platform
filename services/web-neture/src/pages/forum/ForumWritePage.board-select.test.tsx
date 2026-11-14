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

// 2026-11-14 커뮤니티 점검: 커뮤니티 글쓰기가 첫 번째 게시판에 자동으로 올라가던 문제.
const base = '/communities/community/forum';
const boards = [
  { id: 'first', slug: 'first', name: '자유게시판', tags: [] },
  { id: 'second', slug: 'second', name: '질문게시판', tags: [] },
];
function mount(search = '') {
  return render(
    <MemoryRouter initialEntries={[`${base}/write${search}`]}>
      <ForumWritePage communityLabel="커뮤니티" categorySlug="" backPath={base} />
    </MemoryRouter>,
  );
}
function fill() {
  fireEvent.change(screen.getByPlaceholderText('제목을 입력하시기 바랍니다'), { target: { value: '재고 관리 문의' } });
  fireEvent.change(screen.getByLabelText('본문'), { target: { value: '<p>재고를 어떻게 관리하시나요 궁금합니다</p>' } });
}
beforeEach(() => {
  vi.resetAllMocks();
  m.contacts.mockResolvedValue(null);
  m.status.mockResolvedValue({ available: false, reason: 'AI_DISABLED', dailyLimit: 0, remainingToday: 0 });
  m.categories.mockResolvedValue({ data: boards });
  m.create.mockResolvedValue({ success: true, data: { slug: 'created' } });
});
afterEach(cleanup);

describe('community write chooses the board', () => {
  it('does not post to the first board by itself; the member picks one', async () => {
    mount();
    const select = await screen.findByLabelText('게시할 게시판') as HTMLSelectElement;
    await screen.findByRole('option', { name: '질문게시판' });
    expect(select.value).toBe('');
    fill();
    fireEvent.click(screen.getByRole('button', { name: '등록하기' }));
    expect(await screen.findByText('글을 올릴 게시판을 선택해 주시기 바랍니다.')).toBeTruthy();
    expect(m.create).not.toHaveBeenCalled();
    fireEvent.change(select, { target: { value: 'second' } });
    fireEvent.click(screen.getByRole('button', { name: '등록하기' }));
    await waitFor(() => expect(m.create).toHaveBeenCalledWith(expect.objectContaining({ forumId: 'second' })));
  });
  it('opens with the board already chosen when it came from a board (?forum=) or only one exists', async () => {
    mount('?forum=second');
    await waitFor(() => expect((screen.getByLabelText('게시할 게시판') as HTMLSelectElement).value).toBe('second'));
    cleanup();
    m.categories.mockResolvedValue({ data: [boards[0]] });
    mount();
    await waitFor(() => expect((screen.getByLabelText('게시할 게시판') as HTMLSelectElement).value).toBe('first'));
  });
});
