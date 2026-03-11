/**
 * PharmacyManagement - 약국 경영 커뮤니티 메인 화면
 *
 * WO-O4O-PHARMACY-MANAGEMENT-HOME-UI-V1
 * 2열 레이아웃: 좌측 포럼 피드 + 우측 서비스 패널 (강좌, 매장 HUB, 내 매장)
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import {
  MessageSquare,
  BookOpen,
  Store,
  ShoppingBag,
  ArrowRight,
  RefreshCw,
  Play,
  FileText,
  Video,
} from 'lucide-react';

// ============================================================================
// Types (ForumHubPage 패턴 재사용)
// ============================================================================

interface ForumPostRaw {
  id: string;
  title: string;
  excerpt?: string;
  slug?: string;
  author?: { id: string; name?: string; email?: string } | null;
  authorId?: string;
  category?: { id: string; name: string; slug?: string } | null;
  categoryId?: string;
  viewCount: number;
  commentCount: number;
  createdAt: string;
  isPinned?: boolean;
  status?: string;
}

interface DisplayPost {
  id: string;
  title: string;
  author: string;
  category: string;
  views: number;
  comments: number;
  createdAt: string;
  isPinned: boolean;
}

// ============================================================================
// Helpers (ForumHubPage 패턴 재사용)
// ============================================================================

function normalizePost(raw: ForumPostRaw): DisplayPost {
  return {
    id: raw.id,
    title: raw.title || '(제목 없음)',
    author: raw.author?.name || raw.author?.email?.split('@')[0] || '익명',
    category: raw.category?.name || '일반',
    views: raw.viewCount || 0,
    comments: raw.commentCount || 0,
    createdAt: raw.createdAt,
    isPinned: raw.isPinned || false,
  };
}

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
// Mock 강좌 데이터 (EducationPage 패턴 — 상위 3개만)
// ============================================================================

const FEATURED_COURSES = [
  {
    id: '1',
    title: 'CGM 완벽 가이드',
    description: '연속혈당측정기의 원리부터 실제 적용까지',
    type: 'video' as const,
    duration: 45,
  },
  {
    id: '2',
    title: '당뇨 환자 상담 실전 매뉴얼',
    description: '약국에서 활용할 수 있는 상담 매뉴얼',
    type: 'pdf' as const,
    pages: 32,
  },
  {
    id: '3',
    title: '약국 혈당관리 서비스 운영 가이드',
    description: '혈당관리 서비스 종합 가이드',
    type: 'article' as const,
    readTime: 15,
  },
];

const COURSE_TYPE_ICON: Record<string, typeof Play> = {
  video: Video,
  pdf: FileText,
  article: BookOpen,
};

// ============================================================================
// Sub-components
// ============================================================================

/** 포럼 피드 — 좌측 메인 영역 */
function ForumFeed() {
  const [posts, setPosts] = useState<DisplayPost[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated } = useAuth();

  const fetchPosts = () => {
    setLoading(true);
    apiClient
      .get<ForumPostRaw[]>('/api/v1/glycopharm/forum/posts?limit=15')
      .then((res) => {
        if (Array.isArray(res.data)) {
          setPosts(res.data.map(normalizePost));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary-600" />
          <h2 className="text-base font-bold text-slate-900">커뮤니티 포럼</h2>
        </div>
        <button
          onClick={fetchPosts}
          className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          title="새로고침"
        >
          <RefreshCw className={`w-4 h-4 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Post List */}
      <div className="divide-y divide-slate-50">
        {loading && posts.length === 0 ? (
          <div className="py-12 text-center">
            <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto" />
            <p className="mt-3 text-sm text-slate-400">포럼 글을 불러오는 중...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="py-12 text-center">
            <div className="text-4xl mb-3">💬</div>
            <p className="text-slate-500 mb-1">아직 게시글이 없습니다</p>
            <p className="text-sm text-slate-400">첫 번째 글을 작성해 보세요</p>
          </div>
        ) : (
          posts.map((post) => (
            <div key={post.id} className="px-5 py-3 hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-1.5">
                {post.isPinned && (
                  <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-500 text-white flex-shrink-0">
                    공지
                  </span>
                )}
                <span className="text-[11px] text-primary-500 font-medium flex-shrink-0">
                  {post.category}
                </span>
                <span className="text-sm text-slate-700 truncate">{post.title}</span>
                {post.comments > 0 && (
                  <span className="text-xs text-primary-500 font-medium flex-shrink-0">
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
          ))
        )}
      </div>

      {/* Footer: CTA + 더보기 */}
      <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center justify-between">
          {isAuthenticated ? (
            <Link
              to="/forum"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
            >
              글쓰기
            </Link>
          ) : (
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-primary-600 border border-primary-200 rounded-lg hover:bg-primary-50 transition-colors"
            >
              로그인 후 참여
            </Link>
          )}
          <Link
            to="/forum"
            className="text-sm text-slate-500 hover:text-primary-600 flex items-center gap-1 transition-colors"
          >
            포럼 더보기 <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

/** 강좌 카드 — 우측 서비스 패널 */
function CourseSection() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-amber-600" />
          <h3 className="text-sm font-bold text-slate-800">강좌</h3>
        </div>
        <Link
          to="/education"
          className="text-xs text-slate-400 hover:text-primary-600 transition-colors"
        >
          더보기 →
        </Link>
      </div>
      <div className="divide-y divide-slate-50">
        {FEATURED_COURSES.map((course) => {
          const Icon = COURSE_TYPE_ICON[course.type] || BookOpen;
          return (
            <Link
              key={course.id}
              to="/education"
              className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Icon className="w-4 h-4 text-amber-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{course.title}</p>
                <p className="text-xs text-slate-400 truncate mt-0.5">{course.description}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/** 매장 HUB 카드 */
function HubShortcutCard() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
          <ShoppingBag className="w-4 h-4 text-blue-600" />
        </div>
        <h3 className="text-sm font-bold text-slate-800">매장 HUB</h3>
      </div>
      <p className="text-xs text-slate-500 leading-relaxed mb-3">
        상품, POP 자료, 제품 설명, QR 콘텐츠를 한 곳에서 탐색하세요
      </p>
      <Link
        to="/store/hub"
        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
      >
        매장 HUB 이동 <ArrowRight className="w-3 h-3" />
      </Link>
    </div>
  );
}

/** 내 매장 카드 */
function StoreShortcutCard() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
          <Store className="w-4 h-4 text-emerald-600" />
        </div>
        <h3 className="text-sm font-bold text-slate-800">내 매장</h3>
      </div>
      <p className="text-xs text-slate-500 leading-relaxed mb-3">
        상품 진열, QR 전단, 매장 화면을 관리하세요
      </p>
      <Link
        to="/store/identity"
        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
      >
        내 매장 관리 <ArrowRight className="w-3 h-3" />
      </Link>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function PharmacyManagement() {
  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">약국 경영</h1>
        <p className="text-sm text-slate-500 mt-1">약국 경영 커뮤니티</p>
      </div>

      {/* 2-column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Forum Feed (2/3) */}
        <div className="lg:col-span-2">
          <ForumFeed />
        </div>

        {/* Right: Service Panel (1/3) */}
        <div className="space-y-4">
          <CourseSection />
          <HubShortcutCard />
          <StoreShortcutCard />
        </div>
      </div>
    </div>
  );
}
