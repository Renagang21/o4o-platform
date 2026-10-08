import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import CommunityForumMembersPage from '../CommunityForumMembersPage';

const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('../../../lib/apiClient', () => ({ api: { get, post, delete: vi.fn() } }));

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  get.mockImplementation((path: string) => {
    const data = path.endsWith('/mine')
      ? [{ id: 'board', name: 'MEMBERS BOARD', forumType: 'closed' }]
      : path.endsWith('/join-requests')
        ? [{ id: 'request', user_id: 'applicant', user_name: 'APPLICANT', status: 'pending', created_at: '2026-10-08' }]
        : [];
    return Promise.resolve({ data: { success: true, data } });
  });
  post.mockResolvedValue({ data: { success: true } });
});

it('the real member-management form sends the entered rejection reason using the API contract field', async () => {
  render(<MemoryRouter initialEntries={['/communities/independent/forum/owned/board/members']}>
    <Routes><Route path="/communities/:communityKey/forum/owned/:forumId/members" element={<CommunityForumMembersPage basePath="/communities/independent/forum" />} /></Routes>
  </MemoryRouter>);
  await screen.findByText('APPLICANT');
  fireEvent.click(screen.getByRole('button', { name: '거절' }));
  fireEvent.change(screen.getByPlaceholderText(/거절 사유/), { target: { value: '  자격 증빙을 확인해 주세요.  ' } });
  fireEvent.click(screen.getByRole('button', { name: '거절 확인' }));
  await waitFor(() => expect(post).toHaveBeenCalledWith(
    '/communities/independent/forum/categories/board/join-requests/request/reject',
    { reviewComment: '자격 증빙을 확인해 주세요.' },
  ));
});
