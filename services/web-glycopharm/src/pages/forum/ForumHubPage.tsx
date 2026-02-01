/**
 * ForumHubPage - 포럼 허브 랜딩 페이지
 *
 * 통합 포럼 허브 디자인 (모든 서비스 공통 UI-UX)
 *
 * ForumHubPage
 * ├─ Header (타이틀 + 설명)
 * ├─ QuickActions (글쓰기, 전체 글, 인기 글, 공지사항)
 * ├─ ActivitySection (최근 글 + 인기 글 2열 그리드)
 * ├─ WritePrompt (글쓰기 유도 CTA)
 * └─ InfoSection (이용안내 + 바로가기)
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, FileText, Flame, Megaphone } from 'lucide-react';
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

// ============================================================================
// Sub-components
// ============================================================================

const quickActions = [
  { label: '글쓰기', href: '/forum', icon: Pencil },
  { label: '전체 글', href: '/forum', icon: FileText },
  { label: '인기 글', href: '/forum', icon: Flame },
  { label: '공지사항', href: '/forum', icon: Megaphone },
];

function QuickActions() {
  return (
    <section className="py-6">
      <div className="flex justify-center gap-4 flex-wrap">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.label}
              to={action.href}
              className="flex flex-col items-center gap-2 px-6 py-4 rounded-xl bg-white shadow-sm border border-slate-100 text-slate-600 hover:shadow-md hover:border-primary-200 transition-all min-w-[80px]"
            >
              <Icon className="w-6 h-6" />
              <span className="text-sm font-medium">{action.label}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function PostItem({ post }: { post: ForumPost }) {
  return (
    <li className="py-2 border-b border-slate-50">
      <div className="flex items-center gap-1.5 text-sm text-slate-700">
        {post.isHot && (
          <span className="inline-block px-1.5 py-0.5 rounded text-[11px] font-medium bg-red-50 text-red-600">HOT</span>
        )}
        <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-500 shrink-0">
          {post.category}
        </span>
        <span className="truncate">{post.title}</span>
      </div>
      <div className="flex gap-1 mt-1 text-xs text-slate-400">
        <span>{post.author}</span>
        <span>·</span>
        <span>{new Date(post.createdAt).toLocaleDateString('ko-KR')}</span>
        <span>·</span>
        <span>댓글 {post.comments}</span>
      </div>
    </li>
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
    <section className="py-8">
      <h2 className="text-lg font-semibold text-slate-800 mb-4">최근 활동</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 최근 글 */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-200">
            <h3 className="text-[15px] font-semibold text-slate-800">최근 글</h3>
            <Link to="/forum" className="text-sm text-primary-600 hover:text-primary-700">더보기</Link>
          </div>
          {recentPosts.length === 0 ? (
            <p className="text-center text-slate-400 py-8 text-sm">아직 게시글이 없습니다</p>
          ) : (
            <ul className="list-none m-0 p-0">
              {recentPosts.map((post) => (
                <PostItem key={post.id} post={post} />
              ))}
            </ul>
          )}
        </div>

        {/* 인기 글 */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-200">
            <h3 className="text-[15px] font-semibold text-slate-800">인기 글</h3>
            <Link to="/forum" className="text-sm text-primary-600 hover:text-primary-700">더보기</Link>
          </div>
          {popularPosts.length === 0 ? (
            <p className="text-center text-slate-400 py-8 text-sm">아직 게시글이 없습니다</p>
          ) : (
            <ul className="list-none m-0 p-0">
              {popularPosts.map((post) => (
                <PostItem key={`popular-${post.id}`} post={post} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

function WritePrompt() {
  const { isAuthenticated } = useAuth();

  return (
    <section className="py-6">
      <div className="flex items-center justify-between p-5 bg-white rounded-xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-3">
          <span className="text-3xl shrink-0">✏️</span>
          <div>
            <h3 className="text-[15px] font-semibold text-slate-800">
              {isAuthenticated ? '새 글을 작성해 보세요' : '포럼에 참여해 보세요'}
            </h3>
            <p className="text-[13px] text-slate-400 mt-1">
              {isAuthenticated
                ? '의견, 질문, 피드백을 자유롭게 공유하세요'
                : '로그인 후 글을 작성하고 토론에 참여할 수 있습니다'}
            </p>
          </div>
        </div>
        {isAuthenticated ? (
          <Link to="/forum" className="px-5 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors whitespace-nowrap">
            글쓰기
          </Link>
        ) : (
          <Link to="/login" className="px-5 py-2 text-sm font-medium text-primary-600 border border-primary-600 rounded-lg hover:bg-primary-50 transition-colors whitespace-nowrap">
            로그인
          </Link>
        )}
      </div>
    </section>
  );
}

function InfoSection() {
  return (
    <section className="py-6 border-t border-slate-200">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-3">
          <h4 className="text-sm font-semibold text-slate-500 mb-2">이용안내</h4>
          <ul className="list-disc pl-5 text-[13px] text-slate-400 leading-7">
            <li>질문, 의견, 피드백을 자유롭게 남겨주세요</li>
            <li>상품 홍보나 고객 문의 용도가 아닌 공간입니다</li>
            <li>개인정보 보호에 유의해 주세요</li>
          </ul>
        </div>
        <div className="p-3">
          <h4 className="text-sm font-semibold text-slate-500 mb-2">바로가기</h4>
          <div className="flex flex-col gap-1">
            <Link to="/forum" className="text-[13px] text-slate-400 hover:text-primary-600 transition-colors">전체 글</Link>
            <Link to="/forum/feedback" className="text-[13px] text-slate-400 hover:text-primary-600 transition-colors">피드백</Link>
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
      <div className="max-w-[960px] mx-auto px-6 pb-12">
        {/* Header */}
        <header className="text-center pt-12 pb-4">
          <h1 className="text-[28px] font-bold text-slate-800 mb-2">GlycoPharm 포럼</h1>
          <p className="text-[15px] text-slate-500">의약품과 건강기능식품에 대한 정보를 교환하고 토론에 참여하세요</p>
        </header>

        <QuickActions />
        <ActivitySection />
        <WritePrompt />
        <InfoSection />
      </div>
    </div>
  );
}
