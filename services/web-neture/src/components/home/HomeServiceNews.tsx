/**
 * HomeServiceNews — O4O 대표 홈 「O4O 서비스 소식」 섹션
 *
 * WO-O4O-NETURE-HOME-SERVICE-NEWS-FORUM-V1
 *
 * 구성(한 화면에서 짧게):
 *   제목 「O4O 서비스 소식」 + 우측 「전체 보기」
 *   바로가기 한 줄: 새 기능·업데이트 / 사용법 / 활용 사례 (포럼 목록의 태그 필터 링크)
 *   최신 글 최대 5건: 제목 + 게시일 (썸네일 · 미리보기 · 큰 카드 없음)
 * 상태: 로딩 / 오류(재시도 — "글 없음" 과 구분) / 글 없음 / 정상.
 * 로그인 전 · 후 같은 컴포넌트를 쓴다 (배치만 다르다).
 * 데이터 · 링크 규칙은 `lib/home-news.ts`.
 */

import { Link } from 'react-router-dom';
import { Loader2, RefreshCw } from 'lucide-react';
import {
  HOME_NEWS_SHORTCUTS,
  forumListPath,
  forumPostPath,
  forumTagPath,
  formatNewsDate,
  useHomeNews,
} from '../../lib/home-news';

const SHORTCUT =
  'inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 no-underline ' +
  'transition-colors hover:border-slate-400 hover:text-slate-900';

interface HomeServiceNewsProps {
  /** 로그인 후 HomeEntryPanel 안에서는 섹션 간격을 패널 규칙에 맞추고, 로그인 전에는 독립 블록으로 둔다 */
  className?: string;
}

export default function HomeServiceNews({ className = '' }: HomeServiceNewsProps) {
  const { data, loading, error, reload } = useHomeNews();
  const forum = data?.forum ?? null;
  const posts = data?.posts ?? [];
  const viewAllHref = forum ? forumListPath(forum) : '/forum';

  return (
    <section className={className} aria-labelledby="home-service-news-title" data-testid="home-service-news">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="home-service-news-title" className="m-0 text-xs font-medium uppercase tracking-wide text-slate-400">
          O4O 서비스 소식
        </h2>
        <Link to={viewAllHref} className="text-xs text-slate-500 no-underline hover:text-slate-800 hover:underline">
          전체 보기
        </Link>
      </div>

      {/* 바로가기 — 소식 포럼의 분류(태그)별 목록. 포럼이 아직 확정되지 않았으면 포럼 홈으로 */}
      <nav aria-label="O4O 서비스 소식 바로가기" className="mt-2 flex flex-wrap gap-1.5">
        {HOME_NEWS_SHORTCUTS.map((s) => (
          <Link key={s.id} to={forum ? forumTagPath(forum, s.tag) : '/forum'} className={SHORTCUT}>
            {s.label}
          </Link>
        ))}
      </nav>

      {loading && !data ? (
        <p className="m-0 mt-3 flex items-center gap-2 text-sm text-slate-400" aria-busy="true">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          소식을 불러오는 중...
        </p>
      ) : error ? (
        <p className="m-0 mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-500" role="status">
          <span>{error}</span>
          <button
            type="button"
            onClick={reload}
            className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-2.5 py-0.5 text-xs text-slate-700 hover:border-slate-500"
          >
            <RefreshCw className="h-3 w-3" />
            다시 시도
          </button>
        </p>
      ) : posts.length === 0 ? (
        <p className="m-0 mt-3 text-sm text-slate-400">아직 등록된 소식이 없습니다.</p>
      ) : (
        <ul className="m-0 mt-2 list-none p-0 text-sm">
          {posts.map((post) => (
            <li key={post.id} className="flex items-baseline gap-3 border-t border-slate-100 py-1.5 first:border-t-0">
              <Link
                to={forumPostPath(post)}
                className="min-w-0 flex-1 truncate text-slate-800 no-underline hover:text-slate-900 hover:underline"
                title={post.title}
              >
                {post.title}
              </Link>
              <time dateTime={post.publishedAt} className="shrink-0 text-xs tabular-nums text-slate-400">
                {formatNewsDate(post.publishedAt)}
              </time>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
