/**
 * ForumHubPage - 포럼 허브 랜딩 페이지
 *
 * WO-O4O-FORUM-HUB-UI-REDESIGN-IMPLEMENTATION-V1
 * Daum 커뮤니티 스타일 UI 전면 개편
 *
 * ForumHubPage
 * ├─ Header (타이틀 + 설명 + 글쓰기 CTA)
 * ├─ ActivitySection (최근 글 + 인기 글 2열 그리드)
 * ├─ WritePrompt (글쓰기 유도 CTA)
 * └─ InfoSection (이용안내 + 바로가기)
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

// ============================================================================
// Types
// ============================================================================

interface ForumPost {
  id: string;
  title: string;
  author: string;
  authorRole: string;
  category: string;
  views: number;
  likes: number;
  comments: number;
  createdAt: string;
  isHot: boolean;
}

interface PopularForum {
  id: string;
  name: string;
  description?: string | null;
  slug: string;
  color?: string | null;
  iconUrl?: string | null;
  postCount: number;
  popularScore: number;
  postCount7d: number;
  commentSum7d: number;
  viewSum7d: number;
}

// ============================================================================
// Helpers
// ============================================================================

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));

  if (hours < 1) return '방금 전';
  if (hours < 24) return `${hours}시간 전`;
  if (hours < 48) return '어제';
  return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

// ============================================================================
// Sub-components
// ============================================================================

function PostItem({ post }: { post: ForumPost }) {
  return (
    <li className="py-2.5 border-b border-slate-50 last:border-b-0">
      <div className="group">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              {post.isHot && (
                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-500 text-white">
                  HOT
                </span>
              )}
              <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-500">
                {post.category}
              </span>
              <span className="text-sm text-slate-700 group-hover:text-emerald-600 transition-colors truncate">
                {post.title}
              </span>
              {post.comments > 0 && (
                <span className="text-xs text-emerald-500 font-medium flex-shrink-0">
                  [{post.comments}]
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 mt-1 text-xs text-slate-400">
              <span>{post.author}</span>
              <span className="text-slate-300">·</span>
              <span>{formatDate(post.createdAt)}</span>
              <span className="text-slate-300">·</span>
              <span>조회 {post.views}</span>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}

function PopularForumsSection() {
  const [forums, setForums] = useState<PopularForum[]>([]);

  useEffect(() => {
    apiClient.get<{ success: boolean; data: PopularForum[] }>('/api/v1/forum/categories/popular?limit=4')
      .then((res) => {
        if (res.data?.data) setForums(res.data.data);
      })
      .catch(() => {});
  }, []);

  if (forums.length === 0) return null;

  return (
    <section className="py-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-900">인기 포럼</h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {forums.map((forum) => (
          <div
            key={forum.id}
            className="flex flex-col items-center gap-3 p-5 bg-white rounded-2xl border border-slate-100 shadow-sm"
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
              style={{ backgroundColor: forum.color ? `${forum.color}20` : '#f1f5f9' }}
            >
              {forum.iconUrl ? (
                <img src={forum.iconUrl} alt={forum.name} className="w-12 h-12 rounded-xl object-cover" />
              ) : '📂'}
            </div>
            <div className="text-center">
              <h3 className="text-sm font-semibold text-slate-800">{forum.name}</h3>
              {forum.description && (
                <p className="mt-1 text-xs text-slate-400 line-clamp-2">{forum.description}</p>
              )}
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                {forum.postCount}개 글
              </span>
              {forum.postCount7d > 0 && (
                <span className="text-[10px] text-slate-400">이번 주 +{forum.postCount7d}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ActivitySection() {
  const [recentPosts, setRecentPosts] = useState<ForumPost[]>([]);
  const [popularPosts, setPopularPosts] = useState<ForumPost[]>([]);

  useEffect(() => {
    apiClient.get<ForumPost[]>('/api/v1/glycopharm/forum/posts')
      .then((res) => {
        if (res.data) {
          setRecentPosts(res.data.slice(0, 5));
          const sorted = [...res.data].sort((a, b) => b.views - a.views);
          setPopularPosts(sorted.slice(0, 5));
        }
      })
      .catch(() => {});
  }, []);

  return (
    <section className="py-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 최근 글 */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-800">최근 글</h3>
            <Link to="/forum" className="text-xs text-slate-400 hover:text-emerald-600">
              더보기 →
            </Link>
          </div>
          <div className="px-5 py-2">
            {recentPosts.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">
                아직 게시글이 없습니다
              </p>
            ) : (
              <ul className="list-none m-0 p-0">
                {recentPosts.map((post) => (
                  <PostItem key={post.id} post={post} />
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* 인기 글 */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-800">인기 글</h3>
            <Link to="/forum" className="text-xs text-slate-400 hover:text-emerald-600">
              더보기 →
            </Link>
          </div>
          <div className="px-5 py-2">
            {popularPosts.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">
                아직 게시글이 없습니다
              </p>
            ) : (
              <ul className="list-none m-0 p-0">
                {popularPosts.map((post) => (
                  <PostItem key={`popular-${post.id}`} post={post} />
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function WritePrompt() {
  const { isAuthenticated } = useAuth();

  return (
    <section className="py-6">
      <div className="flex items-center justify-between p-5 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-xl">
            ✏️
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              {isAuthenticated ? '새 글을 작성해 보세요' : '포럼에 참여해 보세요'}
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              {isAuthenticated
                ? '의견, 질문, 피드백을 자유롭게 공유하세요'
                : '로그인 후 글을 작성하고 토론에 참여할 수 있습니다'}
            </p>
          </div>
        </div>
        {isAuthenticated ? (
          <Link
            to="/forum"
            className="px-5 py-2.5 text-sm font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors whitespace-nowrap"
          >
            글쓰기
          </Link>
        ) : (
          <Link
            to="/login"
            className="px-5 py-2.5 text-sm font-medium text-emerald-600 border border-emerald-200 rounded-xl hover:bg-emerald-50 transition-colors whitespace-nowrap"
          >
            로그인
          </Link>
        )}
      </div>
    </section>
  );
}

function InfoSection() {
  return (
    <section className="py-6 border-t border-slate-100">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">이용안내</h4>
          <ul className="space-y-1.5 text-xs text-slate-400 list-disc pl-4">
            <li>질문, 의견, 피드백을 자유롭게 남겨주세요</li>
            <li>상품 홍보나 고객 문의 용도가 아닌 공간입니다</li>
            <li>개인정보 보호에 유의해 주세요</li>
          </ul>
        </div>
        <div>
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">바로가기</h4>
          <div className="flex flex-wrap gap-2">
            <Link to="/forum" className="text-xs text-slate-400 hover:text-emerald-600 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-emerald-50 transition-colors">
              전체 글
            </Link>
            <Link to="/forum/feedback" className="text-xs text-slate-400 hover:text-emerald-600 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-emerald-50 transition-colors">
              피드백
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function ForumHubPage() {
  return (
    <div className="bg-slate-50 min-h-[calc(100vh-200px)]">
      <div className="max-w-[960px] mx-auto px-4 md:px-6 pb-12">
        {/* Header */}
        <header className="pt-10 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">GlycoPharm 포럼</h1>
              <p className="mt-1 text-sm text-slate-500">
                의약품과 건강기능식품에 대한 정보를 교환하고 토론에 참여하세요
              </p>
            </div>
            <Link
              to="/forum"
              className="hidden md:inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              글쓰기
            </Link>
          </div>
        </header>

        <PopularForumsSection />
        <ActivitySection />
        <WritePrompt />
        <InfoSection />
      </div>
    </div>
  );
}
