/**
 * YaksaCategoryList - Category List Component
 *
 * Displays forum categories with post counts and access indicators.
 */

'use client';

import { yaksaStyles } from './theme';
import type { YaksaCategory, YaksaRole } from '@/lib/yaksa/forum-data';
import { hasRoleAccess } from '@/lib/yaksa/forum-data';

interface YaksaCategoryListProps {
  categories: YaksaCategory[];
  currentCategoryId?: string;
  userRole?: YaksaRole;
  compact?: boolean;
  showDescription?: boolean;
}

const ROLE_LABELS: Record<YaksaRole, string> = {
  administrator: '관리자',
  operator: '운영자',
  member: '회원',
  guest: '비회원',
};

export function YaksaCategoryList({
  categories,
  currentCategoryId,
  userRole = 'guest',
  compact = false,
  showDescription = true,
}: YaksaCategoryListProps) {
  // Sort by order
  const sortedCategories = [...categories].sort((a, b) => a.order - b.order);

  return (
    <div className="yaksa-category-list">
      <div className={compact ? 'space-y-1' : 'space-y-2'}>
        {sortedCategories.map((category) => {
          const hasAccess = hasRoleAccess(userRole, category.requiredRole);
          const isActive = category.id === currentCategoryId;

          return (
            <CategoryItem
              key={category.id}
              category={category}
              hasAccess={hasAccess}
              isActive={isActive}
              compact={compact}
              showDescription={showDescription}
            />
          );
        })}
      </div>
    </div>
  );
}

interface CategoryItemProps {
  category: YaksaCategory;
  hasAccess: boolean;
  isActive: boolean;
  compact: boolean;
  showDescription: boolean;
}

function CategoryItem({
  category,
  hasAccess,
  isActive,
  compact,
  showDescription,
}: CategoryItemProps) {
  const content = (
    <div
      className={`flex items-center gap-3 rounded-lg transition-all ${
        compact ? 'p-2' : 'p-3'
      } ${hasAccess ? 'cursor-pointer hover:shadow-sm' : 'opacity-60'}`}
      style={{
        backgroundColor: isActive ? 'var(--yaksa-surface-tertiary)' : 'var(--yaksa-surface)',
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: isActive ? 'var(--yaksa-primary)' : 'var(--yaksa-border)',
      }}
    >
      {/* Icon */}
      <span className={compact ? 'text-lg' : 'text-xl'}>{category.icon || '📁'}</span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4
            className={`font-medium ${compact ? 'text-sm' : ''}`}
            style={yaksaStyles.textPrimary}
          >
            {category.name}
          </h4>
          {category.isPrivate && (
            <span className="text-xs" title="비공개 게시판">
              🔒
            </span>
          )}
        </div>

        {showDescription && !compact && category.description && (
          <p className="text-xs mt-0.5 line-clamp-1" style={yaksaStyles.textMuted}>
            {category.description}
          </p>
        )}
      </div>

      {/* Post Count */}
      <div className="flex-shrink-0 text-right">
        <span
          className={`font-medium ${compact ? 'text-xs' : 'text-sm'}`}
          style={yaksaStyles.textSecondary}
        >
          {category.postCount}
        </span>
        {!compact && (
          <p className="text-xs" style={yaksaStyles.textMuted}>
            게시글
          </p>
        )}
      </div>

      {/* Access Indicator */}
      {!hasAccess && (
        <div
          className="flex-shrink-0 px-2 py-0.5 rounded text-xs"
          style={yaksaStyles.badgeWarning}
        >
          {ROLE_LABELS[category.requiredRole]} 이상
        </div>
      )}
    </div>
  );

  if (hasAccess) {
    return (
      <a href={`/yaksa/forum/category/${category.slug}`} className="block">
        {content}
      </a>
    );
  }

  return <div>{content}</div>;
}

export default YaksaCategoryList;
