/**
 * BranchForumDetailPage - 분회 포럼 게시글 상세
 */

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toast } from '@o4o/error-handling';
import { PageHeader, LoadingSpinner, EmptyState, Card } from '../../components/common';
import { ForumBlockRenderer } from '@o4o/forum-core/public-ui';
import { ContentRenderer } from '@o4o/content-editor';

import { useAuth } from '../../contexts';
import { useBranchContext } from '../../contexts/BranchContext';
import { branchApi } from '../../api/branch';
import { colors } from '../../styles/theme';
import type { ForumPost, Comment } from '../../types';

export function BranchForumDetailPage() {
  const { branchId, id } = useParams<{ branchId: string; id: string }>();
  const { basePath } = useBranchContext();
  const { user } = useAuth();
  const [post, setPost] = useState<ForumPost | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, [branchId, id]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await branchApi.getForumPostDetail(branchId!, id!);
      setPost(res.data.post);
      setComments(res.data.comments || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;

    try {
      setSubmitting(true);
      await branchApi.createComment(branchId!, id!, { content: newComment });
      setNewComment('');
      loadData();
    } catch (err) {
      toast.error('댓글 작성에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="게시글을 불러오는 중..." />;
  }

  if (error || !post) {
    return (
      <div style={styles.container}>
        <EmptyState
          icon="⚠️"
          title="게시글을 찾을 수 없습니다"
          description={error || '요청하신 게시글이 존재하지 않습니다.'}
          action={{ label: '목록으로', onClick: () => window.history.back() }}
        />
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <PageHeader
        title="포럼"
        breadcrumb={[
          { label: '홈', href: `${basePath}` },
          { label: '포럼', href: `${basePath}/forum` },
          { label: post.title },
        ]}
      />

      {/* Post */}
      <Card padding="large">
        <div style={styles.postHeader}>
          <span style={styles.category}>{post.categoryName || '일반'}</span>
          <h1 style={styles.title}>{post.title}</h1>
          <div style={styles.meta}>
            <span style={styles.author}>{post.authorName}</span>
            <span>•</span>
            <span>{post.createdAt}</span>
            <span>•</span>
            <span>조회 {post.views}</span>
          </div>
        </div>

        <div style={styles.content}>
          {Array.isArray(post.content) ? (
            <ForumBlockRenderer content={post.content} />
          ) : (
            <ContentRenderer html={post.content} />
          )}
        </div>

        <div style={styles.postActions}>
          <button style={styles.likeButton}>
            👍 좋아요 {post.likes || 0}
          </button>
        </div>
      </Card>

      {/* Comments */}
      <div style={styles.commentsSection}>
        <h3 style={styles.commentsTitle}>댓글 {comments.length}개</h3>

        {/* Comment Form */}
        {user ? (
          <form onSubmit={handleSubmitComment} style={styles.commentForm}>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="댓글을 작성하세요..."
              style={styles.commentInput}
              rows={3}
            />
            <button
              type="submit"
              style={styles.commentSubmit}
              disabled={submitting || !newComment.trim()}
            >
              {submitting ? '작성 중...' : '댓글 작성'}
            </button>
          </form>
        ) : (
          <div style={styles.loginPrompt}>
            댓글을 작성하려면 로그인이 필요합니다.
          </div>
        )}

        {/* Comments List */}
        <div style={styles.commentsList}>
          {comments.length === 0 ? (
            <div style={styles.noComments}>첫 번째 댓글을 작성해 보세요.</div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} style={styles.comment}>
                <div style={styles.commentHeader}>
                  <span style={styles.commentAuthor}>{comment.authorName}</span>
                  <span style={styles.commentDate}>{comment.createdAt}</span>
                </div>
                <p style={styles.commentContent}>{comment.content}</p>
              </div>
            ))
          )}
        </div>
      </div>

      <div style={styles.actions}>
        <Link to={`${basePath}/forum`} style={styles.backButton}>
          ← 목록으로
        </Link>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '0 20px 40px',
  },
  postHeader: {
    marginBottom: '24px',
    paddingBottom: '20px',
    borderBottom: `1px solid ${colors.neutral200}`,
  },
  category: {
    display: 'inline-block',
    padding: '4px 10px',
    backgroundColor: colors.neutral100,
    color: colors.neutral600,
    borderRadius: '4px',
    fontSize: '13px',
    fontWeight: 500,
    marginBottom: '12px',
  },
  title: {
    fontSize: '22px',
    fontWeight: 600,
    color: colors.neutral900,
    marginBottom: '12px',
    lineHeight: 1.4,
  },
  meta: {
    display: 'flex',
    gap: '8px',
    fontSize: '14px',
    color: colors.neutral500,
  },
  author: {
    fontWeight: 500,
    color: colors.neutral700,
  },
  content: {
    fontSize: '16px',
    lineHeight: 1.8,
    color: colors.neutral800,
    minHeight: '150px',
  },
  postActions: {
    marginTop: '24px',
    paddingTop: '16px',
    borderTop: `1px solid ${colors.neutral200}`,
  },
  likeButton: {
    padding: '10px 20px',
    backgroundColor: colors.neutral100,
    color: colors.neutral700,
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  commentsSection: {
    marginTop: '32px',
  },
  commentsTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: colors.neutral900,
    marginBottom: '16px',
  },
  commentForm: {
    marginBottom: '24px',
  },
  commentInput: {
    width: '100%',
    padding: '14px',
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '8px',
    fontSize: '14px',
    resize: 'vertical',
    marginBottom: '12px',
    boxSizing: 'border-box',
  },
  commentSubmit: {
    padding: '10px 24px',
    backgroundColor: colors.primary,
    color: colors.white,
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  loginPrompt: {
    padding: '20px',
    backgroundColor: colors.neutral100,
    borderRadius: '8px',
    textAlign: 'center',
    color: colors.neutral600,
    fontSize: '14px',
    marginBottom: '24px',
  },
  commentsList: {},
  noComments: {
    padding: '40px',
    textAlign: 'center',
    color: colors.neutral500,
    fontSize: '14px',
  },
  comment: {
    padding: '16px',
    backgroundColor: colors.neutral50,
    borderRadius: '8px',
    marginBottom: '12px',
  },
  commentHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
  },
  commentAuthor: {
    fontSize: '14px',
    fontWeight: 600,
    color: colors.neutral700,
  },
  commentDate: {
    fontSize: '13px',
    color: colors.neutral500,
  },
  commentContent: {
    fontSize: '14px',
    lineHeight: 1.6,
    color: colors.neutral800,
    margin: 0,
  },
  actions: {
    marginTop: '24px',
  },
  backButton: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '12px 24px',
    backgroundColor: colors.neutral100,
    color: colors.neutral700,
    borderRadius: '8px',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: 500,
  },
};
