/**
 * ForumTagView - Forum Tag Page Component
 *
 * Displays posts filtered by tag.
 * Uses CSS variables for theming (cosmetics theme support).
 */

'use client';

import { useParams } from 'react-router-dom';
import { ForumListView } from './ForumListView';

interface ForumTagViewProps {
  postsPerPage?: number;
  viewMode?: 'list' | 'card';
  showSidebar?: boolean;
}

export function ForumTagView({
  postsPerPage = 20,
  viewMode = 'list',
  showSidebar = true,
}: ForumTagViewProps) {
  const { slug } = useParams<{ slug: string }>();

  return (
    <div className="forum-tag py-6">
      {/* Tag Header */}
      <header
        className="rounded-lg border p-6 mb-6"
        style={{
          backgroundColor: 'var(--forum-bg-primary)',
          borderColor: 'var(--forum-border-light)',
        }}
      >
        <div className="flex items-center gap-2">
          <span className="text-2xl">#</span>
          <h1
            className="text-2xl font-bold"
            style={{ color: 'var(--forum-text-primary)' }}
          >
            {slug}
          </h1>
        </div>
        <p className="mt-2" style={{ color: 'var(--forum-text-muted)' }}>
          태그가 포함된 게시글
        </p>
      </header>

      {/* Post List */}
      <ForumListView
        tagSlug={slug}
        postsPerPage={postsPerPage}
        viewMode={viewMode}
        showFilter={true}
        showSidebar={showSidebar}
      />
    </div>
  );
}

export default ForumTagView;
