/**
 * ForumCategorySection - 카테고리 둘러보기 (다음카페 스타일 Hero)
 *
 * 핵심 정책: 카테고리 카드가 Forum Hub의 Hero 콘텐츠
 * 리스트형 카드: 아이콘 + 이름 + 설명 + 게시글 수 + 화살표
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { forumApi } from '../../api';
import type { ForumCategory } from '../../types';
import { colors, spacing, borderRadius, shadows, typography } from '../../styles/theme';

// 카테고리별 아이콘 매핑
const categoryIcons: Record<string, string> = {
  '자유게시판': '💬',
  '정보공유': '📌',
  '질문답변': '❓',
  '후기': '⭐',
  '공지사항': '📢',
  '약국경영': '🏪',
  '약학정보': '💊',
  '법규정책': '📋',
  '교육연수': '🎓',
  '구인구직': '👥',
};

const DEFAULT_ICON = '📂';

function CategoryCard({ category }: { category: ForumCategory }) {
  const icon = categoryIcons[category.name] || DEFAULT_ICON;

  return (
    <Link to={`/demo/forum/category/${category.id}`} style={styles.card}>
      <div style={styles.cardIcon}>{icon}</div>
      <div style={styles.cardBody}>
        <h3 style={styles.cardTitle}>{category.name}</h3>
        {category.description && (
          <p style={styles.cardDesc}>{category.description}</p>
        )}
      </div>
      <div style={styles.cardRight}>
        <span style={styles.postCount}>{category.postCount}건</span>
        <span style={styles.chevron}>›</span>
      </div>
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
      <div style={styles.header}>
        <h2 style={styles.sectionTitle}>카테고리</h2>
        <span style={styles.subtitle}>관심 있는 게시판을 둘러보세요</span>
      </div>
      {categories.length === 0 ? (
        <div style={styles.emptyCard}>
          <p style={styles.empty}>등록된 카테고리가 없습니다</p>
        </div>
      ) : (
        <div style={styles.listCard}>
          {categories.map((cat, idx) => (
            <div key={cat.id}>
              {idx > 0 && <div style={styles.divider} />}
              <CategoryCard category={cat} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: `${spacing.xl} 0 ${spacing.md}`,
  },
  header: {
    display: 'flex',
    alignItems: 'baseline',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.headingM,
    color: colors.neutral900,
    margin: 0,
  },
  subtitle: {
    fontSize: '0.813rem',
    color: colors.neutral400,
  },
  listCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    boxShadow: shadows.sm,
    border: `1px solid ${colors.neutral100}`,
    overflow: 'hidden',
  },
  card: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.md,
    padding: `${spacing.md} ${spacing.lg}`,
    textDecoration: 'none',
    color: colors.neutral800,
    transition: 'background-color 0.15s',
  },
  cardIcon: {
    fontSize: '1.75rem',
    flexShrink: 0,
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral50,
    borderRadius: borderRadius.md,
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    ...typography.headingS,
    margin: 0,
    color: colors.neutral900,
    fontSize: '0.938rem',
  },
  cardDesc: {
    margin: `2px 0 0`,
    fontSize: '0.813rem',
    color: colors.neutral500,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  cardRight: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 0,
  },
  postCount: {
    fontSize: '0.75rem',
    fontWeight: 500,
    padding: '2px 8px',
    borderRadius: borderRadius.sm,
    color: colors.primary,
    backgroundColor: `${colors.primary}10`,
    whiteSpace: 'nowrap',
  },
  chevron: {
    fontSize: '1.25rem',
    color: colors.neutral300,
    fontWeight: 300,
  },
  divider: {
    height: '1px',
    backgroundColor: colors.neutral100,
    margin: `0 ${spacing.lg}`,
  },
  emptyCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    boxShadow: shadows.sm,
    border: `1px solid ${colors.neutral100}`,
  },
  empty: {
    textAlign: 'center' as const,
    color: colors.neutral500,
    padding: spacing.xl,
    margin: 0,
  },
};
