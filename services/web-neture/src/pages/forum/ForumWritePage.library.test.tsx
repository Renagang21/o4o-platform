import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ForumWritePage } from './ForumWritePage';

const m = vi.hoisted(() => ({ get: vi.fn(), create: vi.fn(), categories: vi.fn(), contacts: vi.fn() }));
vi.mock('../../lib/api', () => ({ supplierApi: { getLibraryItem: m.get } }));
vi.mock('../../contexts', () => ({ useAuth: () => ({ isAuthenticated: true, user: { id: 'actor' } }), useLoginModal: () => ({ openLoginModal: vi.fn() }) }));
vi.mock('../../services/forumApi', () => ({ createForumPost: m.create, fetchForumCategories: m.categories, fetchUserContactSettings: m.contacts, extractTextContent: vi.fn(), updateForumPost: vi.fn(), fetchForumPostBySlug: vi.fn() }));
vi.mock('@o4o/forum-core/utils', () => ({ htmlToBlocks: (html: string) => [{ type: 'html', content: html }] }));
vi.mock('@o4o/shared-space-ui', () => ({ ForumWriteForm: (p: { initialTitle: string; initialContentHtml: string; onSubmit: (v: unknown) => void }) => <div>
  <p data-testid="copy-title">{p.initialTitle}</p><p data-testid="copy-body">{p.initialContentHtml}</p>
  <button onClick={() => p.onSubmit({ title: p.initialTitle, editorHtml: p.initialContentHtml })}>게시 제출</button>
</div> }));
beforeEach(() => {
  vi.resetAllMocks();
  m.get.mockResolvedValue({ title: '자료 제목', description: '비공개 요약', blocks: [{ type: 'html', content: '<p>게시할 내용입니다</p>' }], fileUrl: 'https://example.test/private.pdf' });
  m.categories.mockResolvedValue({ data: [{ id: 'board-a', slug: 'news', name: '소식 게시판', tags: [] }] });
  m.contacts.mockResolvedValue(null);
  m.create.mockResolvedValue({ success: true, data: { slug: 'new-post' } });
});
afterEach(cleanup);
function mount() { return render(<MemoryRouter initialEntries={['/communities/community/forum/write?library=source-a']}><ForumWritePage communityLabel="커뮤니티" backPath="/communities/community/forum" /></MemoryRouter>); }

it('loads an editable text copy without auto-posting or copying file links', async () => {
  mount(); await screen.findByTestId('copy-body');
  expect(screen.getByTestId('copy-body').textContent).toBe('<p>게시할 내용입니다</p>');
  expect(screen.getByTestId('copy-body').textContent).not.toContain('private.pdf');
  expect((screen.getByLabelText('게시할 게시판') as HTMLSelectElement).value).toBe('');
  expect(m.create).not.toHaveBeenCalled();
});
it('requires disclosure confirmation and explicit board selection before posting', async () => {
  mount(); await screen.findByTestId('copy-body');
  fireEvent.click(screen.getByRole('button', { name: '게시 제출' }));
  expect(m.create).not.toHaveBeenCalled();
  fireEvent.click(screen.getByLabelText(/선택한 커뮤니티의 공개 범위/));
  fireEvent.click(screen.getByRole('button', { name: '게시 제출' }));
  expect(m.create).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('게시할 게시판'), { target: { value: 'board-a' } });
  fireEvent.click(screen.getByRole('button', { name: '게시 제출' }));
  await waitFor(() => expect(m.create).toHaveBeenCalledOnce());
  expect(m.create.mock.calls[0][0]).toMatchObject({ forumId: 'board-a', title: '자료 제목' });
});
it('blocks posting if the source cannot be read', async () => {
  m.get.mockRejectedValue(new Error('404'));
  mount(); await screen.findByText(/원본 자료를 불러오지 못했습니다/);
  fireEvent.click(screen.getByLabelText(/선택한 커뮤니티의 공개 범위/));
  fireEvent.click(screen.getByRole('button', { name: '게시 제출' }));
  expect(m.create).not.toHaveBeenCalled();
});

it('keeps paragraph/list separators and decoded entities in the editable copy', async () => {
  m.get.mockResolvedValue({ title: '자료 제목', blocks: [{ content: '<p>First &amp; A</p><p>Second &#x1F600;</p><ul><li>One</li><li>Two</li></ul>' }] });
  mount(); await screen.findByTestId('copy-body');
  expect(screen.getByTestId('copy-body').textContent).toBe('<p>First &amp; A</p><p>Second 😀</p><p>One</p><p>Two</p>');
});
