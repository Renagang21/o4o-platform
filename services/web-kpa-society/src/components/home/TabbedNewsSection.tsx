/**
 * TabbedNewsSection - 공지사항 / 새소식 / 약사공론 탭 통합 섹션
 *
 * WO-KPA-MAIN-HOME-RESTRUCTURE-V1
 *
 * NoticeSection을 대체. 3개 탭:
 *  1. 공지사항 — prefetchedNotices (HomeNotice[])
 *  2. 새소식   — prefetchedLatestNews (Notice[])
 *  3. 약사공론  — 정적 CTA (kpanews.co.kr 외부 링크)
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { HomeNotice } from '../../api/home';
import type { Notice } from '../../types';
import { colors, spacing, borderRadius, shadows } from '../../styles/theme';

interface Props {
  prefetchedNotices?: HomeNotice[];
  prefetchedLatestNews?: Notice[];
  loading?: boolean;
}

type TabKey = 'notices' | 'latest' | 'kpanews';

const tabs: { key: TabKey; label: string }[] = [
  { key: 'notices', label: '공지사항' },
  { key: 'latest', label: '새소식' },
  { key: 'kpanews', label: '약사공론' },
];

export function TabbedNewsSection({ prefetchedNotices, prefetchedLatestNews, loading }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>('notices');

  return (
    <section style={styles.container}>
      {/* 탭 행 */}
      <div style={styles.tabRow}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={activeTab === tab.key ? { ...styles.tab, ...styles.tabActive } : styles.tab}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 탭 패널 */}
      <div style={styles.card}>
        {activeTab === 'notices' && (
          <NoticesPanel notices={prefetchedNotices ?? []} loading={loading ?? false} />
        )}
        {activeTab === 'latest' && (
          <LatestNewsPanel news={prefetchedLatestNews ?? []} loading={loading ?? false} />
        )}
        {activeTab === 'kpanews' && (
          <KpaNewsPanel />
        )}
      </div>
    </section>
  );
}

/** 공지사항 패널 — NoticeSection의 ItemList 패턴 재사용 */
function NoticesPanel({ notices, loading }: { notices: HomeNotice[]; loading: boolean }) {
  if (loading) return <p style={styles.empty}>불러오는 중...</p>;

  if (notices.length === 0) {
    return (
      <div style={styles.emptyWrap}>
        <p style={styles.empty}>아직 등록된 공지가 없습니다.</p>
        <p style={styles.emptyHint}>새 소식이 등록되면 여기에 표시됩니다.</p>
      </div>
    );
  }

  return (
    <>
      <ul style={styles.list}>
        {notices.map((item) => (
          <li key={item.id} style={styles.listItem}>
            <Link to={`/content/${item.id}`} style={styles.postLink}>
              {item.isPinned && <span style={styles.pinnedBadge}>고정</span>}
              <span style={styles.postTitle}>{item.title}</span>
            </Link>
            <div style={styles.meta}>
              <span>{new Date(item.publishedAt || item.createdAt).toLocaleDateString()}</span>
            </div>
          </li>
        ))}
      </ul>
      <div style={styles.viewAllRow}>
        <Link to="/content" style={styles.viewAllLink}>전체 보기 →</Link>
      </div>
    </>
  );
}

/** 새소식 패널 */
function LatestNewsPanel({ news, loading }: { news: Notice[]; loading: boolean }) {
  if (loading) return <p style={styles.empty}>불러오는 중...</p>;

  if (news.length === 0) {
    return (
      <div style={styles.emptyWrap}>
        <p style={styles.empty}>새소식이 없습니다.</p>
        <p style={styles.emptyHint}>최신 소식이 등록되면 여기에 표시됩니다.</p>
      </div>
    );
  }

  return (
    <>
      <ul style={styles.list}>
        {news.map((item) => (
          <li key={item.id} style={styles.listItem}>
            <Link to={`/content/${item.id}`} style={styles.postLink}>
              <span style={styles.postTitle}>{item.title}</span>
            </Link>
            <div style={styles.meta}>
              <span>{new Date(item.publishedAt || item.createdAt).toLocaleDateString()}</span>
            </div>
          </li>
        ))}
      </ul>
      <div style={styles.viewAllRow}>
        <Link to="/content?sort=latest" style={styles.viewAllLink}>전체 보기 →</Link>
      </div>
    </>
  );
}

/** 약사공론 패널 — 정적 CTA (외부 링크) */
function KpaNewsPanel() {
  return (
    <div style={styles.kpaCta}>
      <div style={styles.kpaIconWrap}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
          <path d="M18 14h-8" />
          <path d="M15 18h-5" />
          <path d="M10 6h8v4h-8V6z" />
        </svg>
      </div>
      <p style={styles.kpaText}>약사공론에서 업계 소식을 확인하세요</p>
      <a
        href="https://www.kpanews.co.kr"
        target="_blank"
        rel="noopener noreferrer"
        style={styles.kpaLink}
      >
        약사공론 바로가기 →
      </a>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: `${spacing.xl} 0`,
  },
  tabRow: {
    display: 'flex',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  tab: {
    padding: `${spacing.sm} ${spacing.md}`,
    backgroundColor: 'transparent',
    border: `1px solid ${colors.neutral200}`,
    borderRadius: borderRadius.md,
    color: colors.neutral600,
    fontSize: '0.875rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  tabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    color: colors.white,
    fontWeight: 600,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
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
  viewAllRow: {
    textAlign: 'right',
    paddingTop: spacing.sm,
  },
  viewAllLink: {
    fontSize: '0.813rem',
    color: colors.primary,
    textDecoration: 'none',
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
  // KPA News CTA
  kpaCta: {
    textAlign: 'center',
    padding: `${spacing.xl} ${spacing.md}`,
  },
  kpaIconWrap: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: colors.neutral400,
    marginBottom: spacing.md,
  },
  kpaText: {
    fontSize: '0.9375rem',
    fontWeight: 500,
    color: colors.neutral700,
    margin: `0 0 ${spacing.md}`,
  },
  kpaLink: {
    display: 'inline-block',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: colors.primary,
    textDecoration: 'none',
  },
};
