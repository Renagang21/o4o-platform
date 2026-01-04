/**
 * ForumListPage - 포럼 목록 페이지
 */

import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageHeader, LoadingSpinner, EmptyState, Pagination, Card } from '../../components/common';
import { forumApi } from '../../api';
import { colors, typography } from '../../styles/theme';
import type { ForumPost, ForumCategory } from '../../types';

export function ForumListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);

  const currentPage = parseInt(searchParams.get('page') || '1');
  const currentCategory = searchParams.get('category') || '';
  const searchQuery = searchParams.get('search') || '';

  useEffect(() => {
    loadData();
  }, [currentPage, currentCategory, searchQuery]);

  const loadData = async () => {
    try {
      setLoading(true);

      const [postsRes, categoriesRes] = await Promise.all([
        forumApi.getPosts({
          categoryId: currentCategory || undefined,
          page: currentPage,
          limit: 20,
          search: searchQuery || undefined,
        }),
        forumApi.getCategories(),
      ]);

      setPosts(postsRes.data || []);
      setTotalPages(postsRes.totalPages || 1);
      setCategories(categoriesRes.data || []);
    } catch (err) {
      // API 오류 시 빈 목록 표시 (서비스 준비 중)
      console.warn('Forum API not available:', err);
      setPosts([]);
      setCategories([]);
      setTotalPages(1);
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

  const handleCategoryChange = (categoryId: string) => {
    setSearchParams(prev => {
      if (categoryId) {
        prev.set('category', categoryId);
      } else {
        prev.delete('category');
      }
      prev.set('page', '1');
      return prev;
    });
  };

  if (loading) {
    return <LoadingSpinner message="게시글을 불러오는 중..." />;
  }

  return (
    <div style={styles.container}>
      <PageHeader
        title="포럼"
        description="회원들과 자유롭게 의견을 나눠보세요"
        breadcrumb={[{ label: '홈', href: '/' }, { label: '포럼' }]}
      />

      <div style={styles.toolbar}>
        <div style={styles.categories}>
          <button
            style={{
              ...styles.categoryButton,
              ...(currentCategory === '' ? styles.categoryButtonActive : {}),
            }}
            onClick={() => handleCategoryChange('')}
          >
            전체
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              style={{
                ...styles.categoryButton,
                ...(currentCategory === cat.id ? styles.categoryButtonActive : {}),
              }}
              onClick={() => handleCategoryChange(cat.id)}
            >
              {cat.name}
            </button>
          ))}
        </div>

        <Link to="/forum/write" style={styles.writeButton}>
          글쓰기
        </Link>
      </div>

      {posts.length === 0 ? (
        <EmptyState
          icon="📝"
          title="게시글이 없습니다"
          description="첫 번째 글을 작성해보세요!"
          action={{ label: '글쓰기', onClick: () => window.location.href = '/forum/write' }}
        />
      ) : (
        <>
          <div style={styles.postList}>
            {posts.map(post => (
              <Link key={post.id} to={`/forum/post/${post.id}`} style={styles.postLink}>
                <Card hover padding="medium">
                  <div style={styles.postHeader}>
                    {post.isPinned && <span style={styles.pinnedBadge}>공지</span>}
                    <span style={styles.categoryBadge}>{post.categoryName}</span>
                  </div>
                  <h3 style={styles.postTitle}>{post.title}</h3>
                  {post.excerpt && <p style={styles.postExcerpt}>{post.excerpt}</p>}
                  <div style={styles.postMeta}>
                    <span>{post.authorName}</span>
                    <span>·</span>
                    <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                    <span>·</span>
                    <span>조회 {post.viewCount}</span>
                    <span>·</span>
                    <span>댓글 {post.commentCount}</span>
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
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '16px',
  },
  categories: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  categoryButton: {
    padding: '8px 16px',
    backgroundColor: colors.white,
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '20px',
    fontSize: '14px',
    color: colors.neutral700,
    cursor: 'pointer',
  },
  categoryButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    color: colors.white,
  },
  writeButton: {
    padding: '10px 20px',
    backgroundColor: colors.primary,
    color: colors.white,
    textDecoration: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 500,
  },
  postList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  postLink: {
    textDecoration: 'none',
    color: 'inherit',
  },
  postHeader: {
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
  categoryBadge: {
    padding: '2px 8px',
    backgroundColor: colors.neutral100,
    color: colors.neutral700,
    borderRadius: '4px',
    fontSize: '12px',
  },
  postTitle: {
    ...typography.headingS,
    color: colors.neutral900,
    margin: 0,
  },
  postExcerpt: {
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
  postMeta: {
    display: 'flex',
    gap: '8px',
    marginTop: '12px',
    ...typography.bodyS,
    color: colors.neutral500,
  },
};
