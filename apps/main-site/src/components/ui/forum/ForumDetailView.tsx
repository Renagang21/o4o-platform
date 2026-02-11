/**
 * ForumDetailView - Forum Post Detail Component
 *
 * Displays a single forum post with comments and related posts.
 * Uses CSS variables for theming (cosmetics theme support).
 */

'use client';

import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  getForumPost,
  getForumComments,
  getForumPosts,
  type ForumPost,
  type ForumComment,
} from '@/lib/cms/client';
import { formatRelativeTime, formatFullDate } from './utils';

interface ForumDetailViewProps {
  showRelatedPosts?: boolean;
  relatedPostsLimit?: number;
  showComments?: boolean;
  commentsPerPage?: number;
}

export function ForumDetailView({
  showRelatedPosts = true,
  relatedPostsLimit = 5,
  showComments = true,
  commentsPerPage = 20,
}: ForumDetailViewProps) {
  const { id } = useParams<{ id: string }>();
  const [post, setPost] = useState<ForumPost | null>(null);
  const [comments, setComments] = useState<ForumComment[]>([]);
  const [relatedPosts, setRelatedPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [totalComments, setTotalComments] = useState(0);
  const [hasMoreComments, setHasMoreComments] = useState(false);
  const [commentPage, setCommentPage] = useState(1);

  useEffect(() => {
    async function loadPost() {
      if (!id) return;

      setLoading(true);
      try {
        const postData = await getForumPost(id);
        setPost(postData);

        if (postData) {
          // Load comments and related posts in parallel
          const [commentsData, relatedData] = await Promise.all([
            showComments
              ? getForumComments(postData.id, { sortBy: 'newest', limit: commentsPerPage })
              : Promise.resolve({ comments: [], total: 0, hasMore: false }),
            showRelatedPosts && postData.categoryId
              ? getForumPosts({
                  categoryId: postData.categoryId,
                  sortBy: 'popular',
                  limit: relatedPostsLimit + 1,
                })
              : Promise.resolve({ posts: [] }),
          ]);

          setComments(commentsData.comments);
          setTotalComments(commentsData.total);
          setHasMoreComments(commentsData.hasMore);

          // Filter out current post from related
          const filtered = relatedData.posts
            .filter((p) => p.id !== postData.id)
            .slice(0, relatedPostsLimit);
          setRelatedPosts(filtered);
        }
      } catch (error) {
        console.error('Error loading post:', error);
      } finally {
        setLoading(false);
      }
    }

    loadPost();
  }, [id, showComments, showRelatedPosts, relatedPostsLimit, commentsPerPage]);

  const loadMoreComments = async () => {
    if (!post || commentsLoading || !hasMoreComments) return;

    setCommentsLoading(true);
    try {
      const nextPage = commentPage + 1;
      const data = await getForumComments(post.id, {
        sortBy: 'newest',
        limit: commentsPerPage,
        page: nextPage,
      });

      setComments((prev) => [...prev, ...data.comments]);
      setHasMoreComments(data.hasMore);
      setCommentPage(nextPage);
    } catch (error) {
      console.error('Error loading more comments:', error);
    } finally {
      setCommentsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--forum-primary)]"></div>
      </div>
    );
  }

  if (!post) {
    return (
      <div
        className="text-center py-12 rounded-lg border"
        style={{
          backgroundColor: 'var(--forum-bg-secondary)',
          borderColor: 'var(--forum-border-light)',
        }}
      >
        <p style={{ color: 'var(--forum-text-muted)' }}>게시글을 찾을 수 없습니다.</p>
        <Link
          to="/forum"
          className="inline-block mt-4 px-4 py-2 rounded-lg"
          style={{
            backgroundColor: 'var(--forum-primary)',
            color: '#ffffff',
          }}
        >
          목록으로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="forum-detail py-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-3">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm mb-4" style={{ color: 'var(--forum-text-muted)' }}>
            <Link to="/forum" className="hover:underline" style={{ color: 'var(--forum-text-link)' }}>
              포럼
            </Link>
            <span>/</span>
            {post.categoryName && (
              <>
                <Link
                  to={`/forum/category/${post.categoryId}`}
                  className="hover:underline"
                  style={{ color: 'var(--forum-text-link)' }}
                >
                  {post.categoryName}
                </Link>
                <span>/</span>
              </>
            )}
            <span style={{ color: 'var(--forum-text-secondary)' }}>{post.title}</span>
          </nav>

          {/* Post Article */}
          <article
            className="rounded-lg border overflow-hidden"
            style={{
              backgroundColor: 'var(--forum-bg-primary)',
              borderColor: 'var(--forum-border-light)',
            }}
          >
            {/* Header */}
            <header className="p-6 border-b" style={{ borderColor: 'var(--forum-border-light)' }}>
              {/* Badges */}
              <div className="flex items-center gap-2 mb-2">
                {post.isPinned && (
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                    style={{
                      backgroundColor: 'var(--forum-badge-pinned-bg)',
                      color: 'var(--forum-badge-pinned-text)',
                    }}
                  >
                    고정
                  </span>
                )}
                {post.isLocked && (
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                    style={{
                      backgroundColor: 'var(--forum-badge-locked-bg)',
                      color: 'var(--forum-badge-locked-text)',
                    }}
                  >
                    잠금
                  </span>
                )}
                {post.categoryName && (
                  <Link
                    to={`/forum/category/${post.categoryId}`}
                    className="text-xs hover:underline"
                    style={{ color: 'var(--forum-text-link)' }}
                  >
                    {post.categoryName}
                  </Link>
                )}
              </div>

              {/* Title */}
              <h1
                className="text-2xl font-bold mb-4"
                style={{ color: 'var(--forum-text-primary)' }}
              >
                {post.title}
              </h1>

              {/* Author & Meta */}
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-medium overflow-hidden"
                  style={{
                    backgroundColor: 'var(--forum-bg-tertiary)',
                    color: 'var(--forum-text-secondary)',
                  }}
                >
                  {post.author?.avatar ? (
                    <img src={post.author.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    (post.author?.name || '익명').charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <p className="font-medium" style={{ color: 'var(--forum-text-primary)' }}>
                    {post.author?.name || '익명'}
                  </p>
                  <p className="text-sm" style={{ color: 'var(--forum-text-muted)' }}>
                    {formatFullDate(post.createdAt)}
                  </p>
                </div>
              </div>
            </header>

            {/* Content */}
            <div className="p-6">
              <ContentRenderer content={post.content} />
            </div>

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className="px-6 pb-4">
                <div className="flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <Link
                      key={tag}
                      to={`/forum/tag/${tag}`}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm hover:opacity-80 transition-opacity"
                      style={{
                        backgroundColor: 'var(--forum-bg-tertiary)',
                        color: 'var(--forum-text-secondary)',
                      }}
                    >
                      #{tag}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Footer Stats */}
            <footer
              className="px-6 py-4 border-t flex items-center gap-6"
              style={{ borderColor: 'var(--forum-border-light)' }}
            >
              <span className="flex items-center gap-1" style={{ color: 'var(--forum-text-muted)' }}>
                <span>👁️</span> {post.viewCount} 조회
              </span>
              <span className="flex items-center gap-1" style={{ color: 'var(--forum-text-muted)' }}>
                <span>💬</span> {post.commentCount} 댓글
              </span>
              <span className="flex items-center gap-1" style={{ color: 'var(--forum-like-inactive)' }}>
                <span>❤️</span> {post.likeCount} 좋아요
              </span>
            </footer>
          </article>

          {/* Comments Section */}
          {showComments && (
            <section className="mt-6">
              <h2
                className="text-xl font-bold mb-4"
                style={{ color: 'var(--forum-text-primary)' }}
              >
                댓글 {totalComments}개
              </h2>

              {/* Comment List */}
              <div className="space-y-4">
                {comments.map((comment) => (
                  <CommentCard key={comment.id} comment={comment} />
                ))}
              </div>

              {/* Load More */}
              {hasMoreComments && (
                <div className="text-center mt-4">
                  <button
                    onClick={loadMoreComments}
                    disabled={commentsLoading}
                    className="px-6 py-2 rounded-lg transition-colors"
                    style={{
                      backgroundColor: 'var(--forum-bg-tertiary)',
                      color: 'var(--forum-text-secondary)',
                    }}
                  >
                    {commentsLoading ? '로딩중...' : '더보기'}
                  </button>
                </div>
              )}

              {/* Empty State */}
              {comments.length === 0 && (
                <div
                  className="text-center py-8 rounded-lg border"
                  style={{
                    backgroundColor: 'var(--forum-bg-secondary)',
                    borderColor: 'var(--forum-border-light)',
                  }}
                >
                  <p style={{ color: 'var(--forum-text-muted)' }}>첫 번째 댓글을 남겨보세요!</p>
                </div>
              )}
            </section>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          {/* Related Posts */}
          {showRelatedPosts && relatedPosts.length > 0 && (
            <div
              className="rounded-lg border p-4"
              style={{
                backgroundColor: 'var(--forum-bg-primary)',
                borderColor: 'var(--forum-border-light)',
              }}
            >
              <h3 className="font-semibold mb-3" style={{ color: 'var(--forum-text-primary)' }}>
                관련 게시글
              </h3>
              <ul className="space-y-3">
                {relatedPosts.map((relatedPost) => (
                  <li key={relatedPost.id}>
                    <Link
                      to={`/forum/post/${relatedPost.slug || relatedPost.id}`}
                      className="block hover:opacity-80 transition-opacity"
                    >
                      <p
                        className="text-sm font-medium line-clamp-2"
                        style={{ color: 'var(--forum-text-primary)' }}
                      >
                        {relatedPost.title}
                      </p>
                      <p className="text-xs mt-1" style={{ color: 'var(--forum-text-muted)' }}>
                        {formatRelativeTime(relatedPost.createdAt)} · 조회 {relatedPost.viewCount}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Back to List */}
          <Link
            to="/forum"
            className="block w-full text-center px-4 py-3 rounded-lg font-medium transition-colors mt-4"
            style={{
              backgroundColor: 'var(--forum-bg-tertiary)',
              color: 'var(--forum-text-secondary)',
            }}
          >
            목록으로
          </Link>
        </div>
      </div>
    </div>
  );
}

function ContentRenderer({ content }: { content: any[] }) {
  if (!Array.isArray(content)) {
    return <p style={{ color: 'var(--forum-text-secondary)' }}>{String(content)}</p>;
  }

  return (
    <div className="prose max-w-none" style={{ color: 'var(--forum-text-secondary)' }}>
      {content.map((block, index) => {
        switch (block.type) {
          case 'paragraph':
            return (
              <p key={index} className="mb-4">
                {renderInlineContent(block.content)}
              </p>
            );
          case 'heading':
            const HeadingTag = `h${block.attrs?.level || 2}` as React.ElementType;
            return (
              <HeadingTag
                key={index}
                className="font-bold mb-3"
                style={{ color: 'var(--forum-text-primary)' }}
              >
                {renderInlineContent(block.content)}
              </HeadingTag>
            );
          case 'bulletList':
            return (
              <ul key={index} className="list-disc list-inside mb-4">
                {block.content?.map((item: any, i: number) => (
                  <li key={i}>{renderInlineContent(item.content?.[0]?.content)}</li>
                ))}
              </ul>
            );
          case 'orderedList':
            return (
              <ol key={index} className="list-decimal list-inside mb-4">
                {block.content?.map((item: any, i: number) => (
                  <li key={i}>{renderInlineContent(item.content?.[0]?.content)}</li>
                ))}
              </ol>
            );
          case 'blockquote':
            return (
              <blockquote
                key={index}
                className="border-l-4 pl-4 italic mb-4"
                style={{ borderColor: 'var(--forum-primary)', color: 'var(--forum-text-muted)' }}
              >
                {renderInlineContent(block.content?.[0]?.content)}
              </blockquote>
            );
          case 'codeBlock':
            return (
              <pre
                key={index}
                className="rounded-lg p-4 overflow-x-auto mb-4"
                style={{ backgroundColor: 'var(--forum-bg-tertiary)' }}
              >
                <code className="text-sm">{block.content?.[0]?.text || ''}</code>
              </pre>
            );
          case 'image':
            return (
              <figure key={index} className="mb-4">
                <img
                  src={block.attrs?.src}
                  alt={block.attrs?.alt || ''}
                  className="rounded-lg max-w-full h-auto"
                />
                {block.attrs?.caption && (
                  <figcaption className="text-center text-sm mt-2" style={{ color: 'var(--forum-text-muted)' }}>
                    {block.attrs.caption}
                  </figcaption>
                )}
              </figure>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}

function renderInlineContent(content: any): React.ReactNode {
  if (!content) return null;
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return String(content);

  return content.map((item, index) => {
    if (typeof item === 'string') return item;
    if (item.type === 'text') {
      let text: React.ReactNode = item.text;
      if (item.marks) {
        item.marks.forEach((mark: any) => {
          switch (mark.type) {
            case 'bold':
              text = <strong key={index}>{text}</strong>;
              break;
            case 'italic':
              text = <em key={index}>{text}</em>;
              break;
            case 'link':
              text = (
                <a
                  key={index}
                  href={mark.attrs?.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--forum-text-link)' }}
                >
                  {text}
                </a>
              );
              break;
            case 'code':
              text = (
                <code
                  key={index}
                  className="px-1 rounded"
                  style={{ backgroundColor: 'var(--forum-bg-tertiary)' }}
                >
                  {text}
                </code>
              );
              break;
          }
        });
      }
      return <span key={index}>{text}</span>;
    }
    return null;
  });
}

function CommentCard({ comment }: { comment: ForumComment }) {
  return (
    <div
      className="rounded-lg border p-4"
      style={{
        backgroundColor: 'var(--forum-bg-primary)',
        borderColor: 'var(--forum-border-light)',
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium overflow-hidden flex-shrink-0"
          style={{
            backgroundColor: 'var(--forum-bg-tertiary)',
            color: 'var(--forum-text-secondary)',
          }}
        >
          {comment.authorAvatar ? (
            <img src={comment.authorAvatar} alt="" className="w-full h-full object-cover" />
          ) : (
            (comment.authorName || '익명').charAt(0).toUpperCase()
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium" style={{ color: 'var(--forum-text-primary)' }}>
              {comment.authorName || '익명'}
            </span>
            <span className="text-xs" style={{ color: 'var(--forum-text-muted)' }}>
              {formatRelativeTime(comment.createdAt)}
            </span>
          </div>
          <div style={{ color: 'var(--forum-text-secondary)' }}>
            <ContentRenderer content={comment.content} />
          </div>
          <div className="flex items-center gap-4 mt-2">
            <button
              className="text-xs flex items-center gap-1 hover:opacity-80"
              style={{ color: 'var(--forum-text-muted)' }}
            >
              ❤️ {comment.likeCount}
            </button>
            <button
              className="text-xs hover:opacity-80"
              style={{ color: 'var(--forum-text-muted)' }}
            >
              답글
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ForumDetailView;
