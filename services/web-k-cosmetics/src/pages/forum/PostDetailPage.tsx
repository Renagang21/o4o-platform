/**
 * PostDetailPage - K-Cosmetics Forum Post Detail
 */

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ContentRenderer } from '@o4o/content-editor';
import {
  fetchForumPostById,
  fetchForumComments,
  getAuthorName,
  type ForumPost,
  type ForumComment,
} from '../../services/forumApi';

// Convert Block[] to HTML for rendering (WO-FORUM-CONTENT-RENDER-UNIFICATION-V1)
function blocksToHtmlInline(blocks: any[]): string {
  return blocks.map((block: any) => {
    const content = typeof block.content === 'string' ? block.content : block.content?.text || '';
    switch (block.type) {
      case 'paragraph': return `<p>${content}</p>`;
      case 'heading': return `<h${block.attributes?.level || 2}>${content}</h${block.attributes?.level || 2}>`;
      case 'quote':
      case 'blockquote': return `<blockquote><p>${content}</p></blockquote>`;
      default: return content ? `<p>${content}</p>` : '';
    }
  }).join('');
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function PostDetailPage() {
  const { postId } = useParams<{ postId: string }>();
  const [post, setPost] = useState<ForumPost | null>(null);
  const [comments, setComments] = useState<ForumComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPost() {
      if (!postId) return;

      setIsLoading(true);
      setError(null);

      try {
        const [postResponse, commentsResponse] = await Promise.all([
          fetchForumPostById(postId),
          fetchForumComments(postId),
        ]);

        if (!postResponse?.data) {
          setError('게시글을 찾을 수 없습니다.');
          return;
        }

        setPost(postResponse.data);
        setComments(commentsResponse.data || []);
      } catch (err) {
        console.error('Error loading post:', err);
        setError('게시글을 불러오지 못했습니다.');
      } finally {
        setIsLoading(false);
      }
    }

    loadPost();
  }, [postId]);

  if (isLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingState}>
          <p>게시글을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div style={styles.container}>
        <div style={styles.errorState}>
          <p>{error || '게시글을 찾을 수 없습니다.'}</p>
        </div>
        <div style={styles.footer}>
          <Link to="/forum" style={styles.backLink}>
            ← 목록으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  // Resolve content to HTML string (WO-FORUM-CONTENT-RENDER-UNIFICATION-V1)
  const contentHtml = Array.isArray(post.content)
    ? blocksToHtmlInline(post.content)
    : (post.content || '');

  return (
    <div style={styles.container}>
      <article style={styles.article}>
        <header style={styles.articleHeader}>
          <h1 style={styles.title}>{post.title}</h1>
          <div style={styles.meta}>
            <span>{getAuthorName(post)}</span>
            <span style={styles.metaDivider}>·</span>
            <span>{formatDate(post.createdAt)}</span>
            {post.commentCount > 0 && (
              <>
                <span style={styles.metaDivider}>·</span>
                <span>댓글 {post.commentCount}</span>
              </>
            )}
          </div>
        </header>

        <div style={styles.content}>
          <ContentRenderer html={contentHtml} />
        </div>
      </article>

      {/* Comments Section */}
      <section style={styles.commentsSection}>
        <h2 style={styles.commentsTitle}>
          댓글 {comments.length}개
        </h2>
        {comments.length > 0 ? (
          <div style={styles.commentsList}>
            {comments.map((comment) => (
              <div key={comment.id} style={styles.comment}>
                <div style={styles.commentMeta}>
                  <span style={styles.commentAuthor}>
                    {comment.author?.nickname || comment.author?.name || '익명'}
                  </span>
                  <span style={styles.commentDate}>
                    {formatDate(comment.createdAt)}
                  </span>
                </div>
                <ContentRenderer
                  html={Array.isArray(comment.content)
                    ? blocksToHtmlInline(comment.content)
                    : (comment.content || '')}
                  style={styles.commentContent}
                />
              </div>
            ))}
          </div>
        ) : (
          <p style={styles.noComments}>아직 댓글이 없습니다.</p>
        )}
      </section>

      <div style={styles.footer}>
        <Link to="/forum" style={styles.backLink}>
          ← 목록으로 돌아가기
        </Link>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '40px 20px',
  },
  loadingState: {
    padding: '60px 20px',
    textAlign: 'center',
    color: '#64748b',
    fontSize: '15px',
  },
  errorState: {
    padding: '40px 20px',
    textAlign: 'center',
    color: '#dc2626',
    fontSize: '15px',
    backgroundColor: '#fef2f2',
    borderRadius: '8px',
    marginBottom: '24px',
  },
  article: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
    marginBottom: '24px',
  },
  articleHeader: {
    padding: '24px',
    borderBottom: '1px solid #f1f5f9',
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#0f172a',
    margin: '0 0 16px 0',
    lineHeight: 1.4,
  },
  meta: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#64748b',
    flexWrap: 'wrap',
  },
  metaDivider: {
    color: '#cbd5e1',
  },
  content: {
    padding: '24px',
  },
  paragraph: {
    fontSize: '16px',
    lineHeight: 1.8,
    color: '#334155',
    margin: '0 0 16px 0',
  },
  commentsSection: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    padding: '24px',
    marginBottom: '24px',
  },
  commentsTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#0f172a',
    margin: '0 0 20px 0',
  },
  commentsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  comment: {
    padding: '16px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
  },
  commentMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '8px',
  },
  commentAuthor: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#334155',
  },
  commentDate: {
    fontSize: '13px',
    color: '#94a3b8',
  },
  commentContent: {
    fontSize: '15px',
    lineHeight: 1.6,
    color: '#475569',
    margin: 0,
  },
  noComments: {
    fontSize: '14px',
    color: '#94a3b8',
    textAlign: 'center',
    padding: '20px 0',
  },
  footer: {
    textAlign: 'center',
  },
  backLink: {
    fontSize: '14px',
    color: '#64748b',
    textDecoration: 'none',
  },
};
