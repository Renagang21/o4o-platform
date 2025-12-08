/**
 * Category Archive Template
 *
 * Public-facing template for displaying posts in a specific category.
 * Includes category info, subcategories, and post list.
 */

import React from 'react';
import type { Block } from '@o4o/types';
import { PostListTemplate } from './PostList.js';
import type { ForumPostSummary, PostListPagination } from './PostList.js';

export interface ForumCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  postCount: number;
  parentId?: string;
  children?: ForumCategory[];
}

export interface CategoryArchiveData {
  category: ForumCategory;
  subcategories?: ForumCategory[];
  posts: ForumPostSummary[];
  pinnedPosts?: ForumPostSummary[];
  pagination: PostListPagination;
  breadcrumbs?: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
}

export interface CategoryArchiveTemplateProps {
  data: CategoryArchiveData;
  onPostClick?: (post: ForumPostSummary) => void;
  onSubcategoryClick?: (category: ForumCategory) => void;
  onBreadcrumbClick?: (categoryId: string) => void;
  onPageChange?: (page: number) => void;
  view?: 'list' | 'compact' | 'card';
  className?: string;
}

/**
 * Category Header Component
 */
const CategoryHeader: React.FC<{
  category: ForumCategory;
}> = ({ category }) => (
  <div className="category-header bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
    <div className="flex items-start gap-4">
      {category.icon && (
        <div
          className="category-icon w-16 h-16 rounded-xl flex items-center justify-center text-white text-2xl flex-shrink-0"
          style={{ backgroundColor: category.color || '#3B82F6' }}
        >
          {category.icon}
        </div>
      )}
      <div className="flex-1">
        <h1 className="text-2xl font-bold text-gray-900">{category.name}</h1>
        {category.description && (
          <p className="text-gray-600 mt-2">{category.description}</p>
        )}
        <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {category.postCount}개의 게시글
          </span>
        </div>
      </div>
    </div>
  </div>
);

/**
 * Breadcrumbs Component
 */
const Breadcrumbs: React.FC<{
  items: CategoryArchiveData['breadcrumbs'];
  currentCategory: ForumCategory;
  onClick?: (categoryId: string) => void;
}> = ({ items, currentCategory, onClick }) => (
  <nav className="breadcrumbs flex items-center gap-2 text-sm text-gray-500 mb-4">
    <span
      className="hover:text-blue-600 cursor-pointer"
      onClick={() => onClick?.('')}
    >
      포럼
    </span>
    {items?.map((item) => (
      <React.Fragment key={item.id}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span
          className="hover:text-blue-600 cursor-pointer"
          onClick={() => onClick?.(item.id)}
        >
          {item.name}
        </span>
      </React.Fragment>
    ))}
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
    <span className="text-gray-900 font-medium">{currentCategory.name}</span>
  </nav>
);

/**
 * Subcategories Grid Component
 */
const SubcategoriesGrid: React.FC<{
  subcategories: ForumCategory[];
  onClick?: (category: ForumCategory) => void;
}> = ({ subcategories, onClick }) => {
  if (subcategories.length === 0) return null;

  return (
    <section className="subcategories mb-6">
      <h2 className="text-lg font-bold text-gray-900 mb-3">하위 카테고리</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {subcategories.map((category) => (
          <div
            key={category.id}
            className="subcategory-card bg-white rounded-lg border border-gray-200 p-3 hover:shadow-sm transition-shadow cursor-pointer"
            onClick={() => onClick?.(category)}
          >
            <div className="flex items-center gap-2">
              {category.icon && (
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm"
                  style={{ backgroundColor: category.color || '#3B82F6' }}
                >
                  {category.icon}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 truncate">{category.name}</h3>
                <p className="text-xs text-gray-500">{category.postCount}개</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

/**
 * Category Actions Bar
 */
const CategoryActions: React.FC<{
  view: 'list' | 'compact' | 'card';
  onViewChange?: (view: 'list' | 'compact' | 'card') => void;
  onNewPost?: () => void;
}> = ({ view, onViewChange, onNewPost }) => (
  <div className="category-actions flex items-center justify-between mb-4">
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-500">보기:</span>
      <div className="flex bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => onViewChange?.('list')}
          className={`px-3 py-1 rounded text-sm ${
            view === 'list'
              ? 'bg-white shadow text-gray-900'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          목록
        </button>
        <button
          onClick={() => onViewChange?.('compact')}
          className={`px-3 py-1 rounded text-sm ${
            view === 'compact'
              ? 'bg-white shadow text-gray-900'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          간략
        </button>
        <button
          onClick={() => onViewChange?.('card')}
          className={`px-3 py-1 rounded text-sm ${
            view === 'card'
              ? 'bg-white shadow text-gray-900'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          카드
        </button>
      </div>
    </div>
    <button
      onClick={onNewPost}
      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
      글쓰기
    </button>
  </div>
);

/**
 * Category Archive Template
 *
 * Main component for displaying a category's posts.
 */
export const CategoryArchiveTemplate: React.FC<CategoryArchiveTemplateProps> = ({
  data,
  onPostClick,
  onSubcategoryClick,
  onBreadcrumbClick,
  onPageChange,
  view: initialView = 'list',
  className = '',
}) => {
  const [view, setView] = React.useState(initialView);

  return (
    <div className={`category-archive ${className}`}>
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={data.breadcrumbs}
        currentCategory={data.category}
        onClick={onBreadcrumbClick}
      />

      {/* Category Header */}
      <CategoryHeader category={data.category} />

      {/* Subcategories */}
      {data.subcategories && (
        <SubcategoriesGrid
          subcategories={data.subcategories}
          onClick={onSubcategoryClick}
        />
      )}

      {/* Actions Bar */}
      <CategoryActions
        view={view}
        onViewChange={setView}
      />

      {/* Posts List */}
      <PostListTemplate
        data={{
          posts: data.posts,
          pinnedPosts: data.pinnedPosts,
          pagination: data.pagination,
        }}
        onPostClick={onPostClick}
        onPageChange={onPageChange}
        view={view}
        showCategory={false}
      />
    </div>
  );
};

export default CategoryArchiveTemplate;
