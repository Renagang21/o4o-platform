/**
 * ForumCategorySection - 카테고리 둘러보기 (다음카페 스타일 Hero)
 *
 * 핵심 정책: 카테고리 카드가 Forum Hub의 Hero 콘텐츠
 * 리스트형 카드: 아이콘 + 이름 + 설명 + 게시글 수 + 활동 신호 + 화살표
 *
 * WO-O4O-FORUM-HUB-ACTIVITY-SIGNAL-V1
 * - 최근 활동 배지 (오늘 글 있음 / 최근 활동)
 * - 최근 글 미리보기 (1줄)
 * - 주간 활동 수치 (이번 주 글 N · 댓글 M)
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { forumApi } from '../../api';
import type { ForumCategory, ForumPost } from '../../types';
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

/** Activity signal per category */
interface CategoryActivity {
  postCount7d: number;
  commentSum7d: number;
  latestPostTitle?: string;
  latestPostDate?: string;
}

function getActivityBadge(activity?: CategoryActivity): { label: string; badgeStyle: React.CSSProperties } | null {
  if (!activity?.latestPostDate) return null;
  const diff = Date.now() - new Date(activity.latestPostDate).getTime();
  const hours = diff / (1000 * 60 * 60);
  if (hours <= 24) return {
    label: '오늘 글 있음',
    badgeStyle: { backgroundColor: colors.primary, color: colors.white },
  };
  if (hours <= 168) return {
    label: '최근 활동',
    badgeStyle: { backgroundColor: colors.neutral100, color: colors.neutral600 },
  };
  return null;
}

function buildActivityMap(posts: ForumPost[]): Record<string, CategoryActivity> {
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const map: Record<string, CategoryActivity> = {};

  posts.forEach((post) => {
    const catId = post.categoryId;
    if (!catId) return;

    if (!map[catId]) {
      map[catId] = { postCount7d: 0, commentSum7d: 0 };
    }

    const postTime = new Date(post.createdAt).getTime();

    if (!map[catId].latestPostDate || postTime > new Date(map[catId].latestPostDate!).getTime()) {
      map[catId].latestPostTitle = post.title;
      map[catId].latestPostDate = post.createdAt;
    }

    if (postTime >= weekAgo) {
      map[catId].postCount7d++;
      map[catId].commentSum7d += post.commentCount || 0;
    }
  });

  return map;
}

function CategoryCard({ category, activity }: { category: ForumCategory; activity?: CategoryActivity }) {
  const icon = categoryIcons[category.name] || DEFAULT_ICON;
  const badge = getActivityBadge(activity);

  return (
    <Link to={`/demo/forum/category/${category.id}`} style={styles.card}>
      <div style={styles.cardIcon}>{icon}</div>
      <div style={styles.cardBody}>
        <div style={styles.cardTitleRow}>
          <h3 style={styles.cardTitle}>{category.name}</h3>
          {badge && (
            <span style={{ ...styles.badge, ...badge.badgeStyle }}>
              {badge.label}
            </span>
          )}
        </div>
        {category.description && (
          <p style={styles.cardDesc}>{category.description}</p>
        )}
        {activity?.latestPostTitle && (
          <p style={styles.latestPost}>최근: {activity.latestPostTitle}</p>
        )}
        <div style={styles.statsRow}>
          <span style={styles.postCount}>{category.postCount}건</span>
          {activity && activity.postCount7d > 0 && (
            <span style={styles.weeklyStats}>
              이번 주 글 {activity.postCount7d}
              {activity.commentSum7d > 0 ? ` · 댓글 ${activity.commentSum7d}` : ''}
            </span>
          )}
        </div>
      </div>
      <span style={styles.chevron}>›</span>
    </Link>
  );
}

export function ForumCategorySection() {
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [activityMap, setActivityMap] = useState<Record<string, CategoryActivity>>({});

  useEffect(() => {
    forumApi.getCategories()
      .then((res) => {
        if (res.data) setCategories(res.data);
      })
      .catch(() => {});

    // Fetch recent posts for activity signals
    forumApi.getPosts({ limit: 30 })
      .then((res) => {
        if (res.data) {
          const posts = Array.isArray(res.data) ? res.data : (res.data as any).items || [];
          setActivityMap(buildActivityMap(posts));
        }
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
              <CategoryCard category={cat} activity={activityMap[cat.id]} />
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
  cardTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardTitle: {
    ...typography.headingS,
    margin: 0,
    color: colors.neutral900,
    fontSize: '0.938rem',
  },
  badge: {
    fontSize: '0.625rem',
    fontWeight: 500,
    padding: '1px 6px',
    borderRadius: borderRadius.sm,
    whiteSpace: 'nowrap',
  },
  cardDesc: {
    margin: `2px 0 0`,
    fontSize: '0.813rem',
    color: colors.neutral500,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  latestPost: {
    margin: `2px 0 0`,
    fontSize: '0.75rem',
    color: colors.neutral600,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  statsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: '4px',
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
  weeklyStats: {
    fontSize: '0.688rem',
    color: colors.primary,
    whiteSpace: 'nowrap',
  },
  chevron: {
    fontSize: '1.25rem',
    color: colors.neutral300,
    fontWeight: 300,
    flexShrink: 0,
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
