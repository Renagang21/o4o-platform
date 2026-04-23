/**
 * ForumHubPage - K-Cosmetics 포럼 허브 랜딩 페이지
 *
 * WO-O4O-FORUM-HUB-DAUM-STYLE-REFINEMENT-V1
 * 다음 카페 스타일 포럼 Hub: 카테고리(포럼) 카드 중심 탐색 UX
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PageHero, PageSection, PageContainer } from '@o4o/ui';
import { useAuth } from '../../contexts/AuthContext';
import {
  fetchForumPosts,
  fetchPopularForums,
  normalizePostType,
  getAuthorName,
  type ForumPost,
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
  '뷰티 트렌드': '💄',
  '스킨케어': '🧴',
  '메이크업': '💅',
  '성분 분석': '🔬',
  '일반 토론': '💬',
};

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

function getForumIcon(forum: PopularForum): string {
  if (forum.iconUrl) return '';
  return FALLBACK_ICONS[forum.name] || DEFAULT_FORUM_ICON;
}

/** Activity signal per forum */
interface ForumActivity {
  latestPostTitle?: string;
  latestPostDate?: string;
}

function getActivityBadge(forum: PopularForum, activity?: ForumActivity): { label: string; className: string } | null {
  const dateStr = activity?.latestPostDate;
  if (!dateStr) {
    if (forum.postCount7d > 0) return { label: '최근 활동', className: 'bg-slate-100 text-slate-600' };
    return null;
  }
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = diff / (1000 * 60 * 60);
  if (hours <= 24) return { label: '오늘 글 있음', className: 'bg-pink-500 text-white' };
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
function ForumIcon({ forum, size = 48 }: { forum: PopularForum; size?: number }) {
  const emoji = getForumIcon(forum);

  if (forum.iconUrl) {
    return (
      <img
        src={forum.iconUrl}
        alt={forum.name}
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
        backgroundColor: forum.color ? `${forum.color}18` : '#fdf2f8',
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
          <h1 className="text-2xl font-bold text-slate-900">K-Cosmetics 포럼</h1>
          <p className="mt-1.5 text-sm text-slate-500">
            뷰티 트렌드와 화장품에 대한 정보를 교환하고 토론에 참여하세요
          </p>
        </div>
      </PageContainer>
    </header>
  );
}

/** Forum Card Grid — 카테고리(포럼) 카드 (핵심 1차 콘텐츠) + 활동 신호 */
function ForumCardGrid({ forums, basePath, activityMap }: { forums: PopularForum[]; basePath: string; activityMap: Record<string, ForumActivity> }) {
  if (forums.length === 0) {
    return (
      <section className="py-8">
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <div className="text-4xl mb-3">💄</div>
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
        <span className="text-sm text-slate-400">{forums.length}개 포럼</span>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
        {forums.map((forum) => {
          const activity = activityMap[forum.id];
          const badge = getActivityBadge(forum, activity);
          return (
            <Link
              key={forum.id}
              to={`${basePath}?category=${forum.id}`}
              className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors group"
            >
              <ForumIcon forum={forum} size={52} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-[15px] font-semibold text-slate-800 group-hover:text-pink-600 transition-colors">
                    {forum.name}
                  </h3>
                  {badge && (
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${badge.className}`}>
                      {badge.label}
                    </span>
                  )}
                </div>
                {forum.description && (
                  <p className="mt-0.5 text-xs text-slate-400 truncate">{forum.description}</p>
                )}
                {activity?.latestPostTitle && (
                  <p className="mt-0.5 text-xs text-slate-500 truncate">
                    최근: {activity.latestPostTitle}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-[11px] text-slate-400">
                    글 {forum.postCount ?? 0}개
                  </span>
                  {forum.postCount7d > 0 && (
                    <span className="text-[11px] text-pink-500">
                      이번 주 글 {forum.postCount7d}{forum.commentSum7d > 0 ? ` · 댓글 ${forum.commentSum7d}` : ''}
                    </span>
                  )}
                </div>
              </div>
              <svg className="w-5 h-5 text-slate-300 group-hover:text-pink-400 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      <Link to={`${basePath}/post/${post.id}`} className="block group">
        <div className="flex items-center gap-1.5">
          {post.isPinned && (
            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-500 text-white">
              공지
            </span>
          )}
          <span className="text-sm text-slate-700 group-hover:text-pink-600 transition-colors truncate">
            {post.title}
          </span>
          {post.commentCount > 0 && (
            <span className="text-xs text-pink-500 font-medium flex-shrink-0">
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

/** 최근 활동 섹션 */
function ActivitySection({ basePath }: { basePath: string }) {
  const [recentPosts, setRecentPosts] = useState<DisplayPost[]>([]);
  const [popularPosts, setPopularPosts] = useState<DisplayPost[]>([]);

  useEffect(() => {
    fetchForumPosts({ limit: 5 })
      .then((res) => {
        if (res.data) {
          const posts = res.data.map(toDisplayPost);
          setRecentPosts(posts);
          const sorted = [...posts].sort((a, b) => b.viewCount - a.viewCount);
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
            <Link to={`${basePath}?sort=popular`} className="text-xs text-slate-400 hover:text-pink-600">
              더보기 →
            </Link>
          </div>
          <div className="px-5 py-2">
            {popularPosts.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">아직 게시글이 없습니다</p>
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
            <Link to={`${basePath}?sort=latest`} className="text-xs text-slate-400 hover:text-pink-600">
              더보기 →
            </Link>
          </div>
          <div className="px-5 py-2">
            {recentPosts.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">아직 게시글이 없습니다</p>
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
      <div className="flex items-center justify-between p-5 bg-gradient-to-r from-pink-50 to-rose-50 rounded-xl border border-pink-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-pink-100 flex items-center justify-center text-xl">
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
            className="px-5 py-2.5 text-sm font-semibold text-white bg-pink-600 rounded-lg hover:bg-pink-700 transition-colors whitespace-nowrap"
          >
            포럼 보기
          </Link>
        ) : (
          <Link
            to="/login"
            className="px-5 py-2.5 text-sm font-medium text-pink-600 border border-pink-200 rounded-lg hover:bg-pink-50 transition-colors whitespace-nowrap"
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
        <Link to={`${basePath}?sort=popular`} className="text-xs text-slate-400 hover:text-pink-600 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-pink-50 transition-colors">
          인기 글
        </Link>
        <Link to={`${basePath}?type=announcement`} className="text-xs text-slate-400 hover:text-pink-600 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-pink-50 transition-colors">
          공지사항
        </Link>
      </div>
    </section>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ForumHubPage() {
  const basePath = '/forum';
  const [forums, setForums] = useState<PopularForum[]>([]);
  const [activityMap, setActivityMap] = useState<Record<string, ForumActivity>>({});

  useEffect(() => {
    fetchPopularForums(20)
      .then((res) => {
        if (res.success && res.data) setForums(res.data);
      })
      .catch(() => {});

    // Fetch recent posts for latest post preview per category
    fetchForumPosts({ limit: 30 })
      .then((res) => {
        if (res.data) {
          const latestByCategory: Record<string, ForumActivity> = {};
          res.data.forEach((post) => {
            const catId = (post as any).categoryId || (post as any).category?.id;
            if (catId && !latestByCategory[catId]) {
              latestByCategory[catId] = {
                latestPostTitle: post.title,
                latestPostDate: post.createdAt,
              };
            }
          });
          setActivityMap(latestByCategory);
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
          <ForumCardGrid forums={forums} basePath={basePath} activityMap={activityMap} />
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

export default ForumHubPage;
