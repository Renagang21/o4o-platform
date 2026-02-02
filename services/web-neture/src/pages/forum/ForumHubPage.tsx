/**
 * ForumHubPage - 포럼 허브 랜딩 페이지
 *
 * WO-O4O-FORUM-HUB-UI-REDESIGN-IMPLEMENTATION-V1
 * Daum 커뮤니티 스타일 UI 전면 개편
 *
 * ForumHubPage
 * ├─ Header (타이틀 + 설명 + 글쓰기 CTA)
 * ├─ CategoryQuickLinks (카테고리 빠른 탐색)
 * ├─ FeaturedForumsGrid (추천 포럼 카드형)
 * ├─ ActivitySection (최근 글 + 인기 글 2열 그리드)
 * ├─ CategoryForumList (카테고리별 포럼 리스트)
 * ├─ WritePrompt (글쓰기 유도 CTA)
 * └─ InfoSection (이용안내 + 바로가기)
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts';
import {
  fetchForumPosts,
  fetchForumCategories,
  fetchPopularForums,
  normalizePostType,
  getAuthorName,
  type ForumPost,
  type ForumCategory,
  type PopularForum,
} from '../../services/forumApi';

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
  'Neture 포럼': '🌿',
  '테스트 피드백': '🧪',
  '서비스 업데이트': '🔄',
};

// ============================================================================
// Props
// ============================================================================

interface ForumHubPageProps {
  title?: string;
  description?: string;
  basePath?: string;
  guidelines?: string[];
}

// ============================================================================
// Helpers
// ============================================================================

interface DisplayPost {
  id: string;
  title: string;
  slug: string;
  type: string;
  authorName: string;
  isPinned: boolean;
  commentCount: number;
  viewCount: number;
  createdAt: string;
  categoryName: string;
}

function toDisplayPost(post: ForumPost): DisplayPost {
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    type: normalizePostType(post.type),
    authorName: getAuthorName(post),
    isPinned: post.isPinned,
    commentCount: post.commentCount || 0,
    viewCount: post.viewCount || 0,
    createdAt: post.createdAt,
    categoryName: post.category?.name || '',
  };
}

function getForumIcon(category: ForumCategory): string {
  if (category.iconUrl) return '';
  if (category.iconEmoji) return category.iconEmoji;
  return FALLBACK_ICONS[category.name] || DEFAULT_FORUM_ICON;
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

/** Forum Icon - iconUrl 이미지 또는 이모지 fallback */
function ForumIcon({ category, size = 40 }: { category: ForumCategory; size?: number }) {
  const emoji = getForumIcon(category);

  if (category.iconUrl) {
    return (
      <img
        src={category.iconUrl}
        alt={category.name}
        style={{
          width: size,
          height: size,
          borderRadius: 8,
          objectFit: 'cover',
          flexShrink: 0,
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 8,
        backgroundColor: category.color ? `${category.color}20` : '#f1f5f9',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.5,
        flexShrink: 0,
      }}
    >
      {emoji}
    </div>
  );
}

/** 카테고리 빠른 탐색 */
function CategoryQuickLinks({
  categories,
  basePath,
}: {
  categories: ForumCategory[];
  basePath: string;
}) {
  if (categories.length === 0) return null;

  return (
    <nav className="forum-hub-quick-links">
      <div className="flex items-center gap-2 overflow-x-auto py-3 px-1 scrollbar-hide">
        <Link
          to={`${basePath}?view=all`}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium bg-blue-600 text-white whitespace-nowrap transition-colors hover:bg-blue-700"
        >
          전체
        </Link>
        {categories.map((cat) => (
          <Link
            key={cat.id}
            to={`${basePath}?category=${cat.id}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium bg-white text-slate-600 border border-slate-200 whitespace-nowrap transition-colors hover:bg-slate-50 hover:border-slate-300"
          >
            {getForumIcon(cat) && <span className="text-sm">{getForumIcon(cat)}</span>}
            {cat.name}
          </Link>
        ))}
      </div>
    </nav>
  );
}

/** 인기 포럼 카드형 그리드 (활동 기반 순위) */
function FeaturedForumsGrid({
  popularForums,
  categories,
  basePath,
}: {
  popularForums: PopularForum[];
  categories: ForumCategory[];
  basePath: string;
}) {
  // popularForums가 있으면 사용, 없으면 카테고리 fallback
  const featured: Array<{ id: string; name: string; description?: string | null; slug: string; color?: string | null; iconUrl?: string | null; postCount: number; postCount7d?: number }> =
    popularForums.length > 0
      ? popularForums.slice(0, 4)
      : categories.slice(0, 4);

  if (featured.length === 0) return null;

  // Build a category lookup for ForumIcon rendering
  const catMap = new Map(categories.map((c) => [c.id, c]));

  return (
    <section className="py-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-900">인기 포럼</h2>
        <Link to={`${basePath}?view=all`} className="text-sm text-blue-600 hover:text-blue-700">
          전체보기 →
        </Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {featured.map((forum) => {
          const cat = catMap.get(forum.id);
          return (
            <Link
              key={forum.id}
              to={`${basePath}?category=${forum.id}`}
              className="group flex flex-col items-center gap-3 p-5 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all"
            >
              {cat ? (
                <ForumIcon category={cat} size={48} />
              ) : (
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 8,
                    backgroundColor: forum.color ? `${forum.color}20` : '#f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 24,
                    flexShrink: 0,
                  }}
                >
                  {forum.iconUrl ? (
                    <img src={forum.iconUrl} alt={forum.name} style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover' }} />
                  ) : (
                    FALLBACK_ICONS[forum.name] || DEFAULT_FORUM_ICON
                  )}
                </div>
              )}
              <div className="text-center">
                <h3 className="text-sm font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">
                  {forum.name}
                </h3>
                {forum.description && (
                  <p className="mt-1 text-xs text-slate-400 line-clamp-2">
                    {forum.description}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
                  {forum.postCount ?? 0}개 글
                </span>
                {'postCount7d' in forum && (forum as PopularForum).postCount7d > 0 && (
                  <span className="text-[10px] text-slate-400">
                    이번 주 +{(forum as PopularForum).postCount7d}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

/** 게시글 아이템 */
function PostItem({ post, basePath }: { post: DisplayPost; basePath: string }) {
  return (
    <li className="py-2.5 border-b border-slate-50 last:border-b-0">
      <Link to={`${basePath}/post/${post.slug}`} className="block group">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              {post.isPinned && (
                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-500 text-white">
                  공지
                </span>
              )}
              {post.categoryName && (
                <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-500">
                  {post.categoryName}
                </span>
              )}
              <span className="text-sm text-slate-700 group-hover:text-blue-600 transition-colors truncate">
                {post.title}
              </span>
              {post.commentCount > 0 && (
                <span className="text-xs text-blue-500 font-medium flex-shrink-0">
                  [{post.commentCount}]
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 mt-1 text-xs text-slate-400">
              <span>{post.authorName}</span>
              <span className="text-slate-300">·</span>
              <span>{formatDate(post.createdAt)}</span>
              <span className="text-slate-300">·</span>
              <span>조회 {post.viewCount}</span>
            </div>
          </div>
        </div>
      </Link>
    </li>
  );
}

/** 최근 활동 섹션 */
function ActivitySection({ basePath }: { basePath: string }) {
  const [recentPosts, setRecentPosts] = useState<DisplayPost[]>([]);
  const [popularPosts, setPopularPosts] = useState<DisplayPost[]>([]);

  useEffect(() => {
    fetchForumPosts({ limit: 5, sortBy: 'latest' })
      .then((res) => {
        if (res.data) setRecentPosts(res.data.map(toDisplayPost));
      })
      .catch(() => {});

    fetchForumPosts({ limit: 5, sortBy: 'popular' })
      .then((res) => {
        if (res.data) {
          const sorted = [...res.data]
            .map(toDisplayPost)
            .sort((a, b) => b.viewCount - a.viewCount);
          setPopularPosts(sorted);
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
            <Link to={`${basePath}?sort=latest`} className="text-xs text-slate-400 hover:text-blue-600">
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
                  <PostItem key={post.id} post={post} basePath={basePath} />
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* 인기 글 */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-800">인기 글</h3>
            <Link to={`${basePath}?sort=popular`} className="text-xs text-slate-400 hover:text-blue-600">
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
                  <PostItem key={`popular-${post.id}`} post={post} basePath={basePath} />
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/** 카테고리별 포럼 리스트 */
function CategoryForumList({
  categories,
  basePath,
}: {
  categories: ForumCategory[];
  basePath: string;
}) {
  if (categories.length === 0) return null;

  return (
    <section className="py-6">
      <h2 className="text-lg font-bold text-slate-900 mb-4">카테고리별 포럼</h2>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-50">
        {categories.map((cat) => (
          <Link
            key={cat.id}
            to={`${basePath}?category=${cat.id}`}
            className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors group"
          >
            <ForumIcon category={cat} size={40} />
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">
                {cat.name}
              </h3>
              {cat.description && (
                <p className="mt-0.5 text-xs text-slate-400 truncate">
                  {cat.description}
                </p>
              )}
            </div>
            <div className="flex items-center gap-4 flex-shrink-0">
              <div className="text-right">
                <span className="text-sm font-semibold text-slate-700">
                  {cat.postCount ?? 0}
                </span>
                <span className="text-xs text-slate-400 ml-1">글</span>
              </div>
              <svg className="w-4 h-4 text-slate-300 group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

/** 글쓰기 유도 CTA */
function WritePrompt({ basePath }: { basePath: string }) {
  const { isAuthenticated } = useAuth();

  return (
    <section className="py-6">
      <div className="flex items-center justify-between p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-xl">
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
            to={`${basePath}/write`}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors whitespace-nowrap"
          >
            글쓰기
          </Link>
        ) : (
          <Link
            to="/workspace"
            className="px-5 py-2.5 text-sm font-medium text-blue-600 border border-blue-200 rounded-xl hover:bg-blue-50 transition-colors whitespace-nowrap"
          >
            로그인
          </Link>
        )}
      </div>
    </section>
  );
}

/** 이용안내 */
function InfoSection({ basePath, guidelines }: { basePath: string; guidelines: string[] }) {
  return (
    <section className="py-6 border-t border-slate-100">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">이용안내</h4>
          <ul className="space-y-1.5 text-xs text-slate-400 list-disc pl-4">
            {guidelines.map((text, i) => (
              <li key={i}>{text}</li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">바로가기</h4>
          <div className="flex flex-wrap gap-2">
            <Link to={`${basePath}/write`} className="text-xs text-slate-400 hover:text-blue-600 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-blue-50 transition-colors">
              글쓰기
            </Link>
            <Link to={`${basePath}?sort=popular`} className="text-xs text-slate-400 hover:text-blue-600 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-blue-50 transition-colors">
              인기 글
            </Link>
            <Link to={`${basePath}?type=announcement`} className="text-xs text-slate-400 hover:text-blue-600 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-blue-50 transition-colors">
              공지사항
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

const DEFAULT_GUIDELINES = [
  '질문, 의견, 피드백을 자유롭게 남겨주세요',
  '상품 홍보나 고객 문의 용도가 아닌 공간입니다',
  '개인정보 보호에 유의해 주세요',
];

export default function ForumHubPage({
  title = 'o4o · 네뚜레 포럼',
  description = 'o4o 개념과 네뚜레 구조에 대한 질문과 의견을 나누는 공간입니다',
  basePath = '/forum',
  guidelines = DEFAULT_GUIDELINES,
}: ForumHubPageProps) {
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [popularForums, setPopularForums] = useState<PopularForum[]>([]);

  useEffect(() => {
    fetchForumCategories()
      .then((res) => {
        if (res.success && res.data) setCategories(res.data);
      })
      .catch(() => {});

    fetchPopularForums(4)
      .then((res) => {
        if (res.success && res.data) setPopularForums(res.data);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="bg-slate-50 min-h-[calc(100vh-200px)]">
      <div className="max-w-[960px] mx-auto px-4 md:px-6 pb-12">
        {/* Header */}
        <header className="pt-10 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
              <p className="mt-1 text-sm text-slate-500">{description}</p>
            </div>
            <Link
              to={`${basePath}/write`}
              className="hidden md:inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              글쓰기
            </Link>
          </div>
        </header>

        {/* Category Quick Links */}
        <CategoryQuickLinks categories={categories} basePath={basePath} />

        {/* Featured Forums (activity-based ranking) */}
        <FeaturedForumsGrid popularForums={popularForums} categories={categories} basePath={basePath} />

        {/* Activity - Recent & Popular Posts */}
        <ActivitySection basePath={basePath} />

        {/* Category Forum List */}
        <CategoryForumList categories={categories} basePath={basePath} />

        {/* Write Prompt */}
        <WritePrompt basePath={basePath} />

        {/* Info */}
        <InfoSection basePath={basePath} guidelines={guidelines} />
      </div>
    </div>
  );
}

export { ForumHubPage };
