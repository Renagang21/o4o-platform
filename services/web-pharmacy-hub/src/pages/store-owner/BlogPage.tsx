/**
 * BlogPage (약국 경영자) — 매장 블로그 목록
 *
 * WO-PHARMACY-HUB-STORE-CONTENT-LIBRARY-V1
 *
 * 원장은 공통 `store_blog_posts` (경계 = store_id + service_key) — 신규 테이블 0.
 * store_id 에는 organizations.id 가 들어가며 서버가 Pharmacy-Hub enrollment 로 결정한다.
 *
 * ⚠️ 공개 URL: Pharmacy-Hub 에는 아직 공개 블로그 렌더링 경로가 없다. 본 화면은 **저작·관리**
 *    까지이고 "발행" 은 status='published' 기록까지다. 작업요청서는 공개 URL 부재만으로
 *    WO 전체를 중지하지 않는다고 명시하므로, 화면에서 그 사실을 그대로 안내한다
 *    (없는 링크를 만들지 않는다 — 데드링크 0).
 */

import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  fetchBlogPosts,
  publishBlogPost,
  archiveBlogPost,
  deleteBlogPost,
  BLOG_STATUS_LABELS,
  type BlogPost,
} from '../../lib/api/pharmacyHubStoreBlog';
import { StoreConnectionNotice, type StoreConnectionState } from '../../components/store-owner/StoreConnectionNotice';

const STATUS_STYLE: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  published: 'bg-emerald-50 text-emerald-700',
  archived: 'bg-amber-50 text-amber-700',
};

export default function StoreOwnerBlogPage() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [connection, setConnection] = useState<StoreConnectionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetchBlogPosts({ page: 1, limit: 100 })
      .then((p) => {
        setConnection(p.storeConnection);
        setPosts(p.posts);
        setError(null);
      })
      .catch((e: any) => setError(e?.message || '블로그 목록을 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (id: string, fn: () => Promise<unknown>) => {
    setBusyId(id);
    try {
      await fn();
      load();
    } catch (e: any) {
      window.alert(e?.message || '처리하지 못했습니다.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">매장 블로그</h1>
          <p className="mt-1 text-sm text-gray-500">
            약국 소식·복약 안내 등을 글로 정리해 둡니다. 저장한 글은 자료함에서도 확인할 수 있습니다.
          </p>
        </div>
        {connection?.status === 'connected' && (
          <button
            type="button"
            onClick={() => navigate('/store-owner/blog/new')}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            글쓰기
          </button>
        )}
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {connection && connection.status !== 'connected' ? (
        <>
          <StoreConnectionNotice connection={connection} subject="매장 블로그" />
          <p className="mt-6 text-sm">
            <Link to="/store-owner" className="text-gray-500 underline">
              약국 경영자 홈
            </Link>
          </p>
        </>
      ) : loading ? (
        <p className="text-sm text-gray-500">불러오는 중…</p>
      ) : (
        <>
          <p className="mb-4 rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-700">
            발행하면 글 상태가 "발행됨" 으로 바뀝니다. 약국 공개 블로그 페이지는 아직 제공되지
            않으므로 외부 공개 주소는 생성되지 않습니다.
          </p>

          {posts.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 px-6 py-12 text-center">
              <p className="text-sm font-medium text-gray-600">작성한 글이 없습니다.</p>
              <p className="mt-2 text-sm text-gray-400">"글쓰기" 로 첫 글을 남겨 보세요.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
              {posts.map((post) => (
                <li key={post.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">{post.title}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-400">
                      <span className={`rounded px-1.5 py-0.5 ${STATUS_STYLE[post.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {BLOG_STATUS_LABELS[post.status] ?? post.status}
                      </span>
                      <span>{new Date(post.updatedAt ?? post.createdAt).toLocaleDateString('ko-KR')}</span>
                    </p>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => navigate(`/store-owner/blog/${post.id}/edit`)}
                      className="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                    >
                      수정
                    </button>
                    {post.status !== 'published' && (
                      <button
                        type="button"
                        disabled={busyId === post.id}
                        onClick={() => run(post.id, () => publishBlogPost(post.id))}
                        className="rounded-md border border-emerald-200 px-3 py-1.5 text-xs text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                      >
                        발행
                      </button>
                    )}
                    {post.status !== 'archived' && (
                      <button
                        type="button"
                        disabled={busyId === post.id}
                        onClick={() => run(post.id, () => archiveBlogPost(post.id))}
                        className="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        보관
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={busyId === post.id}
                      onClick={() => {
                        if (!window.confirm(`"${post.title}" 글을 삭제할까요?`)) return;
                        run(post.id, () => deleteBlogPost(post.id));
                      }}
                      className="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      삭제
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
