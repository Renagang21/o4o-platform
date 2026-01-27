/**
 * ForumCategorySection - 카테고리 둘러보기
 *
 * CommunityServiceSection 패턴: 카테고리별 카드 그리드
 * 각 카드: 아이콘 + 카테고리명 + 게시글 수 + 바로가기
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { forumApi } from '../../api';
import type { ForumCategory } from '../../types';
import { colors, spacing, borderRadius, shadows, typography } from '../../styles/theme';

// 카테고리별 아이콘 매핑 (기본값 제공)
const categoryIcons: Record<string, string> = {
  '자유게시판': '💬',
  '정보공유': '📌',
  '질문답변': '❓',
  '후기': '⭐',
  '공지사항': '📢',
};

function CategoryCard({ category }: { category: ForumCategory }) {
  const icon = categoryIcons[category.name] || '📂';

  return (
    <Link to={`/demo/forum/category/${category.id}`} style={styles.card}>
      <div style={styles.cardIcon}>{icon}</div>
      <div style={styles.cardContent}>
        <h3 style={styles.cardTitle}>{category.name}</h3>
        {category.description && (
          <p style={styles.cardDesc}>{category.description}</p>
        )}
      </div>
      <span style={styles.cardCount}>
        {category.postCount}건
      </span>
    </Link>
  );
}

export function ForumCategorySection() {
  const [categories, setCategories] = useState<ForumCategory[]>([]);

  useEffect(() => {
    forumApi.getCategories()
      .then((res) => {
        if (res.data) setCategories(res.data);
      })
      .catch(() => {});
  }, []);

  return (
    <section style={styles.container}>
      <h2 style={styles.sectionTitle}>카테고리 둘러보기</h2>
      {categories.length === 0 ? (
        <p style={styles.empty}>자료가 없습니다</p>
      ) : (
        <div style={styles.grid}>
          {categories.map((cat) => (
            <CategoryCard key={cat.id} category={cat} />
          ))}
        </div>
      )}
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: `${spacing.xl} 0`,
  },
  sectionTitle: {
    ...typography.headingM,
    color: colors.neutral900,
    marginBottom: spacing.lg,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: spacing.md,
  },
  card: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    boxShadow: shadows.sm,
    textDecoration: 'none',
    color: colors.neutral800,
    transition: 'box-shadow 0.2s',
    border: `1px solid ${colors.neutral100}`,
  },
  cardIcon: {
    fontSize: '2rem',
    flexShrink: 0,
  },
  cardContent: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    ...typography.headingS,
    margin: 0,
    color: colors.neutral900,
  },
  cardDesc: {
    margin: `${spacing.xs} 0 0`,
    fontSize: '0.813rem',
    color: colors.neutral500,
  },
  cardCount: {
    fontSize: '0.75rem',
    fontWeight: 500,
    whiteSpace: 'nowrap',
    padding: '2px 8px',
    borderRadius: borderRadius.sm,
    color: colors.primary,
    backgroundColor: `${colors.primary}10`,
  },
  empty: {
    textAlign: 'center',
    color: colors.neutral500,
    padding: spacing.xl,
    margin: 0,
  },
};
