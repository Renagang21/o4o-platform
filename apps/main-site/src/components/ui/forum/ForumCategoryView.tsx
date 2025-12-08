/**
 * ForumCategoryView - Forum Category Page Component
 *
 * Displays posts filtered by category with category info header.
 * Uses CSS variables for theming (cosmetics theme support).
 */

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getForumCategory, type ForumCategory } from '@/lib/cms/client';
import { ForumListView } from './ForumListView';

interface ForumCategoryViewProps {
  postsPerPage?: number;
  viewMode?: 'list' | 'card';
  showSidebar?: boolean;
}

export function ForumCategoryView({
  postsPerPage = 20,
  viewMode = 'list',
  showSidebar = true,
}: ForumCategoryViewProps) {
  const { slug } = useParams<{ slug: string }>();
  const [category, setCategory] = useState<ForumCategory | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCategory() {
      if (!slug) return;

      setLoading(true);
      try {
        const data = await getForumCategory(slug);
        setCategory(data);
      } catch (error) {
        console.error('Error loading category:', error);
      } finally {
        setLoading(false);
      }
    }

    loadCategory();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--forum-primary)]"></div>
      </div>
    );
  }

  return (
    <div className="forum-category py-6">
      {/* Category Header */}
      {category && (
        <header
          className="rounded-lg border p-6 mb-6"
          style={{
            backgroundColor: 'var(--forum-bg-primary)',
            borderColor: 'var(--forum-border-light)',
          }}
        >
          <div className="flex items-start gap-4">
            {category.icon && (
              <div
                className="w-16 h-16 rounded-lg flex items-center justify-center text-white text-2xl"
                style={{ backgroundColor: category.color || 'var(--forum-primary)' }}
              >
                {category.icon}
              </div>
            )}
            <div className="flex-1">
              <h1
                className="text-2xl font-bold mb-2"
                style={{ color: 'var(--forum-text-primary)' }}
              >
                {category.name}
              </h1>
              {category.description && (
                <p style={{ color: 'var(--forum-text-secondary)' }}>{category.description}</p>
              )}
              <p className="text-sm mt-2" style={{ color: 'var(--forum-text-muted)' }}>
                {category.postCount}개의 게시글
              </p>
            </div>
          </div>
        </header>
      )}

      {/* Post List */}
      <ForumListView
        categorySlug={slug}
        postsPerPage={postsPerPage}
        viewMode={viewMode}
        showFilter={true}
        showSidebar={showSidebar}
      />
    </div>
  );
}

export default ForumCategoryView;
