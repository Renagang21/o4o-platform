/**
 * YaksaForumCategory - Category Detail Page
 *
 * Shows category information with subcategories.
 */

'use client';

import { useState, useEffect } from 'react';
import {
  YaksaCategoryList,
  yaksaStyles,
  applyYaksaTheme,
} from '@/components/yaksa/forum';
import {
  fetchYaksaCategories,
  fetchYaksaUserProfile,
  type YaksaCategory,
  type YaksaUser,
} from '@/lib/yaksa/forum-data';

interface YaksaForumCategoryProps {
  orgId: string;
  categorySlug: string;
}

export function YaksaForumCategory({
  orgId,
  categorySlug,
}: YaksaForumCategoryProps) {
  const [categories, setCategories] = useState<YaksaCategory[]>([]);
  const [currentCategory, setCurrentCategory] = useState<YaksaCategory | null>(null);
  const [user, setUser] = useState<YaksaUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    applyYaksaTheme();
  }, []);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [cats, userData] = await Promise.all([
          fetchYaksaCategories(orgId),
          fetchYaksaUserProfile(),
        ]);
        setCategories(cats);
        setUser(userData);

        const category = cats.find((c) => c.slug === categorySlug);
        setCurrentCategory(category || null);
      } catch (error) {
        console.error('Error loading category:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [orgId, categorySlug]);

  if (loading) {
    return <CategoryLoading />;
  }

  if (!currentCategory) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p style={yaksaStyles.textMuted}>카테고리를 찾을 수 없습니다.</p>
          <a
            href="/yaksa/forum"
            className="mt-4 inline-block px-4 py-2 rounded"
            style={yaksaStyles.buttonPrimary}
          >
            홈으로 돌아가기
          </a>
        </div>
      </div>
    );
  }

  // Get child categories
  const childCategories = categories.filter(
    (c) => c.parentId === currentCategory.id
  );

  return (
    <div
      className="yaksa-forum-category min-h-screen"
      style={{ backgroundColor: 'var(--yaksa-surface-secondary)' }}
    >
      {/* Header */}
      <header
        className="border-b shadow-sm"
        style={{
          backgroundColor: 'var(--yaksa-primary)',
          borderColor: 'var(--yaksa-primary-dark)',
        }}
      >
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4 mb-4">
            <a href="/yaksa/forum" className="text-white hover:opacity-80">
              ← 홈
            </a>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-4xl">{currentCategory.icon || '📁'}</span>
            <div>
              <h1 className="text-2xl font-bold text-white">
                {currentCategory.name}
              </h1>
              {currentCategory.description && (
                <p className="text-blue-100 mt-1">{currentCategory.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4 mt-4 text-blue-100">
            <span>게시글 {currentCategory.postCount}개</span>
            {currentCategory.isPrivate && (
              <span className="px-2 py-0.5 rounded text-xs bg-blue-800">
                🔒 비공개
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Child Categories */}
        {childCategories.length > 0 && (
          <section
            className="p-4 rounded-lg border mb-6"
            style={{
              backgroundColor: 'var(--yaksa-surface)',
              borderColor: 'var(--yaksa-border)',
            }}
          >
            <h2 className="text-lg font-semibold mb-4" style={yaksaStyles.textPrimary}>
              하위 게시판
            </h2>
            <YaksaCategoryList
              categories={childCategories}
              userRole={user?.role || 'guest'}
            />
          </section>
        )}

        {/* View Posts Button */}
        <div className="text-center">
          <a
            href={`/yaksa/forum/posts?orgId=${orgId}&category=${categorySlug}`}
            className="inline-block px-6 py-3 rounded-lg font-medium"
            style={yaksaStyles.buttonPrimary}
          >
            게시글 보기 →
          </a>
        </div>
      </main>
    </div>
  );
}

function CategoryLoading() {
  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: 'var(--yaksa-surface-secondary)' }}
    >
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="animate-pulse">
          <div className="h-32 bg-gray-200 rounded mb-6"></div>
          <div className="h-48 bg-gray-200 rounded"></div>
        </div>
      </div>
    </div>
  );
}

export default YaksaForumCategory;
