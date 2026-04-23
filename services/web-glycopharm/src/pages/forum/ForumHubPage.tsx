/**
 * ForumHubPage - GlycoPharm 포럼 허브 랜딩 페이지
 *
 * WO-O4O-FORUM-HUB-DAUM-STYLE-REFINEMENT-V1
 * 다음 카페 스타일 포럼 Hub: 카테고리(포럼) 카드 중심 탐색 UX
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PageHero, PageSection, PageContainer } from '@o4o/ui';
import { apiClient } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

// ============================================================================
// Types
// ============================================================================

interface ForumPostAuthor {
  id: string;
  name?: string;
  email?: string;
}

interface ForumPostCategory {
  id: string;
  name: string;
  slug?: string;
}

interface ForumPostRaw {
  id: string;
  title: string;
  excerpt?: string;
  slug?: string;
  author?: ForumPostAuthor | null;
  authorId?: string;
  category?: ForumPostCategory | null;
  categoryId?: string;
  viewCount: number;
  commentCount: number;
  createdAt: string;
  isPinned?: boolean;
  status?: string;
}

interface ForumCategory {
  id: string;
  name: string;
  description?: string | null;
  slug: string;
  color?: string | null;
  iconUrl?: string | null;
  iconEmoji?: string | null;
  postCount: number;
  isPinned?: boolean;
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
// Constants
// ============================================================================

const DEFAULT_FORUM_ICON = '📂';

const FALLBACK_ICONS: Record<string, string> = {
  '자유게시판': '💬',
  '정보공유': '📌',
  '질문답변': '❓',
  '후기': '⭐',
  '공지사항': '📢',
  '의약품 정보': '💊',
  '건강기능식품': '🧬',
  '약국 운영': '🏥',
  '일반 토론': '💬',
};

// ============================================================================
// Helpers
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

function getForumIcon(cat: ForumCategory): string {
  if (cat.iconUrl) return '';
  if (cat.iconEmoji) return cat.iconEmoji;
  return FALLBACK_ICONS[cat.name] || DEFAULT_FORUM_ICON;
}

/** Activity signal per category (derived from posts) */
interface CategoryActivity {
  postCount7d: number;
  commentSum7d: number;
  latestPostTitle?: string;
  latestPostDate?: string;
}

function getActivityBadge(activity?: CategoryActivity): { label: string; className: string } | null {
  if (!activity?.latestPostDate) return null;
  const diff = Date.now() - new Date(activity.latestPostDate).getTime();
  const hours = diff / (1000 * 60 * 60);
  if (hours <= 24) return { label: '오늘 글 있음', className: 'bg-emerald-500 text-white' };
  if (hours <= 168) return { label: '최근 활동', className: 'bg-slate-100 text-slate-600' };
  return null;
}

function buildActivityMap(posts: ForumPostRaw[]): Record<string, CategoryActivity> {
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const map: Record<string, CategoryActivity> = {};

  posts.forEach((post) => {
    const catId = post.category?.id || post.categoryId;
    if (!catId) return;

    if (!map[catId]) {
      map[catId] = { postCount7d: 0, commentSum7d: 0 };
    }

    const postTime = new Date(post.createdAt).getTime();

    // Latest post for this category
    if (!map[catId].latestPostDate || postTime > new Date(map[catId].latestPostDate!).getTime()) {
      map[catId].latestPostTitle = post.title;
      map[catId].latestPostDate = post.createdAt;
    }

    // Count posts within 7 days
    if (postTime >= weekAgo) {
      map[catId].postCount7d++;
      map[catId].commentSum7d += post.commentCount || 0;
    }
  });

  return map;
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
// Sub-components
// ============================================================================

/** Forum Icon — iconUrl 이미지 또는 이모지 fallback (항상 표시 보장) */
function ForumIcon({ category, size = 48 }: { category: ForumCategory; size?: number }) {
  const emoji = getForumIcon(category);

  if (category.iconUrl) {
    return (
      <img
        src={category.iconUrl}
        alt={category.name}
        className="rounded-xl object-cover flex-shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className="rounded-xl flex items-center justify-center flex-shrink-0"
      style={{
        width: size,
        height: size,
        backgroundColor: category.color ? `${category.color}18` : '#ecfdf5',
        fontSize: size * 0.5,
      }}
    >
      {emoji}
    </div>
  );
}

/** Hero Header */
function HeroHeader() {
  return (
    <header className="bg-white border-b border-slate-200">
      <PageContainer>
        <div className="py-8">
          <h1 className="text-2xl font-bold text-slate-900">GlycoPharm 포럼</h1>
          <p className="mt-1.5 text-sm text-slate-500">
            의약품과 건강기능식품에 대한 정보를 교환하고 토론에 참여하세요
          </p>
        </div>
      </PageContainer>
    </header>
  );
}

/** Forum Card Grid — 카테고리 카드 (핵심 1차 콘텐츠) + 활동 신호 */
function ForumCardGrid({ categories, activityMap }: { categories: ForumCategory[]; activityMap: Record<string, CategoryActivity> }) {
  if (categories.length === 0) {
    return (
      <section className="py-8">
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <div className="text-4xl mb-3">💊</div>
          <p className="text-slate-500 mb-1">등록된 포럼이 없습니다</p>
          <p className="text-sm text-slate-400">운영자가 포럼을 개설하면 여기에 표시됩니다</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-900">포럼 목록</h2>
        <span className="text-sm text-slate-400">{categories.length}개 포럼</span>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
        {categories.map((cat) => {
          const activity = activityMap[cat.id];
          const badge = getActivityBadge(activity);
          return (
            <Link
              key={cat.id}
              to={`/forum?category=${cat.slug}`}
              className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors group"
            >
              <ForumIcon category={cat} size={52} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-[15px] font-semibold text-slate-800 group-hover:text-emerald-600 transition-colors">
                    {cat.name}
                  </h3>
                  {cat.isPinned && (
                    <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                      추천
                    </span>
                  )}
                  {badge && (
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${badge.className}`}>
                      {badge.label}
                    </span>
                  )}
                </div>
                {cat.description && (
                  <p className="mt-0.5 text-xs text-slate-400 truncate">{cat.description}</p>
                )}
                {activity?.latestPostTitle && (
                  <p className="mt-0.5 text-xs text-slate-500 truncate">
                    최근: {activity.latestPostTitle}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-[11px] text-slate-400">
                    글 {cat.postCount ?? 0}개
                  </span>
                  {activity && activity.postCount7d > 0 && (
                    <span className="text-[11px] text-emerald-500">
                      이번 주 글 {activity.postCount7d}{activity.commentSum7d > 0 ? ` · 댓글 ${activity.commentSum7d}` : ''}
                    </span>
                  )}
                </div>
              </div>
              <svg className="w-5 h-5 text-slate-300 group-hover:text-emerald-400 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

/** 게시글 아이템 */
function PostItem({ post }: { post: DisplayPost }) {
  return (
    <li className="py-2.5 border-b border-slate-50 last:border-b-0">
      <div className="group">
        <div className="flex items-center gap-1.5">
          {post.isPinned && (
            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-500 text-white">
              공지
            </span>
          )}
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
    </li>
  );
}

/** 최근 활동 섹션 */
function ActivitySection() {
  const [recentPosts, setRecentPosts] = useState<DisplayPost[]>([]);
  const [popularPosts, setPopularPosts] = useState<DisplayPost[]>([]);

  useEffect(() => {
    apiClient.get<ForumPostRaw[]>('/api/v1/glycopharm/forum/posts?limit=10')
      .then((res) => {
        if (Array.isArray(res.data)) {
          const posts = res.data.map(normalizePost);
          setRecentPosts(posts.slice(0, 5));
          const sorted = [...posts].sort((a, b) => b.views - a.views);
          setPopularPosts(sorted.slice(0, 5));
        }
      })
      .catch(() => {});
  }, []);

  const hasContent = recentPosts.length > 0 || popularPosts.length > 0;
  if (!hasContent) return null;

  return (
    <section className="py-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 인기 글 */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-800">인기 글</h3>
            <Link to="/forum" className="text-xs text-slate-400 hover:text-emerald-600">
              더보기 →
            </Link>
          </div>
          <div className="px-5 py-2">
            {popularPosts.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">아직 게시글이 없습니다</p>
            ) : (
              <ul className="list-none m-0 p-0">
                {popularPosts.map((post) => (
                  <PostItem key={`popular-${post.id}`} post={post} />
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* 최근 글 */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-800">최근 글</h3>
            <Link to="/forum" className="text-xs text-slate-400 hover:text-emerald-600">
              더보기 →
            </Link>
          </div>
          <div className="px-5 py-2">
            {recentPosts.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">아직 게시글이 없습니다</p>
            ) : (
              <ul className="list-none m-0 p-0">
                {recentPosts.map((post) => (
                  <PostItem key={post.id} post={post} />
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/** 글쓰기 유도 CTA */
function WritePrompt() {
  const { isAuthenticated } = useAuth();

  return (
    <section className="py-6">
      <div className="flex items-center justify-between p-5 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-xl">
            ✏️
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">포럼에 참여해 보세요</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              {isAuthenticated
                ? '의견, 질문, 피드백을 자유롭게 나눠보세요'
                : '로그인 후 토론에 참여할 수 있습니다'}
            </p>
          </div>
        </div>
        {isAuthenticated ? (
          <Link
            to="/forum"
            className="px-5 py-2.5 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors whitespace-nowrap"
          >
            포럼 보기
          </Link>
        ) : (
          <Link
            to="/login"
            className="px-5 py-2.5 text-sm font-medium text-emerald-600 border border-emerald-200 rounded-lg hover:bg-emerald-50 transition-colors whitespace-nowrap"
          >
            로그인
          </Link>
        )}
      </div>
    </section>
  );
}

/** 이용안내 */
function InfoSection() {
  return (
    <section className="py-4 border-t border-slate-200">
      <div className="flex flex-wrap gap-2">
        <Link to="/forum" className="text-xs text-slate-400 hover:text-emerald-600 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-emerald-50 transition-colors">
          전체 글
        </Link>
        <Link to="/forum/feedback" className="text-xs text-slate-400 hover:text-emerald-600 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-emerald-50 transition-colors">
          피드백
        </Link>
      </div>
    </section>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function ForumHubPage() {
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [activityMap, setActivityMap] = useState<Record<string, CategoryActivity>>({});

  useEffect(() => {
    apiClient.get<ForumCategory[]>('/api/v1/glycopharm/forum/categories')
      .then((res) => {
        if (Array.isArray(res.data)) {
          setCategories(res.data);
        }
      })
      .catch(() => {});

    // Fetch recent posts to build activity signals
    apiClient.get<ForumPostRaw[]>('/api/v1/glycopharm/forum/posts?limit=30')
      .then((res) => {
        if (Array.isArray(res.data)) {
          setActivityMap(buildActivityMap(res.data));
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="bg-slate-50 min-h-[calc(100vh-200px)]">
      <PageHero>
        <HeroHeader />
      </PageHero>

      <PageSection>
        <PageContainer>
          <ForumCardGrid categories={categories} activityMap={activityMap} />
        </PageContainer>
      </PageSection>

      <PageSection>
        <PageContainer>
          <ActivitySection />
        </PageContainer>
      </PageSection>

      <PageSection>
        <PageContainer>
          <WritePrompt />
        </PageContainer>
      </PageSection>

      <PageSection last>
        <PageContainer>
          <InfoSection />
        </PageContainer>
      </PageSection>
    </div>
  );
}
