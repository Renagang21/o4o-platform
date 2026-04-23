/**
 * ForumHubPage - 포럼 허브 랜딩 페이지
 *
 * WO-O4O-FORUM-HUB-DAUM-STYLE-REFINEMENT-V1
 * 다음 카페 스타일 포럼 Hub: 카테고리(포럼) 카드 중심 탐색 UX
 *
 * ForumHubPage
 * ├─ HeroHeader (포럼 아이덴티티 + 글쓰기 CTA)
 * ├─ ForumCardGrid (카테고리 카드 — 핵심 1차 콘텐츠)
 * ├─ ActivitySection (인기 글 + 최근 글 — 2차 보조)
 * ├─ WritePrompt (글쓰기/로그인 유도 CTA)
 * └─ InfoSection (이용안내 + 바로가기)
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PageHero, PageSection, PageContainer } from '@o4o/ui';
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
  '일반 토론': '💬',
  '뉴스': '📰',
  '가이드': '📖',
};

// ============================================================================
// Props
// ============================================================================

interface ForumHubPageProps {
  title?: string;
  description?: string;
  basePath?: string;
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

/** Activity signal per category */
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
  if (hours <= 24) return { label: '오늘 글 있음', className: 'bg-blue-500 text-white' };
  if (hours <= 168) return { label: '최근 활동', className: 'bg-slate-100 text-slate-600' };
  return null;
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
        backgroundColor: category.color ? `${category.color}18` : '#f0f9ff',
        fontSize: size * 0.5,
      }}
    >
      {emoji}
    </div>
  );
}

/** Hero Header — 포럼 아이덴티티 */
function HeroHeader({ title, description }: { title: string; description: string }) {
  return (
    <header className="bg-white border-b border-slate-200">
      <PageContainer>
        <div className="py-8">
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          <p className="mt-1.5 text-sm text-slate-500">{description}</p>
        </div>
      </PageContainer>
    </header>
  );
}

/** Forum Card Grid — 카테고리 카드 (다음 카페 스타일 핵심 UI) + 활동 신호 */
function ForumCardGrid({ categories, basePath, activityMap }: { categories: ForumCategory[]; basePath: string; activityMap: Record<string, CategoryActivity> }) {
  if (categories.length === 0) {
    return (
      <section className="py-8">
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <div className="text-4xl mb-3">📂</div>
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
              to={`${basePath}?category=${cat.id}`}
              className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors group"
            >
              <ForumIcon category={cat} size={52} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-[15px] font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">
                    {cat.name}
                  </h3>
                  {cat.isPinned && (
                    <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
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
                    <span className="text-[11px] text-blue-500">
                      이번 주 글 {activity.postCount7d}{activity.commentSum7d > 0 ? ` · 댓글 ${activity.commentSum7d}` : ''}
                    </span>
                  )}
                </div>
              </div>
              <svg className="w-5 h-5 text-slate-300 group-hover:text-blue-400 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
function PostItem({ post, basePath }: { post: DisplayPost; basePath: string }) {
  return (
    <li className="py-2.5 border-b border-slate-50 last:border-b-0">
      <Link to={`${basePath}/post/${post.slug}`} className="block group">
        <div className="flex items-center gap-1.5">
          {post.isPinned && (
            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-500 text-white">
              공지
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
      </Link>
    </li>
  );
}

/** 최근 활동 섹션 — 2열 그리드 */
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

  const hasContent = recentPosts.length > 0 || popularPosts.length > 0;
  if (!hasContent) return null;

  return (
    <section className="py-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 인기 글 */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-800">인기 글</h3>
            <Link to={`${basePath}?sort=popular`} className="text-xs text-slate-400 hover:text-blue-600">
              더보기 →
            </Link>
          </div>
          <div className="px-5 py-2">
            {popularPosts.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">
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

        {/* 최근 글 */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-800">최근 글</h3>
            <Link to={`${basePath}?sort=latest`} className="text-xs text-slate-400 hover:text-blue-600">
              더보기 →
            </Link>
          </div>
          <div className="px-5 py-2">
            {recentPosts.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">
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
      </div>
    </section>
  );
}

/** 글쓰기 유도 CTA */
function WritePrompt({ basePath }: { basePath: string }) {
  const { isAuthenticated } = useAuth();

  return (
    <section className="py-6">
      <div className="flex items-center justify-between p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-xl">
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
            to={basePath}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
          >
            포럼 보기
          </Link>
        ) : (
          <Link
            to="/workspace"
            className="px-5 py-2.5 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors whitespace-nowrap"
          >
            로그인
          </Link>
        )}
      </div>
    </section>
  );
}

/** 이용안내 */
function InfoSection({ basePath }: { basePath: string }) {
  return (
    <section className="py-4 border-t border-slate-200">
      <div className="flex flex-wrap gap-2">
        <Link to={`${basePath}?sort=popular`} className="text-xs text-slate-400 hover:text-blue-600 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-blue-50 transition-colors">
          인기 글
        </Link>
        <Link to={`${basePath}?type=announcement`} className="text-xs text-slate-400 hover:text-blue-600 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-blue-50 transition-colors">
          공지사항
        </Link>
      </div>
    </section>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function ForumHubPage({
  title = 'o4o · 네뚜레 포럼',
  description = 'o4o 개념과 네뚜레 구조에 대한 질문과 의견을 나누는 공간입니다',
  basePath = '/forum',
}: ForumHubPageProps) {
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [activityMap, setActivityMap] = useState<Record<string, CategoryActivity>>({});

  useEffect(() => {
    fetchForumCategories()
      .then((res) => {
        if (res.success && res.data) setCategories(res.data);
      })
      .catch(() => {});

    // Fetch 7d stats from popular forums endpoint
    fetchPopularForums(50)
      .then((res) => {
        if (res.success && res.data) {
          const map: Record<string, CategoryActivity> = {};
          res.data.forEach((f: PopularForum) => {
            map[f.id] = {
              postCount7d: f.postCount7d,
              commentSum7d: f.commentSum7d,
            };
          });
          setActivityMap((prev) => {
            const merged = { ...prev };
            Object.keys(map).forEach((id) => {
              merged[id] = { ...merged[id], ...map[id] };
            });
            return merged;
          });
        }
      })
      .catch(() => {});

    // Fetch recent posts for latest post preview per category
    fetchForumPosts({ limit: 30, sortBy: 'latest' })
      .then((res) => {
        if (res.data) {
          const latestByCategory: Record<string, { title: string; date: string }> = {};
          res.data.forEach((post) => {
            const catId = post.categoryId || post.category?.id;
            if (catId && !latestByCategory[catId]) {
              latestByCategory[catId] = { title: post.title, date: post.createdAt };
            }
          });
          setActivityMap((prev) => {
            const merged = { ...prev };
            Object.entries(latestByCategory).forEach(([id, info]) => {
              merged[id] = {
                ...merged[id],
                postCount7d: merged[id]?.postCount7d ?? 0,
                commentSum7d: merged[id]?.commentSum7d ?? 0,
                latestPostTitle: info.title,
                latestPostDate: info.date,
              };
            });
            return merged;
          });
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="bg-slate-50 min-h-[calc(100vh-200px)]">
      <PageHero>
        <HeroHeader title={title} description={description} />
      </PageHero>

      <PageSection>
        <PageContainer>
          <ForumCardGrid categories={categories} basePath={basePath} activityMap={activityMap} />
        </PageContainer>
      </PageSection>

      <PageSection>
        <PageContainer>
          <ActivitySection basePath={basePath} />
        </PageContainer>
      </PageSection>

      <PageSection>
        <PageContainer>
          <WritePrompt basePath={basePath} />
        </PageContainer>
      </PageSection>

      <PageSection last>
        <PageContainer>
          <InfoSection basePath={basePath} />
        </PageContainer>
      </PageSection>
    </div>
  );
}

export { ForumHubPage };
