/**
 * ImportantNotices → FeaturedContent
 *
 * WO-KPA-HOME-PHASE1-V1: 공지사항은 NoticeSection으로 이동.
 * ActivitySection 우측에는 추천 콘텐츠(featured) 표시.
 * Performance: prefetchedFeatured가 있으면 자체 API 호출 건너뜀
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { homeApi } from '../../../api/home';
import type { HomeFeatured } from '../../../api/home';
import { colors, spacing, typography } from '../../../styles/theme';

interface Props {
  prefetchedFeatured?: HomeFeatured[];
  loading?: boolean;
}

export function ImportantNotices({ prefetchedFeatured, loading: parentLoading }: Props) {
  const [featured, setFeatured] = useState<HomeFeatured[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (prefetchedFeatured) {
      setFeatured(prefetchedFeatured);
      setLoading(false);
      return;
    }
    // Fallback: 독립 사용 시 자체 호출
    homeApi.getCommunity(0, 3)
      .then((res) => {
        if (res.data?.featured) setFeatured(res.data.featured);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [prefetchedFeatured]);

  const isLoading = parentLoading ?? loading;

  return (
    <div>
      <div style={styles.header}>
        <h3 style={styles.title}>추천 콘텐츠</h3>
        <Link to="/news" style={styles.moreLink}>추천 콘텐츠 보기 →</Link>
      </div>
      {isLoading ? (
        <p style={styles.empty}>불러오는 중...</p>
      ) : featured.length === 0 ? (
        <p style={styles.empty}>추천 콘텐츠가 준비 중입니다.</p>
      ) : (
        <ul style={styles.list}>
          {featured.map((item) => (
            <li key={item.id} style={styles.listItem}>
              {item.linkUrl ? (
                <a href={item.linkUrl} style={styles.postLink} target="_blank" rel="noopener noreferrer">
                  <span style={styles.postTitle}>{item.title}</span>
                </a>
              ) : (
                <span style={styles.postLink}>
                  <span style={styles.postTitle}>{item.title}</span>
                </span>
              )}
              {item.summary && (
                <p style={styles.summary}>{item.summary}</p>
              )}
              <div style={styles.meta}>
                <span>{new Date(item.createdAt).toLocaleDateString()}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottom: `1px solid ${colors.neutral200}`,
  },
  title: {
    ...typography.headingS,
    margin: 0,
    color: colors.neutral900,
  },
  moreLink: {
    fontSize: '0.875rem',
    color: colors.primary,
    textDecoration: 'none',
  },
  list: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
  },
  listItem: {
    padding: `${spacing.sm} 0`,
    borderBottom: `1px solid ${colors.neutral100}`,
  },
  postLink: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    textDecoration: 'none',
    color: colors.neutral800,
  },
  postTitle: {
    fontSize: '0.875rem',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  meta: {
    display: 'flex',
    gap: spacing.xs,
    marginTop: '4px',
    fontSize: '0.75rem',
    color: colors.neutral400,
  },
  summary: {
    margin: `4px 0 0`,
    fontSize: '0.8rem',
    color: colors.neutral500,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  empty: {
    textAlign: 'center',
    color: colors.neutral500,
    padding: spacing.xl,
    margin: 0,
  },
};
