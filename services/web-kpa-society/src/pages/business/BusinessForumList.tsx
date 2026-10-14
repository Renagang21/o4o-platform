import { Link } from 'react-router-dom';
import { HubPagination, type ForumListItem } from '@o4o/shared-space-ui';

export default function BusinessForumList({ posts, currentPage, totalPages, onPageChange, error, onRetry }: Readonly<{
  posts: ForumListItem[]; currentPage: number; totalPages: number;
  onPageChange: (page: number) => void; error: string; onRetry: () => void;
}>) {
  if (error) return <div className="rounded-xl border border-red-100 bg-red-50 p-5">
    <p role="alert" className="text-sm leading-6 text-red-700">{error}</p>
    <button type="button" onClick={onRetry} className="mt-3 min-h-11 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700">다시 시도</button>
  </div>;
  return <>
    {!posts.length ? <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-5 py-12 text-center text-sm text-slate-500">아직 등록된 글이 없습니다.</p> :
      <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {posts.map(post => <li key={post.id} className="px-4 py-5 sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            {post.isPinned && <span className="rounded bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">고정</span>}
            {post.statusLabel && <span className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-600">{post.statusLabel}</span>}
            <Link to={post.routeTo} className="min-w-0 break-words text-base font-semibold leading-7 text-slate-900 hover:text-blue-700 focus-visible:outline-blue-700">{post.title}</Link>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs leading-6 text-slate-500">
            <span className="break-all">{post.authorName}</span><time dateTime={post.createdAt}>{new Date(post.createdAt).toLocaleDateString('ko-KR')}</time>
            <span>댓글 {post.commentCount}</span><span>좋아요 {post.likeCount}</span>
          </div>
        </li>)}
      </ul>}
    <HubPagination currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} align="center" />
  </>;
}
