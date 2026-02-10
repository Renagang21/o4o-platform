/**
 * NoticeSection - 공지사항 + 뉴스 2컬럼 섹션
 *
 * WO-KPA-HOME-PHASE1-V1: 메인 페이지 공지/뉴스 요약
 * Performance: prefetchedNotices/prefetchedNews가 있으면 자체 API 호출 건너뜀
 *
 * 레이아웃:
 * [공지사항 컬럼] | [뉴스 컬럼]
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { homeApi } from '../../api/home';
import type { HomeNotice } from '../../api/home';
import { newsApi } from '../../api/news';
import { colors, spacing, borderRadius, shadows } from '../../styles/theme';

interface Props {
  prefetchedNotices?: HomeNotice[];
  prefetchedNews?: HomeNotice[];
  loading?: boolean;
}

export function NoticeSection({ prefetchedNotices, prefetchedNews, loading: parentLoading }: Props) {
  const [notices, setNotices] = useState<HomeNotice[]>([]);
  const [news, setNews] = useState<HomeNotice[]>([]);
  const [loading, setLoading] = useState(true);
  const [newsLoading, setNewsLoading] = useState(true);

  useEffect(() => {
    if (prefetchedNotices) {
      setNotices(prefetchedNotices);
      setLoading(false);
    } else {
      homeApi.getNotices(3)
        .then((res) => { if (res.data) setNotices(res.data); })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [prefetchedNotices]);

  useEffect(() => {
    if (prefetchedNews) {
      setNews(prefetchedNews);
      setNewsLoading(false);
    } else {
      newsApi.getNotices({ type: 'news', limit: 3, sort: 'latest' })
        .then((res) => { if (res.data) setNews(res.data as unknown as HomeNotice[]); })
        .catch(() => {})
        .finally(() => setNewsLoading(false));
    }
  }, [prefetchedNews]);

  const isNoticeLoading = parentLoading ?? loading;
  const isNewsLoading = parentLoading ?? newsLoading;

  return (
    <section style={styles.container}>
      <div style={styles.grid}>
        {/* 공지사항 컬럼 */}
        <div style={styles.column}>
          <div style={styles.columnHeader}>
            <h2 style={styles.columnTitle}>공지사항</h2>
            <Link to="/news/notice" style={styles.moreLink}>전체 보기 →</Link>
          </div>
          <div style={styles.card}>
            <ItemList
              items={notices}
              loading={isNoticeLoading}
              showPinned
              emptyText="아직 등록된 공지가 없습니다."
              emptyHint="새 소식이 등록되면 여기에 표시됩니다."
            />
          </div>
        </div>

        {/* 뉴스 컬럼 */}
        <div style={styles.column}>
          <div style={styles.columnHeader}>
            <h2 style={styles.columnTitle}>뉴스</h2>
            <Link to="/news/news" style={styles.moreLink}>전체 보기 →</Link>
          </div>
          <div style={styles.card}>
            <ItemList
              items={news}
              loading={isNewsLoading}
              emptyText="아직 등록된 뉴스가 없습니다."
              emptyHint="뉴스가 등록되면 여기에 표시됩니다."
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function ItemList({ items, loading, showPinned, emptyText, emptyHint }: {
  items: HomeNotice[];
  loading: boolean;
  showPinned?: boolean;
  emptyText: string;
  emptyHint: string;
}) {
  if (loading) {
    return <p style={styles.empty}>불러오는 중...</p>;
  }

  if (items.length === 0) {
    return (
      <div style={styles.emptyWrap}>
        <p style={styles.empty}>{emptyText}</p>
        <p style={styles.emptyHint}>{emptyHint}</p>
      </div>
    );
  }

  return (
    <ul style={styles.list}>
      {items.map((item) => (
        <li key={item.id} style={styles.listItem}>
          <Link to={`/news/${item.id}`} style={styles.postLink}>
            {showPinned && item.isPinned && (
              <span style={styles.pinnedBadge}>고정</span>
            )}
            <span style={styles.postTitle}>{item.title}</span>
          </Link>
          {item.summary && (
            <p style={styles.summary}>{item.summary}</p>
          )}
          <div style={styles.meta}>
            <span>{new Date(item.publishedAt || item.createdAt).toLocaleDateString()}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: `${spacing.xl} 0`,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: spacing.lg,
  },
  column: {
    minWidth: 0,
  },
  columnHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  columnTitle: {
    fontSize: '1.1rem',
    fontWeight: 700,
    color: colors.neutral900,
    margin: 0,
  },
  moreLink: {
    fontSize: '0.813rem',
    color: colors.primary,
    textDecoration: 'none',
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    boxShadow: shadows.sm,
    minHeight: '180px',
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
    flexShrink: 0,
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
  emptyWrap: {
    textAlign: 'center',
    padding: spacing.lg,
  },
  empty: {
    textAlign: 'center',
    color: colors.neutral500,
    margin: 0,
  },
  emptyHint: {
    textAlign: 'center',
    color: colors.neutral400,
    fontSize: '0.8rem',
    margin: `${spacing.xs} 0 0`,
  },
};
