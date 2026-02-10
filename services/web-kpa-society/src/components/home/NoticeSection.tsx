/**
 * NoticeSection - 공지사항 + 뉴스 탭 섹션
 *
 * WO-KPA-HOME-PHASE1-V1: 메인 페이지 공지/뉴스 요약
 * Performance: prefetchedNotices/prefetchedNews가 있으면 자체 API 호출 건너뜀
 *
 * 탭 구조:
 * [공지사항] [뉴스]
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { homeApi } from '../../api/home';
import type { HomeNotice } from '../../api/home';
import { newsApi } from '../../api/news';
import { colors, spacing, borderRadius, shadows } from '../../styles/theme';

type Tab = 'notice' | 'news';

interface Props {
  prefetchedNotices?: HomeNotice[];
  prefetchedNews?: HomeNotice[];
  loading?: boolean;
}

export function NoticeSection({ prefetchedNotices, prefetchedNews, loading: parentLoading }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('notice');
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

  const isLoading = parentLoading ?? (activeTab === 'notice' ? loading : newsLoading);
  const items = activeTab === 'notice' ? notices : news;
  const moreLink = activeTab === 'notice' ? '/news/notice' : '/news/news';
  const moreLinkText = activeTab === 'notice' ? '공지 전체 보기 →' : '뉴스 전체 보기 →';
  const emptyText = activeTab === 'notice' ? '아직 등록된 공지가 없습니다.' : '아직 등록된 뉴스가 없습니다.';
  const emptyHintText = activeTab === 'notice' ? '새 소식이 등록되면 여기에 표시됩니다.' : '뉴스가 등록되면 여기에 표시됩니다.';

  return (
    <section style={styles.container}>
      <div style={styles.header}>
        <div style={styles.tabs}>
          <button
            style={{ ...styles.tab, ...(activeTab === 'notice' ? styles.tabActive : {}) }}
            onClick={() => setActiveTab('notice')}
          >
            공지사항
          </button>
          <button
            style={{ ...styles.tab, ...(activeTab === 'news' ? styles.tabActive : {}) }}
            onClick={() => setActiveTab('news')}
          >
            뉴스
          </button>
        </div>
        <Link to={moreLink} style={styles.moreLink}>{moreLinkText}</Link>
      </div>
      <div style={styles.card}>
        {isLoading ? (
          <p style={styles.empty}>불러오는 중...</p>
        ) : items.length === 0 ? (
          <div style={styles.emptyWrap}>
            <p style={styles.empty}>{emptyText}</p>
            <p style={styles.emptyHint}>{emptyHintText}</p>
          </div>
        ) : (
          <ul style={styles.list}>
            {items.map((item) => (
              <li key={item.id} style={styles.listItem}>
                <Link to={`/news/${item.id}`} style={styles.postLink}>
                  {activeTab === 'notice' && item.isPinned && (
                    <span style={styles.pinnedBadge}>고정</span>
                  )}
                  <span style={styles.postTitle}>{item.title}</span>
                </Link>
                {item.summary && (
                  <p style={styles.summary}>{item.summary}</p>
                )}
                <div style={styles.meta}>
                  <span>
                    {new Date(item.publishedAt || item.createdAt).toLocaleDateString()}
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
  tabs: {
    display: 'flex',
    gap: '4px',
  },
  tab: {
    padding: '6px 16px',
    fontSize: '0.875rem',
    fontWeight: 600,
    border: 'none',
    borderRadius: borderRadius.md,
    backgroundColor: 'transparent',
    color: colors.neutral500,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  tabActive: {
    backgroundColor: colors.primary,
    color: colors.white,
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
    padding: spacing.xl,
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
