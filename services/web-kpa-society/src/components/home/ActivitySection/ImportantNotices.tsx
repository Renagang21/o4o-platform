/**
 * ImportantNotices → FeaturedContent
 *
 * WO-KPA-HOME-PHASE1-V1: 공지사항은 NoticeSection으로 이동.
 * ActivitySection 우측에는 추천 콘텐츠(featured) 표시.
 * 데이터 소스: homeApi.getCommunity() → featured
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { homeApi } from '../../../api/home';
import type { HomeFeatured } from '../../../api/home';
import { colors, spacing, typography } from '../../../styles/theme';

export function ImportantNotices() {
  const [featured, setFeatured] = useState<HomeFeatured[]>([]);

  useEffect(() => {
    homeApi.getCommunity(0, 3)
      .then((res) => {
        if (res.data?.featured) setFeatured(res.data.featured);
      })
      .catch(() => {});
  }, []);

  return (
    <div>
      <div style={styles.header}>
        <h3 style={styles.title}>추천 콘텐츠</h3>
        <Link to="/news" style={styles.moreLink}>더보기</Link>
      </div>
      {featured.length === 0 ? (
        <p style={styles.empty}>자료가 없습니다</p>
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
  empty: {
    textAlign: 'center',
    color: colors.neutral500,
    padding: spacing.xl,
    margin: 0,
  },
};
