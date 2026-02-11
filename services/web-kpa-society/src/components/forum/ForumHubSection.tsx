/**
 * ForumHubSection - 포럼 카테고리 허브 카드 섹션
 *
 * WO-KPA-FORUM-HUB-V2-PHASE1
 * - 활성 카테고리를 카드형 리스트로 표시
 * - 멤버 수, 최근 활동, 최근 글 제목 표시
 * - ForumHomePage 최상단에 배치
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { homeApi } from '../../api/home';
import type { ForumHubItem } from '../../types';
import { colors, spacing, borderRadius, shadows, typography } from '../../styles/theme';

// Responsive 2-col grid (inline styles don't support @media)
const gridStyles = `
  .forum-hub-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: ${spacing.md};
  }
  @media (min-width: 768px) {
    .forum-hub-grid {
      grid-template-columns: 1fr 1fr;
    }
  }
  .forum-hub-card:hover {
    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  }
`;

interface Props {
  prefetchedForums?: ForumHubItem[];
  loading?: boolean;
}

export function ForumHubSection({ prefetchedForums, loading: parentLoading }: Props) {
  const [forums, setForums] = useState<ForumHubItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Inject grid styles
  useEffect(() => {
    const styleId = 'forum-hub-section-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = gridStyles;
      document.head.appendChild(style);
    }
  }, []);

  useEffect(() => {
    if (prefetchedForums) {
      setForums(prefetchedForums);
      setLoading(false);
      return;
    }
    // Fallback: 독립 사용 시 자체 호출
    homeApi.getForumHub()
      .then((res) => {
        if (res.data) setForums(res.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [prefetchedForums]);

  const isLoading = parentLoading ?? loading;

  return (
    <section style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.sectionTitle}>포럼</h2>
        <Link to="/forum/all" style={styles.moreLink}>전체 보기 →</Link>
      </div>

      {isLoading ? (
        <div style={styles.emptyCard}>
          <p style={styles.empty}>불러오는 중...</p>
        </div>
      ) : forums.length === 0 ? (
        <div style={styles.emptyCard}>
          <p style={styles.empty}>아직 개설된 포럼이 없습니다.</p>
        </div>
      ) : (
        <div className="forum-hub-grid">
          {forums.map((forum) => (
            <Link
              key={forum.id}
              to={`/forum/all?category=${forum.id}`}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div className="forum-hub-card" style={styles.card}>
                <div style={styles.cardTop}>
                  <div style={styles.cardTitleRow}>
                    {forum.iconEmoji && (
                      <span style={styles.emoji}>{forum.iconEmoji}</span>
                    )}
                    <span style={styles.cardName}>{forum.name}</span>
                  </div>
                  <span style={styles.postCountBadge}>{forum.postCount}개 글</span>
                </div>

                {forum.description && (
                  <p style={styles.description}>{forum.description}</p>
                )}

                <div style={styles.cardMeta}>
                  <span>참여자 {forum.memberCount}명</span>
                  {forum.lastActivityAt && (
                    <>
                      <span style={styles.dot}>·</span>
                      <span>{formatRelativeTime(forum.lastActivityAt)}</span>
                    </>
                  )}
                </div>

                {forum.lastPostTitle && (
                  <div style={styles.lastPost}>
                    <span style={styles.lastPostLabel}>최근 글</span>
                    <span style={styles.lastPostTitle}>{forum.lastPostTitle}</span>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;

  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;

  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}일 전`;

  return new Date(dateStr).toLocaleDateString();
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: `${spacing.xl} 0`,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.headingM,
    color: colors.neutral900,
    margin: 0,
  },
  moreLink: {
    fontSize: '0.875rem',
    color: colors.primary,
    textDecoration: 'none',
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    boxShadow: shadows.sm,
    border: `1px solid ${colors.neutral100}`,
    padding: spacing.lg,
    transition: 'box-shadow 0.15s ease',
    cursor: 'pointer',
  },
  cardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.xs,
    minWidth: 0,
    flex: 1,
  },
  emoji: {
    fontSize: '1.25rem',
    flexShrink: 0,
  },
  cardName: {
    ...typography.headingS,
    color: colors.neutral900,
    margin: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  postCountBadge: {
    fontSize: '0.75rem',
    fontWeight: 500,
    color: colors.primary,
    backgroundColor: '#EFF6FF',
    padding: '2px 8px',
    borderRadius: borderRadius.sm,
    whiteSpace: 'nowrap',
    flexShrink: 0,
    marginLeft: spacing.sm,
  },
  description: {
    fontSize: '0.813rem',
    color: colors.neutral500,
    margin: `${spacing.xs} 0 0`,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  cardMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    fontSize: '0.75rem',
    color: colors.neutral400,
  },
  dot: {
    color: colors.neutral300,
  },
  lastPost: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    padding: `${spacing.xs} ${spacing.sm}`,
    backgroundColor: colors.neutral50,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  lastPostLabel: {
    fontSize: '0.688rem',
    fontWeight: 500,
    color: colors.neutral400,
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  lastPostTitle: {
    fontSize: '0.75rem',
    color: colors.neutral600,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  emptyCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    boxShadow: shadows.sm,
    padding: spacing.xl,
  },
  empty: {
    textAlign: 'center',
    color: colors.neutral500,
    margin: 0,
  },
};
