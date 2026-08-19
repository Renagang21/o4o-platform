/**
 * CommunitySearchPage — Pharmacy-Hub 커뮤니티 검색 (/community/search)
 *
 * WO-O4O-COMMUNITY-PHARMACYHUB-BASELINE-AND-CROSSSERVICE-MYPOSTS-ADOPTION-V1 §6
 *
 * - 최소 baseline = forum 중심 커뮤니티 검색. 기존 공통 View(ForumListTemplate)와
 *   기존 forum 목록 API contract(search 파라미터)를 그대로 재사용한다.
 * - 새 검색엔진·index 를 만들지 않는다.
 * - PH 에 미구현인 Content · Resources 는 검색 대상에 포함하지 않는다(가짜 결과 금지).
 */

import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ForumListTemplate, type ForumListItem } from '@o4o/shared-space-ui';
import { fetchPharmacyHubForumPosts } from '../../services/forumApi';

const PAGE_SIZE = 20;

export default function CommunitySearchPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const page = Math.max(1, Number(searchParams.get('page') || 1));

  const [input, setInput] = useState(query);
  const [posts, setPosts] = useState<ForumListItem[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setInput(query), [query]);

  const load = useCallback(async () => {
    if (!query) {
      setPosts([]);
      setTotalPages(0);
      setTotal(0);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await fetchPharmacyHubForumPosts({
        page,
        limit: PAGE_SIZE,
        search: query,
        sortBy: 'latest',
      });
      setPosts(result.posts);
      setTotalPages(result.totalPages);
      setTotal(result.total);
    } catch (err) {
      setPosts([]);
      setTotalPages(0);
      setTotal(0);
      setError(err instanceof Error ? err.message : '검색에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [page, query]);

  useEffect(() => { void load(); }, [load]);

  const updateParams = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(patch).forEach(([key, value]) => {
      if (value) next.set(key, value); else next.delete(key);
    });
    setSearchParams(next);
  };

  return (
    <main className="min-h-screen bg-slate-50 py-8">
      <div className="mx-auto max-w-5xl px-4">
        <button className="mb-2 text-sm text-teal-700" onClick={() => navigate('/community')} type="button">
          ← 커뮤니티 홈
        </button>
        <h1 className="m-0 text-2xl font-bold text-slate-900">커뮤니티 검색</h1>
        <p className="mt-1 text-sm text-slate-500">
          PharmacyHub 커뮤니티 게시글을 검색합니다.
        </p>

        <form
          className="mt-4 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            updateParams({ q: input.trim() || undefined, page: undefined });
          }}
        >
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="검색어를 입력하세요"
            className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white"
          >
            검색
          </button>
        </form>

        <div className="mt-5">
          {query ? (
            <p className="mb-2 text-sm text-slate-500">
              &lsquo;{query}&rsquo; 검색 결과 · 총 {total}건
            </p>
          ) : null}
          <ForumListTemplate
            posts={posts}
            currentPage={page}
            totalPages={totalPages}
            onPageChange={(next) => updateParams({ page: next > 1 ? String(next) : undefined })}
            onPostClick={(post) => navigate(`/forum/posts/${post.id}`)}
            loading={loading}
            error={error}
            onRetry={() => void load()}
            accentColor="#0f766e"
            renderEmpty={() => (
              <div className="py-12 text-center text-sm text-slate-500">
                {query ? '검색 결과가 없습니다.' : '검색어를 입력해 주세요.'}
              </div>
            )}
          />
        </div>
      </div>
    </main>
  );
}
