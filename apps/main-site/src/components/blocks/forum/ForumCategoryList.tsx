/**
 * ForumCategoryList Block Renderer
 *
 * Renders forum categories in a grid layout.
 * Uses injected data from CMSBlockWrapper.
 * Styled with CMS Theme tokens (CSS variables).
 */

'use client';

import { BlockRendererProps } from '../BlockRenderer';
import { forumStyles } from './theme';

interface ForumCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  postCount: number;
  icon?: string;
  color?: string;
  children?: ForumCategory[];
}

interface ForumCategoryListData {
  categories: ForumCategory[];
}

export const ForumCategoryListBlock = ({ node }: BlockRendererProps) => {
  const {
    columns = 3,
    showDescription = true,
    showPostCount = true,
    showIcon = true,
    data,
  } = node.props;

  const categoryData: ForumCategoryListData = data || { categories: [] };

  if (categoryData.categories.length === 0) {
    return (
      <div className="py-6">
        <div
          className="text-center py-8 rounded-lg border"
          style={{ ...forumStyles.bgPrimary, ...forumStyles.borderLight }}
        >
          <p style={forumStyles.textMuted}>카테고리가 없습니다.</p>
        </div>
      </div>
    );
  }

  const columnClass =
    columns === 1
      ? ''
      : columns === 2
      ? 'md:grid-cols-2'
      : columns === 4
      ? 'lg:grid-cols-4'
      : 'lg:grid-cols-3';

  return (
    <div className="py-6">
      <div className={`grid grid-cols-1 ${columnClass} gap-4`}>
        {categoryData.categories.map((category) => (
          <a
            key={category.id}
            href={`/forum/category/${category.slug}`}
            className="rounded-lg border p-4 transition-shadow hover:shadow-md"
            style={forumStyles.card}
          >
            <div className="flex items-start gap-3">
              {showIcon && category.icon && (
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-lg flex-shrink-0"
                  style={{ backgroundColor: category.color || 'var(--forum-primary)' }}
                >
                  {category.icon}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold" style={forumStyles.heading}>
                  {category.name}
                </h3>
                {showDescription && category.description && (
                  <p className="text-sm mt-1 line-clamp-2" style={forumStyles.text}>
                    {category.description}
                  </p>
                )}
                {showPostCount && (
                  <p className="text-xs mt-2" style={forumStyles.textMuted}>
                    {category.postCount}개의 게시글
                  </p>
                )}
              </div>
            </div>

            {/* Subcategories */}
            {category.children && category.children.length > 0 && (
              <div
                className="mt-3 pt-3 border-t"
                style={{ borderColor: 'var(--forum-border-light)' }}
              >
                <div className="flex flex-wrap gap-2">
                  {category.children.slice(0, 3).map((child) => (
                    <span
                      key={child.id}
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs"
                      style={forumStyles.bgTertiary}
                    >
                      {child.name}
                    </span>
                  ))}
                  {category.children.length > 3 && (
                    <span className="text-xs" style={forumStyles.textMuted}>
                      +{category.children.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </a>
        ))}
      </div>
    </div>
  );
};
