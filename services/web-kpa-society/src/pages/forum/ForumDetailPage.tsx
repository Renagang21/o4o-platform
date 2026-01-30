/**
 * ForumDetailPage - 포럼 상세 페이지
 */

import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ForumBlockRenderer } from '@o4o/forum-core';
import { PageHeader, LoadingSpinner, EmptyState, Card } from '../../components/common';
import { forumApi } from '../../api';
import { useAuth } from '../../contexts';
import { colors, typography } from '../../styles/theme';
import type { ForumPost, ForumComment } from '../../types';

export function ForumDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [post, setPost] = useState<ForumPost | null>(null);
  const [comments, setComments] = useState<ForumComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [postRes, commentsRes] = await Promise.all([
        forumApi.getPost(id!),
        forumApi.getComments(id!),
      ]);

      setPost(postRes.data);
      setComments(commentsRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '게시글을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!post) return;
    try {
      const res = await forumApi.likePost(post.id);
      setPost({ ...post, likeCount: res.data.likeCount });
    } catch (err) {
      alert('좋아요 처리에 실패했습니다.');
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !post) return;

    try {
      setSubmitting(true);
      const res = await forumApi.createComment(post.id, newComment);
      setComments([...comments, res.data]);
      setNewComment('');
    } catch (err) {
      alert('댓글 작성에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!post || !confirm('정말 삭제하시겠습니까?')) return;

    try {
      await forumApi.deletePost(post.id);
      navigate('/forum');
    } catch (err) {
      alert('삭제에 실패했습니다.');
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
          description={error || '삭제되었거나 존재하지 않는 게시글입니다.'}
          action={{ label: '목록으로', onClick: () => navigate('/forum') }}
        />
      </div>
    );
  }

  const isAuthor = user?.id === post.authorId;

  return (
    <div style={styles.container}>
      <PageHeader
        title=""
        breadcrumb={[
          { label: '홈', href: '/' },
          { label: '포럼', href: '/forum' },
          { label: post.categoryName },
        ]}
      />

      <Card padding="large">
        <div style={styles.postHeader}>
          <span style={styles.categoryBadge}>{post.categoryName}</span>
          {post.isPinned && <span style={styles.pinnedBadge}>공지</span>}
        </div>

        <h1 style={styles.title}>{post.title}</h1>

        <div style={styles.meta}>
          <span style={styles.author}>{post.authorName}</span>
          <span style={styles.separator}>·</span>
          <span>{new Date(post.createdAt).toLocaleString()}</span>
          <span style={styles.separator}>·</span>
          <span>조회 {post.viewCount}</span>
        </div>

        <div style={styles.content}>
          {Array.isArray(post.content) ? (
            <ForumBlockRenderer content={post.content} />
          ) : (
            <div dangerouslySetInnerHTML={{ __html: post.content }} />
          )}
        </div>

        <div style={styles.actions}>
          <button style={styles.likeButton} onClick={handleLike}>
            ❤️ 좋아요 {post.likeCount}
          </button>

          {isAuthor && (
            <div style={styles.authorActions}>
              <Link to={`/forum/edit/${post.id}`} style={styles.editButton}>
                수정
              </Link>
              <button style={styles.deleteButton} onClick={handleDelete}>
                삭제
              </button>
            </div>
          )}
        </div>
      </Card>

      {/* 댓글 섹션 */}
      <div style={styles.commentsSection}>
        <h2 style={styles.commentsTitle}>댓글 {comments.length}개</h2>

        {user ? (
          <form onSubmit={handleCommentSubmit} style={styles.commentForm}>
            <textarea
              style={styles.commentInput}
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              placeholder="댓글을 입력하세요"
              rows={3}
            />
            <button
              type="submit"
              style={styles.commentSubmit}
              disabled={submitting || !newComment.trim()}
            >
              {submitting ? '등록 중...' : '댓글 등록'}
            </button>
          </form>
        ) : (
          <p style={styles.loginPrompt}>댓글을 작성하려면 로그인하세요.</p>
        )}

        <div style={styles.commentList}>
          {comments.map(comment => (
            <div key={comment.id} style={styles.commentItem}>
              <div style={styles.commentHeader}>
                <span style={styles.commentAuthor}>{comment.authorName}</span>
                <span style={styles.commentDate}>
                  {new Date(comment.createdAt).toLocaleString()}
                </span>
              </div>
              <p style={styles.commentContent}>{comment.content}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={styles.footer}>
        <Link to="/forum" style={styles.backButton}>
          목록으로
        </Link>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '0 20px 40px',
  },
  postHeader: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px',
  },
  categoryBadge: {
    padding: '4px 12px',
    backgroundColor: colors.neutral100,
    color: colors.neutral700,
    borderRadius: '4px',
    fontSize: '13px',
  },
  pinnedBadge: {
    padding: '4px 12px',
    backgroundColor: colors.accentRed,
    color: colors.white,
    borderRadius: '4px',
    fontSize: '13px',
  },
  title: {
    ...typography.headingXL,
    color: colors.neutral900,
    margin: 0,
    marginBottom: '16px',
  },
  meta: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    ...typography.bodyM,
    color: colors.neutral500,
    paddingBottom: '20px',
    borderBottom: `1px solid ${colors.neutral200}`,
    marginBottom: '24px',
  },
  author: {
    fontWeight: 500,
    color: colors.neutral700,
  },
  separator: {
    color: colors.neutral300,
  },
  content: {
    ...typography.bodyL,
    color: colors.neutral800,
    lineHeight: 1.8,
    minHeight: '200px',
  },
  actions: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '32px',
    paddingTop: '20px',
    borderTop: `1px solid ${colors.neutral200}`,
  },
  likeButton: {
    padding: '10px 20px',
    backgroundColor: colors.neutral50,
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  authorActions: {
    display: 'flex',
    gap: '8px',
  },
  editButton: {
    padding: '8px 16px',
    backgroundColor: colors.neutral100,
    color: colors.neutral700,
    textDecoration: 'none',
    borderRadius: '6px',
    fontSize: '14px',
  },
  deleteButton: {
    padding: '8px 16px',
    backgroundColor: colors.accentRed,
    color: colors.white,
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  commentsSection: {
    marginTop: '32px',
  },
  commentsTitle: {
    ...typography.headingM,
    color: colors.neutral900,
    marginBottom: '20px',
  },
  commentForm: {
    marginBottom: '24px',
  },
  commentInput: {
    width: '100%',
    padding: '12px',
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '8px',
    fontSize: '14px',
    resize: 'vertical',
    marginBottom: '12px',
    boxSizing: 'border-box',
  },
  commentSubmit: {
    padding: '10px 20px',
    backgroundColor: colors.primary,
    color: colors.white,
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  loginPrompt: {
    ...typography.bodyM,
    color: colors.neutral500,
    padding: '20px',
    backgroundColor: colors.neutral50,
    borderRadius: '8px',
    textAlign: 'center',
  },
  commentList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  commentItem: {
    padding: '16px',
    backgroundColor: colors.neutral50,
    borderRadius: '8px',
  },
  commentHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
  },
  commentAuthor: {
    fontWeight: 500,
    color: colors.neutral700,
    fontSize: '14px',
  },
  commentDate: {
    color: colors.neutral500,
    fontSize: '13px',
  },
  commentContent: {
    ...typography.bodyM,
    color: colors.neutral800,
    margin: 0,
  },
  footer: {
    marginTop: '32px',
    textAlign: 'center',
  },
  backButton: {
    padding: '12px 32px',
    backgroundColor: colors.neutral100,
    color: colors.neutral700,
    textDecoration: 'none',
    borderRadius: '6px',
    fontSize: '14px',
  },
};
