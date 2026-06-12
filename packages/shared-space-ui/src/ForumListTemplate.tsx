/**
 * ForumListTemplate — 포럼 목록 공통 presentational 컴포넌트
 *
 * WO-O4O-FORUM-LIST-PAGE-TEMPLATE-V1
 *
 * GP / K-Cosmetics / Neture 사용자-facing forum list 의 반복 table/loading/empty/error +
 * pagination JSX 를 단일 presentational 컴포넌트로 공통화한다.
 *
 * - 순수 presentational: fetch/filter/sort/route 계산을 하지 않는다. `posts: ForumListItem[]`
 *   와 pagination 상태만 받는다. 클릭 시 `onPostClick(post)`(page 가 post.routeTo 로 navigate).
 * - 서비스 차이는 config(showPostType/showLikeCount/accentColor …) + 최소 slot
 *   (renderTypeBadge/renderTitleBadge/renderEmpty)으로 흡수. API client/router 미import.
 * - KPA 는 적용 대상이 아니다(고유 BaseTable/bulk/appreciation 보존).
 */
import type { ReactNode } from 'react';
import type { ForumListItem } from './forumListItem';
import { formatForumDate } from './formatForumDate';
import { HubPagination } from './HubPagination';

export interface ForumListTemplateProps {
  posts: ForumListItem[];
  /** 고정(공지) 섹션 — 목록 상단 별도 블록(page 가 1페이지/무필터일 때만 전달). 미전달 시 미표시. */
  pinnedPosts?: ForumListItem[];

  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** row 클릭 — page 가 post.routeTo 로 navigate */
  onPostClick: (post: ForumListItem) => void;

  loading?: boolean;
  error?: string | null;
  /** 에러 재시도(기본 없음 — 버튼 미표시) */
  onRetry?: () => void;

  /** 빈 목록 렌더(검색결과 없음/글쓰기 CTA 등 page 별 액션 — slot). 미전달 시 기본 문구. */
  renderEmpty?: () => ReactNode;

  /** 유형 배지 컬럼 표시 (K-Cosmetics·Neture true / GlycoPharm false) */
  showPostType?: boolean;
  /** 유형 배지 렌더(서비스별 라벨/색 — slot). showPostType=true 일 때 사용 */
  renderTypeBadge?: (post: ForumListItem) => ReactNode;
  /** 제목 앞 배지 렌더(GP HOT 등). 미전달 시 isPinned 면 pinnedLabel 배지. */
  renderTitleBadge?: (post: ForumListItem) => ReactNode;

  showLikeCount?: boolean;
  showCommentCount?: boolean;
  pinnedLabel?: string;
  /** 댓글 수 강조색 등 (CSS color). 기본 #2563EB */
  accentColor?: string;
}

const TD = 'px-3 py-3 border-b border-slate-100';
const TH = 'px-3 py-2.5 text-xs font-semibold text-slate-500 bg-slate-50 border-b border-slate-200';

export function ForumListTemplate({
  posts,
  pinnedPosts,
  currentPage,
  totalPages,
  onPageChange,
  onPostClick,
  loading = false,
  error = null,
  onRetry,
  renderEmpty,
  showPostType = false,
  renderTypeBadge,
  renderTitleBadge,
  showLikeCount = true,
  showCommentCount = true,
  pinnedLabel = '고정',
  accentColor = '#2563EB',
}: ForumListTemplateProps) {
  const colCount =
    (showPostType ? 1 : 0) + 3 /* title/author/date */ + (showLikeCount ? 1 : 0) + (showCommentCount ? 1 : 0);

  const Header = () => (
    <thead>
      <tr>
        {showPostType && <th className={`${TH} text-left`} style={{ width: '60px' }}>유형</th>}
        <th className={`${TH} text-left`}>제목</th>
        <th className={`${TH} text-left`} style={{ width: '100px' }}>작성자</th>
        <th className={`${TH} text-left`} style={{ width: '100px' }}>작성일</th>
        {showLikeCount && <th className={`${TH} text-center`} style={{ width: '50px' }}>좋아요</th>}
        {showCommentCount && <th className={`${TH} text-center`} style={{ width: '50px' }}>댓글</th>}
      </tr>
    </thead>
  );

  const Row = ({ post, pinned }: { post: ForumListItem; pinned?: boolean }) => (
    <tr
      className={`cursor-pointer transition-colors ${pinned ? 'bg-amber-50 hover:bg-amber-100' : 'hover:bg-slate-50'}`}
      onClick={() => onPostClick(post)}
    >
      {showPostType && (
        <td className={`${TD} text-center overflow-hidden text-ellipsis whitespace-nowrap`} style={{ width: '60px' }}>
          {renderTypeBadge?.(post)}
        </td>
      )}
      <td className={`${TD} text-sm text-slate-800`}>
        {renderTitleBadge
          ? renderTitleBadge(post)
          : post.isPinned && (
              <span className="inline-block px-1.5 py-0.5 text-[11px] font-semibold rounded bg-red-50 text-red-600 mr-1.5">
                {pinnedLabel}
              </span>
            )}
        <span className="font-medium">{post.title}</span>
        {showCommentCount && post.commentCount > 0 && (
          <span className="ml-1.5 text-xs font-medium" style={{ color: accentColor }}>[{post.commentCount}]</span>
        )}
      </td>
      <td className={`${TD} text-xs text-slate-500 overflow-hidden text-ellipsis whitespace-nowrap`} style={{ width: '100px' }}>
        {post.authorName}
      </td>
      <td className={`${TD} text-xs text-slate-400 overflow-hidden text-ellipsis whitespace-nowrap`} style={{ width: '100px' }}>
        {formatForumDate(post.createdAt)}
      </td>
      {showLikeCount && (
        <td className={`${TD} text-xs text-slate-500 text-center`} style={{ width: '50px' }}>
          {post.likeCount > 0 ? post.likeCount : ''}
        </td>
      )}
      {showCommentCount && (
        <td className={`${TD} text-xs text-slate-500 text-center`} style={{ width: '50px' }}>{post.commentCount}</td>
      )}
    </tr>
  );

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden mb-2">
        <table className="w-full border-collapse table-fixed">
          <Header />
          <tbody>
            {[1, 2, 3, 4, 5].map((i) => (
              <tr key={i}>
                <td colSpan={colCount} className="px-3 py-3 border-b border-slate-100">
                  <div className="h-3.5 bg-slate-200 rounded" style={{ width: `${50 + i * 8}%` }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-10 px-5 text-center bg-red-50 rounded-lg mb-4">
        <p className="text-red-600 text-sm mb-3 mt-0">{error}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 text-xs font-medium text-red-600 bg-white border border-red-200 rounded-md cursor-pointer"
          >
            다시 시도
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      {/* 고정(공지) 섹션 */}
      {pinnedPosts && pinnedPosts.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden mb-2">
          <table className="w-full border-collapse table-fixed">
            <tbody>
              {pinnedPosts.map((post) => (
                <Row key={post.id} post={post} pinned />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 본 목록 */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden mb-2">
        <table className="w-full border-collapse table-fixed">
          <Header />
          <tbody>
            {posts.length > 0 ? (
              posts.map((post) => <Row key={post.id} post={post} />)
            ) : (
              <tr>
                <td colSpan={colCount} className="py-16 px-5 text-center">
                  {renderEmpty ? renderEmpty() : <p className="text-sm text-slate-500 m-0">아직 등록된 글이 없습니다</p>}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <HubPagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
        showFirstLast
        showPageInfo={false}
        align="center"
        bordered={false}
        accentColor={accentColor}
      />
    </>
  );
}

export default ForumListTemplate;
