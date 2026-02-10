/**
 * ActivitySection - 최근 활동 섹션 (메인의 핵심)
 *
 * 하위 컴포넌트:
 * - RecentForumPosts: 최근 포럼 글 3~5개
 * - ImportantNotices: 추천 콘텐츠
 *
 * Performance: prefetched 데이터를 하위 컴포넌트에 전달
 */

import { useAuth } from '../../../contexts/AuthContext';
import { RecentForumPosts } from './RecentForumPosts';
import { ImportantNotices } from './ImportantNotices';
import { colors, spacing, borderRadius, shadows, typography } from '../../../styles/theme';
import type { HomeForumPost, HomeFeatured } from '../../../api/home';

interface Props {
  prefetchedPosts?: HomeForumPost[];
  prefetchedFeatured?: HomeFeatured[];
  loading?: boolean;
}

export function ActivitySection({ prefetchedPosts, prefetchedFeatured, loading }: Props) {
  const { isAuthenticated } = useAuth();

  return (
    <section style={styles.container}>
      <h2 style={styles.sectionTitle}>최근 활동</h2>
      <div style={styles.grid}>
        {/* 최근 글 (2/3 영역) */}
        <div style={styles.feedCard}>
          <RecentForumPosts prefetchedPosts={prefetchedPosts} loading={loading} />
        </div>

        {/* 추천 콘텐츠 (1/3 영역) */}
        <div style={styles.feedCard}>
          <ImportantNotices prefetchedFeatured={prefetchedFeatured} loading={loading} />
          {isAuthenticated && (
            <div style={styles.personalNote}>
              내 알림과 참여 현황은 마이페이지에서 확인하세요.
            </div>
          )}
        </div>
      </div>
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
    gridTemplateColumns: '2fr 1fr',
    gap: spacing.lg,
  },
  feedCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    boxShadow: shadows.sm,
  },
  personalNote: {
    marginTop: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.neutral50,
    borderRadius: borderRadius.sm,
    fontSize: '0.813rem',
    color: colors.neutral500,
    textAlign: 'center',
  },
};
