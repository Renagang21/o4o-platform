/**
 * StoreBlogListPage - 매장 블로그 목록
 *
 * Work Order: WO-O4O-STORE-BLOG-SYSTEM-V1
 *
 * Route: /store/:storeSlug/blog
 *
 * 매장별 블로그 게시글 목록. 기존 store_blog_posts 테이블 + unified-store-public API 사용.
 * API: GET /api/v1/stores/:slug/blog?page=N&limit=N
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Store,
} from 'lucide-react';
import { API_BASE_URL, fetchWithTimeout } from '../../lib/api/index.js';

// ── Types ──

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  status: string;
  publishedAt: string;
  createdAt: string;
}

interface BlogMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ── Helpers ──

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// ── Component ──

export default function StoreBlogListPage() {
  const { storeSlug } = useParams<{ storeSlug: string }>();

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [meta, setMeta] = useState<BlogMeta | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const LIMIT = 10;

  const fetchPosts = useCallback(async (p: number) => {
    if (!storeSlug) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetchWithTimeout(
        `${API_BASE_URL}/api/v1/stores/${encodeURIComponent(storeSlug)}/blog?page=${p}&limit=${LIMIT}`,
      );

      if (!res.ok) {
        setError('블로그 글을 불러올 수 없습니다.');
        return;
      }

      const result = await res.json();
      if (result.success) {
        setPosts(result.data || []);
        setMeta(result.meta || null);
      } else {
        setError(result.error?.message || '블로그 글을 불러올 수 없습니다.');
      }
    } catch {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [storeSlug]);

  useEffect(() => {
    fetchPosts(page);
  }, [page, fetchPosts]);

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 py-8">
          {/* Header skeleton */}
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-8" />
          {/* Post skeletons */}
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl p-6 mb-4 shadow-sm">
              <div className="h-5 w-3/4 bg-gray-200 rounded animate-pulse mb-3" />
              <div className="h-4 w-full bg-gray-100 rounded animate-pulse mb-2" />
              <div className="h-4 w-2/3 bg-gray-100 rounded animate-pulse mb-3" />
              <div className="h-3 w-32 bg-gray-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileText size={32} className="text-red-500" />
          </div>
          <h1 className="text-lg font-bold text-gray-900 mb-2">블로그 오류</h1>
          <p className="text-sm text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => fetchPosts(page)}
            className="px-5 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-xl hover:bg-primary-700 transition-colors"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* ── Header ── */}
        <div className="flex items-center gap-3 mb-8">
          <Link
            to={storeSlug ? `/store/${storeSlug}` : '/'}
            className="p-2 rounded-xl bg-white shadow-sm hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Store size={22} className="text-primary-600" />
              블로그
            </h1>
            {meta && (
              <p className="text-sm text-gray-500 mt-0.5">
                총 {meta.total}개의 글
              </p>
            )}
          </div>
        </div>

        {/* ── Empty State ── */}
        {posts.length === 0 && (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
            <FileText size={48} className="text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">아직 블로그 글이 없습니다.</p>
          </div>
        )}

        {/* ── Post List ── */}
        <div className="space-y-4">
          {posts.map((post) => (
            <Link
              key={post.id}
              to={`/store/${storeSlug}/blog/${post.slug}`}
              className="block bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow group"
            >
              <h2 className="text-base font-semibold text-gray-900 group-hover:text-primary-600 transition-colors mb-2 line-clamp-2">
                {post.title}
              </h2>
              {post.excerpt && (
                <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                  {post.excerpt}
                </p>
              )}
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <Calendar size={13} />
                <span>{formatDate(post.publishedAt)}</span>
              </div>
            </Link>
          ))}
        </div>

        {/* ── Pagination ── */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-2 rounded-lg bg-white shadow-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={18} className="text-gray-600" />
            </button>
            <span className="text-sm text-gray-600 px-3">
              {page} / {meta.totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
              disabled={page >= meta.totalPages}
              className="p-2 rounded-lg bg-white shadow-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={18} className="text-gray-600" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
