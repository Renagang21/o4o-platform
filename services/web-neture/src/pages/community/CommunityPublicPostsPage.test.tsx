import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import CommunityPublicPostsPage from './CommunityPublicPostsPage';

afterEach(cleanup);
function Where() { return <output>{useLocation().pathname}</output>; }
const open = (path: string) => render(<MemoryRouter initialEntries={[path]}><Routes>
  <Route path="/communities/:communityKey/public" element={<CommunityPublicPostsPage />} />
  <Route path="/communities/:communityKey/public/post/:slug" element={<CommunityPublicPostsPage />} />
  <Route path="*" element={<Where />} />
</Routes></MemoryRouter>);

describe('retired public read addresses (2026-11-14 login-only community)', () => {
  it('sends the old public list to the member forum', () => {
    open('/communities/community/public');
    expect(screen.getByRole('status').textContent).toBe('/communities/community/forum');
  });
  it('sends an old public post link to the same post in the member forum', () => {
    open('/communities/community/public/post/hello-world');
    expect(screen.getByRole('status').textContent).toBe('/communities/community/forum/post/hello-world');
  });
});
