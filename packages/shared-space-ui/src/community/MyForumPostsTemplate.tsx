/**
 * MyForumPostsTemplate — "내가 쓴 글" 공통 View
 *
 * WO-O4O-COMMUNITY-PHARMACYHUB-BASELINE-AND-CROSSSERVICE-MYPOSTS-ADOPTION-V1 §11
 *
 * 5서비스(KPA-Society / K-Cosmetics / GlycoPharm / PharmacyHub / Neture)의 My Posts
 * 화면을 단일 View 로 공통화한다. 서비스 wrapper 는 fetch / route / config 만 담당한다.
 *
 * - 순수 presentational: fetch/router/API client 를 import 하지 않는다.
 * - 목록/날짜/좋아요/댓글/pagination 은 ForumListTemplate 재사용(중복 table JSX 금지).
 * - 본인 글만 표시되는 화면이므로 작성자 컬럼은 숨긴다(showAuthor=false).
 * - draft/pending 등 비공개 상태는 item.statusLabel 배지로 표시한다.
 */
import type { ReactNode } from 'react';
import type { ForumListItem } from '../forumListItem';
import { ForumListTemplate } from '../ForumListTemplate';

export interface MyForumPostsTemplateProps {
  /** 화면 제목 (기본 '내가 쓴 글') */
  title?: string;
  /** 제목 아래 설명 */
  description?: string;

  posts: ForumListItem[];
  totalCount?: number;

  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPostClick: (post: ForumListItem) => void;

  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;

  /** 미로그인 상태 안내 slot (wrapper 가 로그인 CTA 를 넣는다) */
  renderUnauthenticated?: () => ReactNode;
  isAuthenticated?: boolean;

  /** 빈 목록 slot (글쓰기 CTA 등). 미전달 시 기본 문구 */
  renderEmpty?: () => ReactNode;

  /** 우측 상단 액션 slot (글쓰기 버튼 등) */
  headerRightSlot?: ReactNode;

  showPostType?: boolean;
  renderTypeBadge?: (post: ForumListItem) => ReactNode;
  showLikeCount?: boolean;
  showCommentCount?: boolean;
  accentColor?: string;
}

export function MyForumPostsTemplate({
  title = '내가 쓴 글',
  description,
  posts,
  totalCount,
  currentPage,
  totalPages,
  onPageChange,
  onPostClick,
  loading = false,
  error = null,
  onRetry,
  renderUnauthenticated,
  isAuthenticated = true,
  renderEmpty,
  headerRightSlot,
  showPostType = false,
  renderTypeBadge,
  showLikeCount = true,
  showCommentCount = true,
  accentColor = '#2563EB',
}: MyForumPostsTemplateProps) {
  const renderTitleBadge = (post: ForumListItem) =>
    post.statusLabel ? (
      <span className="inline-block px-1.5 py-0.5 text-[11px] font-semibold rounded bg-slate-100 text-slate-600 mr-1.5">
        {post.statusLabel}
      </span>
    ) : null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 m-0">{title}</h1>
          {description && <p className="mt-1.5 mb-0 text-sm text-slate-500">{description}</p>}
          {isAuthenticated && !loading && !error && typeof totalCount === 'number' && (
            <p className="mt-1.5 mb-0 text-xs text-slate-400">총 {totalCount}건</p>
          )}
        </div>
        {headerRightSlot}
      </div>

      {!isAuthenticated ? (
        <div className="py-16 px-5 text-center bg-white rounded-lg border border-slate-200">
          {renderUnauthenticated ? (
            renderUnauthenticated()
          ) : (
            <p className="text-sm text-slate-500 m-0">로그인 후 내가 쓴 글을 확인할 수 있습니다.</p>
          )}
        </div>
      ) : (
        <ForumListTemplate
          posts={posts}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
          onPostClick={onPostClick}
          loading={loading}
          error={error}
          onRetry={onRetry}
          showAuthor={false}
          showPostType={showPostType}
          renderTypeBadge={renderTypeBadge}
          renderTitleBadge={renderTitleBadge}
          showLikeCount={showLikeCount}
          showCommentCount={showCommentCount}
          accentColor={accentColor}
          renderEmpty={
            renderEmpty ??
            (() => <p className="text-sm text-slate-500 m-0">아직 작성한 글이 없습니다.</p>)
          }
        />
      )}
    </div>
  );
}

export default MyForumPostsTemplate;
