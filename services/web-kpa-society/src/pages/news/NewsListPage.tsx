/**
 * NewsListPage - 공지/뉴스 목록 페이지
 */

import { useState, useEffect } from 'react';
import { Link, useSearchParams, useLocation } from 'react-router-dom';
import { PageHeader, LoadingSpinner, EmptyState, Pagination, Card } from '../../components/common';
import { newsApi } from '../../api';
import { colors, typography } from '../../styles/theme';
import type { Notice } from '../../types';

type NoticeType = 'notice' | 'branch-news' | 'kpa-news' | 'press';

const typeLabels: Record<NoticeType, string> = {
  notice: '공지사항',
  'branch-news': '지부/분회 소식',
  'kpa-news': '전체 약사회 소식',
  press: '보도자료',
};

export function NewsListPage() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);

  // URL 경로에서 타입 추출
  const getTypeFromPath = (): NoticeType | undefined => {
    const path = location.pathname;
    if (path.includes('/news/notice')) return 'notice';
    if (path.includes('/news/branch-news')) return 'branch-news';
    if (path.includes('/news/kpa-news')) return 'kpa-news';
    if (path.includes('/news/press')) return 'press';
    return undefined;
  };

  const currentPage = parseInt(searchParams.get('page') || '1');
  const currentType = getTypeFromPath();
  const searchQuery = searchParams.get('search') || '';

  useEffect(() => {
    loadData();
  }, [currentPage, currentType, searchQuery]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await newsApi.getNotices({
        type: currentType,
        page: currentPage,
        limit: 20,
        search: searchQuery || undefined,
      });

      setNotices(res.data);
      setTotalPages(res.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setSearchParams(prev => {
      prev.set('page', String(page));
      return prev;
    });
  };

  const pageTitle = currentType ? typeLabels[currentType] : '공지/소식';

  if (loading) {
    return <LoadingSpinner message="게시글을 불러오는 중..." />;
  }

  if (error) {
    return (
      <div style={styles.container}>
        <EmptyState
          icon="⚠️"
          title="오류가 발생했습니다"
          description={error}
          action={{ label: '다시 시도', onClick: loadData }}
        />
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <PageHeader
        title={pageTitle}
        breadcrumb={[
          { label: '홈', href: '/' },
          { label: '공지/소식', href: '/news' },
          ...(currentType ? [{ label: typeLabels[currentType] }] : []),
        ]}
      />

      {/* 타입 필터 (전체 목록일 때만) */}
      {!currentType && (
        <div style={styles.tabs}>
          <Link to="/news/notice" style={styles.tab}>공지사항</Link>
          <Link to="/news/branch-news" style={styles.tab}>지부/분회 소식</Link>
          <Link to="/news/kpa-news" style={styles.tab}>전체 약사회 소식</Link>
          <Link to="/news/press" style={styles.tab}>보도자료</Link>
        </div>
      )}

      {notices.length === 0 ? (
        <EmptyState
          icon="📢"
          title="게시글이 없습니다"
          description="등록된 게시글이 없습니다."
        />
      ) : (
        <>
          <div style={styles.list}>
            {notices.map(notice => (
              <Link key={notice.id} to={`/news/${notice.id}`} style={styles.itemLink}>
                <Card hover padding="medium">
                  <div style={styles.itemHeader}>
                    {notice.isPinned && <span style={styles.pinnedBadge}>중요</span>}
                    <span style={styles.typeBadge}>{typeLabels[notice.type as NoticeType]}</span>
                  </div>
                  <h3 style={styles.itemTitle}>{notice.title}</h3>
                  {notice.excerpt && <p style={styles.itemExcerpt}>{notice.excerpt}</p>}
                  <div style={styles.itemMeta}>
                    <span>{notice.authorName}</span>
                    <span>·</span>
                    <span>{new Date(notice.createdAt).toLocaleDateString()}</span>
                    <span>·</span>
                    <span>조회 {notice.viewCount}</span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '0 20px 40px',
  },
  tabs: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
    flexWrap: 'wrap',
  },
  tab: {
    padding: '10px 20px',
    backgroundColor: colors.neutral100,
    color: colors.neutral700,
    textDecoration: 'none',
    borderRadius: '6px',
    fontSize: '14px',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  itemLink: {
    textDecoration: 'none',
    color: 'inherit',
  },
  itemHeader: {
    display: 'flex',
    gap: '8px',
    marginBottom: '8px',
  },
  pinnedBadge: {
    padding: '2px 8px',
    backgroundColor: colors.accentRed,
    color: colors.white,
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 500,
  },
  typeBadge: {
    padding: '2px 8px',
    backgroundColor: colors.neutral100,
    color: colors.neutral600,
    borderRadius: '4px',
    fontSize: '12px',
  },
  itemTitle: {
    ...typography.headingS,
    color: colors.neutral900,
    margin: 0,
  },
  itemExcerpt: {
    ...typography.bodyM,
    color: colors.neutral500,
    marginTop: '8px',
    marginBottom: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  },
  itemMeta: {
    display: 'flex',
    gap: '8px',
    marginTop: '12px',
    ...typography.bodyS,
    color: colors.neutral500,
  },
};
