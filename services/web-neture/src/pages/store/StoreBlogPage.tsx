/**
 * StoreBlogPage - 매장 블로그 글 상세
 *
 * Work Order: WO-O4O-STORE-BLOG-SYSTEM-V1
 *
 * Route: /store/:storeSlug/blog/:postSlug
 *
 * 매장별 블로그 게시글 상세 페이지.
 * API: GET /api/v1/stores/:slug/blog/:postSlug
 */

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  Calendar,
  List,
  Share2,
} from 'lucide-react';
import { toast } from '@o4o/error-handling';
import { api } from '../../lib/api/index.js';
import { ContentRenderer } from '@o4o/content-editor';

// ── Types ──

interface BlogPostDetail {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  status: string;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
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

export default function StoreBlogPage() {
  const { storeSlug, postSlug } = useParams<{ storeSlug: string; postSlug: string }>();

  const [post, setPost] = useState<BlogPostDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!storeSlug || !postSlug) {
      setError('잘못된 주소입니다.');
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const res = await api.get(
          `/stores/${encodeURIComponent(storeSlug)}/blog/${encodeURIComponent(postSlug)}`,
        );
        const result = res.data;
        if (result.success && result.data) {
          setPost(result.data);
        } else {
          setError('블로그 글을 찾을 수 없습니다.');
        }
      } catch {
        setError('네트워크 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    })();
  }, [storeSlug, postSlug]);

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: post?.title || '블로그', url });
      } catch {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success('링크가 복사되었습니다.');
    }
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="h-6 w-32 bg-gray-200 rounded animate-pulse mb-6" />
          <div className="bg-white rounded-2xl p-8 shadow-sm">
            <div className="h-8 w-3/4 bg-gray-200 rounded animate-pulse mb-4" />
            <div className="h-4 w-40 bg-gray-100 rounded animate-pulse mb-8" />
            <div className="space-y-3">
              <div className="h-4 w-full bg-gray-100 rounded animate-pulse" />
              <div className="h-4 w-full bg-gray-100 rounded animate-pulse" />
              <div className="h-4 w-5/6 bg-gray-100 rounded animate-pulse" />
              <div className="h-4 w-full bg-gray-100 rounded animate-pulse" />
              <div className="h-4 w-2/3 bg-gray-100 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Error ──
  if (error || !post) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileText size={32} className="text-red-500" />
          </div>
          <h1 className="text-lg font-bold text-gray-900 mb-2">블로그 오류</h1>
          <p className="text-sm text-gray-600 mb-6">{error || '글을 찾을 수 없습니다.'}</p>
          <Link
            to={storeSlug ? `/store/${storeSlug}/blog` : '/'}
            className="inline-block px-5 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-xl hover:bg-primary-700 transition-colors"
          >
            블로그 목록으로
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* ── Navigation ── */}
        <div className="flex items-center justify-between mb-6">
          <Link
            to={`/store/${storeSlug}/blog`}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-primary-600 transition-colors"
          >
            <ArrowLeft size={16} />
            <span>블로그 목록</span>
          </Link>
          <button
            onClick={handleShare}
            className="p-2 rounded-lg bg-white shadow-sm hover:bg-gray-50 transition-colors"
            title="공유"
          >
            <Share2 size={18} className="text-gray-500" />
          </button>
        </div>

        {/* ── Article ── */}
        <article className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {/* Header */}
          <div className="px-8 pt-8 pb-6 border-b border-gray-100">
            <h1 className="text-2xl font-bold text-gray-900 mb-3 leading-snug">
              {post.title}
            </h1>
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <span className="flex items-center gap-1.5">
                <Calendar size={14} />
                {formatDate(post.publishedAt)}
              </span>
            </div>
          </div>

          {/* Content */}
          <ContentRenderer
            html={post.content}
            className="px-8 py-8 prose prose-sm max-w-none text-gray-700 leading-relaxed
              prose-headings:text-gray-900 prose-headings:font-bold
              prose-a:text-primary-600 prose-a:no-underline hover:prose-a:underline
              prose-img:rounded-xl prose-img:shadow-sm"
          />
        </article>

        {/* ── Bottom Navigation ── */}
        <div className="mt-6 flex justify-center">
          <Link
            to={`/store/${storeSlug}/blog`}
            className="flex items-center gap-2 px-5 py-2.5 bg-white text-sm font-medium text-gray-600 rounded-xl shadow-sm hover:bg-gray-50 transition-colors"
          >
            <List size={16} />
            목록으로
          </Link>
        </div>
      </div>
    </div>
  );
}
