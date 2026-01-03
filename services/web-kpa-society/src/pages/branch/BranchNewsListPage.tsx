/**
 * BranchNewsListPage - 분회 공지/뉴스 목록
 */

import { useState, useEffect } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { PageHeader, LoadingSpinner, EmptyState, Pagination, Card } from '../../components/common';
import { branchApi } from '../../api/branch';
import { colors } from '../../styles/theme';
import type { Notice } from '../../types';

const categories = [
  { id: 'all', label: '전체' },
  { id: 'notice', label: '공지사항' },
  { id: 'branch-news', label: '분회 소식' },
  { id: 'gallery', label: '갤러리' },
];

export function BranchNewsListPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const [searchParams] = useSearchParams();
  const category = searchParams.get('category') || 'all';

  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadData();
  }, [branchId, category, page]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await branchApi.getNews(branchId!, { category, page, limit: 10 });
      setNotices(res.data.items);
      setTotalPages(res.data.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="뉴스를 불러오는 중..." />;
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
        title="분회 소식"
        breadcrumb={[
          { label: '홈', href: `/branch/${branchId}` },
          { label: '소식' },
        ]}
      />

      {/* Category Tabs */}
      <div style={styles.tabs}>
        {categories.map((cat) => (
          <Link
            key={cat.id}
            to={`/branch/${branchId}/news${cat.id === 'all' ? '' : `?category=${cat.id}`}`}
            style={{
              ...styles.tab,
              ...(category === cat.id || (category === 'all' && cat.id === 'all') ? styles.tabActive : {}),
            }}
          >
            {cat.label}
          </Link>
        ))}
      </div>

      {/* List */}
      {notices.length === 0 ? (
        <EmptyState
          icon="📭"
          title="게시글이 없습니다"
          description="등록된 소식이 없습니다."
        />
      ) : (
        <Card>
          <div style={styles.list}>
            {notices.map((notice) => (
              <Link
                key={notice.id}
                to={`/branch/${branchId}/news/${notice.id}`}
                style={styles.item}
              >
                <div style={styles.itemContent}>
                  {notice.isImportant && (
                    <span style={styles.importantBadge}>중요</span>
                  )}
                  <span style={styles.title}>{notice.title}</span>
                </div>
                <div style={styles.itemMeta}>
                  <span style={styles.date}>{notice.createdAt}</span>
                  <span style={styles.views}>조회 {notice.views}</span>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}

      {totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '900px',
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
    color: colors.neutral600,
    borderRadius: '8px',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'all 0.2s',
  },
  tabActive: {
    backgroundColor: colors.primary,
    color: colors.white,
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
  },
  item: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 0',
    borderBottom: `1px solid ${colors.neutral200}`,
    textDecoration: 'none',
    gap: '16px',
  },
  itemContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flex: 1,
  },
  importantBadge: {
    padding: '3px 8px',
    backgroundColor: colors.accentRed,
    color: colors.white,
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 600,
  },
  title: {
    fontSize: '15px',
    color: colors.neutral900,
    fontWeight: 500,
  },
  itemMeta: {
    display: 'flex',
    gap: '16px',
    flexShrink: 0,
  },
  date: {
    fontSize: '13px',
    color: colors.neutral500,
  },
  views: {
    fontSize: '13px',
    color: colors.neutral400,
  },
};
