/**
 * ImportantNotices - 공지사항 목록
 *
 * ActivitySection 하위 컴포넌트
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { newsApi } from '../../../api';
import type { Notice } from '../../../types';
import { colors, spacing, typography } from '../../../styles/theme';

export function ImportantNotices() {
  const [notices, setNotices] = useState<Notice[]>([]);

  useEffect(() => {
    newsApi.getNotices({ limit: 3 })
      .then((res) => {
        if (res.data) setNotices(res.data);
      })
      .catch(() => {});
  }, []);

  return (
    <div>
      <div style={styles.header}>
        <h3 style={styles.title}>공지사항</h3>
        <Link to="/news" style={styles.moreLink}>더보기</Link>
      </div>
      {notices.length === 0 ? (
        <p style={styles.empty}>자료가 없습니다</p>
      ) : (
        <ul style={styles.list}>
          {notices.map((notice) => (
            <li key={notice.id} style={styles.listItem}>
              <Link to={`/news/${notice.id}`} style={styles.postLink}>
                <span style={styles.postTitle}>{notice.title}</span>
              </Link>
              <div style={styles.meta}>
                <span>{new Date(notice.createdAt).toLocaleDateString()}</span>
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
