/**
 * BranchForumListPage - 분회 포럼 목록
 */

import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PageHeader, LoadingSpinner, EmptyState, Pagination, Card } from '../../components/common';

import { useBranchContext } from '../../contexts/BranchContext';
import { branchApi } from '../../api/branch';
import { colors } from '../../styles/theme';
import type { ForumPost } from '../../types';

export function BranchForumListPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const { basePath } = useBranchContext();
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadData();
  }, [branchId, page]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await branchApi.getForumPosts(branchId!, { page, limit: 15 });
      setPosts(res.data.items);
      setTotalPages(res.data.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

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
        title="분회 포럼"
        breadcrumb={[
          { label: '홈', href: `${basePath}` },
          { label: '포럼' },
        ]}
      />

      {/* Actions */}
      <div style={styles.actions}>
        <Link to={`${basePath}/forum/write`} style={styles.writeButton}>
          ✏️ 글쓰기
        </Link>
      </div>

      {/* List */}
      {posts.length === 0 ? (
        <EmptyState
          icon="💬"
          title="게시글이 없습니다"
          description="첫 번째 글을 작성해 보세요."
          action={{ label: '글쓰기', onClick: () => window.location.href = `${basePath}/forum/write` }}
        />
      ) : (
        <Card>
          <div style={styles.list}>
            {posts.map((post) => (
              <Link
                key={post.id}
                to={`${basePath}/forum/post/${post.id}`}
                style={styles.item}
              >
                <div style={styles.itemMain}>
                  <span style={styles.category}>{post.categoryName || '일반'}</span>
                  <span style={styles.title}>{post.title}</span>
                  {post.commentCount > 0 && (
                    <span style={styles.commentCount}>[{post.commentCount}]</span>
                  )}
                </div>
                <div style={styles.itemMeta}>
                  <span style={styles.author}>{post.authorName}</span>
                  <span style={styles.date}>{post.createdAt}</span>
                  <span style={styles.views}>조회 {post.views}</span>
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
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginBottom: '16px',
  },
  writeButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 20px',
    backgroundColor: colors.primary,
    color: colors.white,
    borderRadius: '8px',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: 500,
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
  },
  item: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 0',
    borderBottom: `1px solid ${colors.neutral200}`,
    textDecoration: 'none',
    gap: '16px',
  },
  itemMain: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flex: 1,
  },
  category: {
    padding: '3px 8px',
    backgroundColor: colors.neutral100,
    color: colors.neutral600,
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 500,
  },
  title: {
    fontSize: '15px',
    color: colors.neutral900,
    fontWeight: 500,
  },
  commentCount: {
    fontSize: '13px',
    color: colors.primary,
    fontWeight: 600,
  },
  itemMeta: {
    display: 'flex',
    gap: '12px',
    flexShrink: 0,
  },
  author: {
    fontSize: '13px',
    color: colors.neutral600,
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
