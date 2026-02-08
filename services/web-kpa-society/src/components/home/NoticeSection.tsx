/**
 * NoticeSection - 공지사항 섹션
 *
 * WO-KPA-HOME-PHASE1-V1: 메인 페이지 공지 요약
 * homeApi.getNotices() → cms_contents(type=notice) 표시
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { homeApi } from '../../api/home';
import type { HomeNotice } from '../../api/home';
import { colors, spacing, borderRadius, shadows, typography } from '../../styles/theme';

export function NoticeSection() {
  const [notices, setNotices] = useState<HomeNotice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    homeApi.getNotices(5)
      .then((res) => {
        if (res.data) setNotices(res.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <section style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.sectionTitle}>공지사항</h2>
        <Link to="/news" style={styles.moreLink}>더보기</Link>
      </div>
      <div style={styles.card}>
        {loading ? (
          <p style={styles.empty}>불러오는 중...</p>
        ) : notices.length === 0 ? (
          <p style={styles.empty}>등록된 공지가 없습니다</p>
        ) : (
          <ul style={styles.list}>
            {notices.map((notice) => (
              <li key={notice.id} style={styles.listItem}>
                <Link to={`/news/${notice.id}`} style={styles.postLink}>
                  {notice.isPinned && (
                    <span style={styles.pinnedBadge}>고정</span>
                  )}
                  <span style={styles.postTitle}>{notice.title}</span>
                </Link>
                <div style={styles.meta}>
                  <span>
                    {new Date(notice.publishedAt || notice.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
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
    padding: spacing.lg,
    boxShadow: shadows.sm,
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
  pinnedBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primary,
    color: colors.white,
    fontSize: '0.7rem',
    fontWeight: 600,
    whiteSpace: 'nowrap',
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
