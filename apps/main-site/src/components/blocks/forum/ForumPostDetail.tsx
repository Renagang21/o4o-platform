/**
 * ForumPostDetail Block Renderer
 *
 * Renders a single forum post with full content and actions.
 * Uses injected data from CMSBlockWrapper.
 * Styled with CMS Theme tokens (CSS variables).
 */

'use client';

import { BlockRendererProps } from '../BlockRenderer';
import { forumStyles } from './theme';

interface Block {
  id: string;
  type: string;
  content: any;
  attributes?: Record<string, unknown>;
}

interface ForumAuthor {
  id: string;
  name: string;
  avatar?: string;
  bio?: string;
  postCount?: number;
}

interface ForumPost {
  id: string;
  title: string;
  slug: string;
  content: Block[];
  excerpt?: string;
  authorId: string;
  author?: ForumAuthor;
  categoryId: string;
  categoryName?: string;
  isPinned: boolean;
  isLocked: boolean;
  viewCount: number;
  commentCount: number;
  likeCount: number;
  isLiked?: boolean;
  isBookmarked?: boolean;
  createdAt: string;
  publishedAt?: string;
  tags?: string[];
}

interface RelatedPost {
  id: string;
  title: string;
  slug: string;
  createdAt: string;
}

interface ForumPostDetailData {
  post: ForumPost;
  relatedPosts: RelatedPost[];
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

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days > 7) return date.toLocaleDateString('ko-KR');
  if (days > 0) return `${days}일 전`;
  return '오늘';
}

const renderBlock = (block: Block, index: number) => {
  const content = typeof block.content === 'string' ? block.content : block.content?.text || '';

  switch (block.type) {
    case 'paragraph':
      return (
        <p key={block.id || index} className="mb-4 leading-relaxed" style={forumStyles.text}>
          {content}
        </p>
      );
    case 'heading':
      const level = (block.attributes?.level as number) || 2;
      const HeadingTag = `h${level}` as React.ElementType;
      const headingClasses: Record<number, string> = {
        1: 'text-3xl font-bold',
        2: 'text-2xl font-semibold',
        3: 'text-xl font-semibold',
        4: 'text-lg font-medium',
      };
      return (
        <HeadingTag
          key={block.id || index}
          className={`mb-3 ${headingClasses[level] || 'text-lg font-medium'}`}
          style={forumStyles.heading}
        >
          {content}
        </HeadingTag>
      );
    case 'quote':
    case 'blockquote':
      return (
        <blockquote
          key={block.id || index}
          className="border-l-4 pl-4 py-2 mb-4 italic"
          style={{ borderColor: 'var(--forum-primary)', color: 'var(--forum-text-secondary)' }}
        >
          {content}
        </blockquote>
      );
    case 'image':
      const src = block.attributes?.src || block.content?.src || '';
      const alt = block.attributes?.alt || block.content?.alt || '';
      return src ? (
        <figure key={block.id || index} className="mb-4">
          <img src={src} alt={alt} className="w-full rounded-lg" loading="lazy" />
        </figure>
      ) : null;
    default:
      return content ? (
        <div key={block.id || index} className="mb-4" style={forumStyles.text}>
          {content}
        </div>
      ) : null;
  }
};

export const ForumPostDetailBlock = ({ node }: BlockRendererProps) => {
  const {
    showAuthor = true,
    showDate = true,
    showStats = true,
    showTags = true,
    showActions = true,
    showRelatedPosts = true,
    relatedPostsLimit = 5,
    data,
  } = node.props;

  const detailData: ForumPostDetailData = data || {
    post: {
      id: '',
      title: '게시글을 불러오는 중...',
      slug: '',
      content: [],
      authorId: '',
      categoryId: '',
      isPinned: false,
      isLocked: false,
      viewCount: 0,
      commentCount: 0,
      likeCount: 0,
      createdAt: new Date().toISOString(),
    },
    relatedPosts: [],
  };

  const { post, relatedPosts } = detailData;

  return (
    <div className="forum-post-detail py-6">
      {/* Post Header */}
      <header className="mb-6">
        <nav className="text-sm mb-4" style={forumStyles.textMuted}>
          <a href="/forum" className="hover:underline" style={forumStyles.link}>포럼</a>
          <span className="mx-2">/</span>
          <a href={`/forum/category/${post.categoryId}`} className="hover:underline" style={forumStyles.link}>
            {post.categoryName || '카테고리'}
          </a>
        </nav>

        <div className="flex items-center gap-2 mb-2">
          {post.isPinned && (
            <span
              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
              style={forumStyles.badgePinned}
            >
              고정
            </span>
          )}
          {post.isLocked && (
            <span
              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
              style={forumStyles.badgeLocked}
            >
              잠금
            </span>
          )}
        </div>

        <h1 className="text-2xl md:text-3xl font-bold mb-4" style={forumStyles.heading}>
          {post.title}
        </h1>

        <div className="flex items-center gap-4 text-sm" style={forumStyles.textMuted}>
          {showAuthor && post.author && (
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium overflow-hidden"
                style={forumStyles.avatar}
              >
                {post.author.avatar ? (
                  <img src={post.author.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  post.author.name?.charAt(0).toUpperCase() || 'U'
                )}
              </div>
              <span className="font-medium" style={forumStyles.heading}>{post.author.name}</span>
            </div>
          )}
          {showDate && <span>{formatDate(post.publishedAt || post.createdAt)}</span>}
          {showStats && <span>조회 {post.viewCount}</span>}
        </div>
      </header>

      {/* Post Content */}
      <article className="prose prose-lg max-w-none mb-8">
        {post.content.map((block, index) => renderBlock(block, index))}
      </article>

      {/* Tags */}
      {showTags && post.tags && post.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {post.tags.map((tag) => (
            <a
              key={tag}
              href={`/forum/tag/${tag}`}
              className="inline-flex items-center px-3 py-1 rounded-full text-sm transition-colors"
              style={forumStyles.bgTertiary}
            >
              #{tag}
            </a>
          ))}
        </div>
      )}

      {/* Actions */}
      {showActions && (
        <div
          className="flex items-center justify-between py-4 border-t border-b mb-8"
          style={forumStyles.borderLight}
        >
          <div className="flex items-center gap-4">
            <button
              className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
              style={post.isLiked ? forumStyles.likeActive : forumStyles.buttonSecondary}
            >
              <span>❤️</span>
              <span>{post.likeCount}</span>
            </button>
            <button
              className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
              style={post.isBookmarked ? forumStyles.bookmarkActive : forumStyles.buttonSecondary}
            >
              <span>🔖</span>
              <span>북마크</span>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
              style={forumStyles.buttonSecondary}
            >
              <span>📤</span>
              <span>공유</span>
            </button>
          </div>
        </div>
      )}

      {/* Author Card */}
      {showAuthor && post.author && (
        <section className="mb-8">
          <div className="flex items-start gap-4 p-4 rounded-lg" style={forumStyles.bgSecondary}>
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-medium overflow-hidden flex-shrink-0"
              style={forumStyles.avatar}
            >
              {post.author.avatar ? (
                <img src={post.author.avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                post.author.name?.charAt(0).toUpperCase() || 'U'
              )}
            </div>
            <div>
              <h4 className="font-semibold" style={forumStyles.heading}>{post.author.name}</h4>
              {post.author.bio && (
                <p className="text-sm mt-1" style={forumStyles.text}>{post.author.bio}</p>
              )}
              {post.author.postCount !== undefined && (
                <p className="text-xs mt-2" style={forumStyles.textMuted}>
                  게시글 {post.author.postCount}개
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Related Posts */}
      {showRelatedPosts && relatedPosts.length > 0 && (
        <section className="mt-8">
          <h3 className="text-lg font-bold mb-4" style={forumStyles.heading}>관련 게시글</h3>
          <div className="space-y-3">
            {relatedPosts.slice(0, relatedPostsLimit).map((relatedPost) => (
              <a
                key={relatedPost.id}
                href={`/forum/post/${relatedPost.slug}`}
                className="block p-4 rounded-lg border transition-shadow hover:shadow-sm"
                style={forumStyles.card}
              >
                <h4 className="font-medium" style={forumStyles.heading}>{relatedPost.title}</h4>
                <span className="text-xs mt-2 block" style={forumStyles.textMuted}>
                  {formatRelativeTime(relatedPost.createdAt)}
                </span>
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
