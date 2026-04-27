/**
 * CommunityPage - 커뮤니티 허브
 *
 * WO-O4O-NETURE-COMMUNITY-PAGE-V1
 * WO-O4O-NETURE-COMMUNITY-HOME-V1: 데이터 기반 허브로 재구성
 *
 * 구조:
 * 1. Hero (gradient)
 * 2. 공지사항 (CMS notice)
 * 3. 콘텐츠 하이라이트 (CMS featured)
 * 3.5. Articles (Forum article 카테고리, WO-O4O-COMMUNITY-ARTICLE-SYSTEM-V1)
 * 4. 최근 포럼 글 (Forum API)
 * 5. 인기 포럼 카테고리 (Popular Forums)
 * 6. 커뮤니티 통계 (Popular Forums 집계)
 * 7. Digital Signage 안내 (정적)
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PageContainer } from '@o4o/ui';
import {
  Bell,
  MessageSquare,
  ArrowRight,
  FileText,
  Heart,
  Eye,
  MessageCircle,
  TrendingUp,
  Users,
  Layers,
  PenSquare,
  BookOpen,
  Paperclip,
} from 'lucide-react';
import { useAuth } from '../contexts';
import { cmsApi, type CmsContent } from '../lib/api/content';
import { hubContentApi } from '../lib/api/hubContent';
import type { HubContentItemResponse } from '@o4o/types/hub-content';
import {
  fetchForumPosts,
  fetchForumCategories,
  fetchPopularForums,
  getAuthorName,
  type ForumPost,
  type PopularForum,
} from '../services/forumApi';

function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return '오늘';
  if (days === 1) return '어제';
  if (days < 7) return `${days}일 전`;
  return date.toLocaleDateString('ko-KR');
}

export default function CommunityPage() {
  const { isAuthenticated } = useAuth();
  const [notices, setNotices] = useState<CmsContent[]>([]);
  const [hubContents, setHubContents] = useState<HubContentItemResponse[]>([]);
  const [knowledges, setKnowledges] = useState<CmsContent[]>([]);
  const [articles, setArticles] = useState<ForumPost[]>([]);
  const [recentPosts, setRecentPosts] = useState<ForumPost[]>([]);
  const [popularCategories, setPopularCategories] = useState<PopularForum[]>([]);

  useEffect(() => {
    cmsApi.getContents({ type: 'notice', sort: 'latest', limit: 5 })
      .then(res => setNotices(res.data))
      .catch(() => {});

    // WO-O4O-CONTENT-FRONTEND-ACTIVATION-V1: hub content API로 교체
    hubContentApi.list({ sourceDomain: 'cms', limit: 50 })
      .then(res => setHubContents(Array.isArray(res.data) ? res.data : []))
      .catch(() => {});

    cmsApi.getContents({ type: 'knowledge', sort: 'latest', limit: 5 })
      .then(res => setKnowledges(res.data))
      .catch(() => {});

    // Articles: article 카테고리의 포럼 글
    fetchForumCategories()
      .then(res => {
        if (res.data) {
          const articleCat = res.data.find(c => c.slug === 'article');
          if (articleCat) {
            fetchForumPosts({ categoryId: articleCat.id, limit: 5, sortBy: 'latest' })
              .then(postsRes => { if (postsRes.data) setArticles(postsRes.data); })
              .catch(() => {});
          }
        }
      })
      .catch(() => {});

    fetchForumPosts({ limit: 10, sortBy: 'latest' })
      .then(res => { if (res.data) setRecentPosts(res.data); })
      .catch(() => {});

    fetchPopularForums(6)
      .then(res => { if (res.data) setPopularCategories(res.data); })
      .catch(() => {});
  }, []);

  // Split hub content into recommended (isPinned) and recent
  const recommendedContent = hubContents.filter(c => c.isPinned).slice(0, 6);
  const recommendedIds = new Set(recommendedContent.map(c => c.id));
  const recentContent = hubContents.filter(c => !recommendedIds.has(c.id)).slice(0, 6);

  // 통계 집계
  const totalPosts7d = popularCategories.reduce((sum, c) => sum + c.postCount7d, 0);
  const totalComments7d = popularCategories.reduce((sum, c) => sum + c.commentSum7d, 0);
  const activeForumCount = popularCategories.filter(c => c.postCount7d > 0).length;

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-16">
        <PageContainer>
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-3">Neture</h1>
            <p className="text-lg text-white/80">
              유통 · 콘텐츠 · 커뮤니티 플랫폼
            </p>
          </div>
        </PageContainer>
      </section>

      {/* AppEntrySection — 2단 진입 구조 */}
      <section className="py-10 bg-white border-b border-gray-100">
        <PageContainer>
          {/* Primary */}
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">핵심 기능</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <Link
              to="/market-trial"
              className="flex items-center gap-4 p-5 bg-primary-50 rounded-xl border border-primary-100 hover:border-primary-300 hover:shadow-sm transition-all group"
            >
              <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5 text-primary-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 group-hover:text-primary-600">유통 참여형 펀딩</p>
                <p className="text-xs text-gray-500">Market Trial</p>
              </div>
              <ArrowRight className="ml-auto shrink-0 w-4 h-4 text-gray-300 group-hover:text-primary-600" />
            </Link>
            <Link
              to="/supplier"
              className="flex items-center gap-4 p-5 bg-gray-50 rounded-xl border border-gray-100 hover:border-primary-200 hover:shadow-sm transition-all group"
            >
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                <Layers className="w-5 h-5 text-gray-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 group-hover:text-primary-600">Supplier</p>
                <p className="text-xs text-gray-500">공급자 공간</p>
              </div>
              <ArrowRight className="ml-auto shrink-0 w-4 h-4 text-gray-300 group-hover:text-primary-600" />
            </Link>
            <Link
              to="/partner"
              className="flex items-center gap-4 p-5 bg-gray-50 rounded-xl border border-gray-100 hover:border-primary-200 hover:shadow-sm transition-all group"
            >
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 text-gray-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 group-hover:text-primary-600">Partner</p>
                <p className="text-xs text-gray-500">파트너 공간</p>
              </div>
              <ArrowRight className="ml-auto shrink-0 w-4 h-4 text-gray-300 group-hover:text-primary-600" />
            </Link>
          </div>
          {/* Secondary */}
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">확장 기능</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              to="/forum"
              className="flex items-center gap-4 p-5 bg-gray-50 rounded-xl border border-gray-100 hover:border-primary-200 hover:shadow-sm transition-all group"
            >
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                <MessageSquare className="w-5 h-5 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 group-hover:text-primary-600">Forum</p>
                <p className="text-xs text-gray-500">커뮤니티 포럼</p>
              </div>
              <ArrowRight className="ml-auto shrink-0 w-4 h-4 text-gray-300 group-hover:text-primary-600" />
            </Link>
            <Link
              to="/content"
              className="flex items-center gap-4 p-5 bg-gray-50 rounded-xl border border-gray-100 hover:border-primary-200 hover:shadow-sm transition-all group"
            >
              <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 group-hover:text-primary-600">Content</p>
                <p className="text-xs text-gray-500">자료 · 콘텐츠</p>
              </div>
              <ArrowRight className="ml-auto shrink-0 w-4 h-4 text-gray-300 group-hover:text-primary-600" />
            </Link>
          </div>
        </PageContainer>
      </section>

      {/* 공지사항 */}
      {notices.length > 0 && (
        <section className="py-12 bg-white">
          <PageContainer>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-amber-600" />
                <h2 className="text-xl font-bold text-gray-900">공지사항</h2>
              </div>
              <Link
                to="/notices"
                className="inline-flex items-center text-sm font-medium text-amber-600 hover:text-amber-700"
              >
                전체 보기
                <ArrowRight className="ml-1 w-4 h-4" />
              </Link>
            </div>
            <div className="space-y-3">
              {notices.map(notice => (
                <Link
                  key={notice.id}
                  to={`/notices/${notice.id}`}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-amber-50 transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {notice.isPinned && (
                      <span className="shrink-0 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded">
                        중요
                      </span>
                    )}
                    <span className="text-sm text-gray-900 truncate group-hover:text-amber-700">
                      {notice.title}
                    </span>
                  </div>
                  <span className="shrink-0 ml-4 text-xs text-gray-500">
                    {notice.publishedAt ? formatRelativeDate(notice.publishedAt) : ''}
                  </span>
                </Link>
              ))}
            </div>
          </PageContainer>
        </section>
      )}

      {/* 콘텐츠 (WO-O4O-CONTENT-FRONTEND-ACTIVATION-V1) */}
      {hubContents.length > 0 && (
        <section className="py-12 bg-gray-50">
          <PageContainer>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary-600" />
                <h2 className="text-xl font-bold text-gray-900">콘텐츠</h2>
              </div>
              <Link
                to="/content"
                className="inline-flex items-center text-sm font-medium text-primary-600 hover:text-primary-700"
              >
                전체보기
                <ArrowRight className="ml-1 w-4 h-4" />
              </Link>
            </div>

            {/* 추천 콘텐츠 */}
            {recommendedContent.length > 0 && (
              <div className="mb-8">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">추천 콘텐츠</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {recommendedContent.map(item => (
                    <HubContentCard key={item.id} item={item} />
                  ))}
                </div>
              </div>
            )}

            {/* 최근 콘텐츠 */}
            {recentContent.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">최근 콘텐츠</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {recentContent.map(item => (
                    <HubContentCard key={item.id} item={item} />
                  ))}
                </div>
              </div>
            )}
          </PageContainer>
        </section>
      )}

      {/* Articles (WO-O4O-COMMUNITY-ARTICLE-SYSTEM-V1) */}
      {articles.length > 0 && (
        <section className="py-12 bg-white">
          <PageContainer>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <PenSquare className="w-5 h-5 text-primary-600" />
                <h2 className="text-xl font-bold text-gray-900">Articles</h2>
              </div>
              <div className="flex items-center gap-3">
                {isAuthenticated && (
                  <Link
                    to="/forum/write"
                    className="inline-flex items-center text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    글쓰기
                  </Link>
                )}
              </div>
            </div>
            <div className="space-y-2">
              {articles.map(post => (
                <Link
                  key={post.id}
                  to={`/forum/post/${post.slug}`}
                  className="flex items-center justify-between p-4 rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate group-hover:text-primary-600">
                      {post.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {getAuthorName(post)} · {formatRelativeDate(post.publishedAt || post.createdAt)}
                    </p>
                  </div>
                  <div className="shrink-0 ml-4 flex items-center gap-3 text-xs text-gray-400">
                    {post.viewCount != null && post.viewCount > 0 && (
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {post.viewCount}
                      </span>
                    )}
                    {post.commentCount > 0 && (
                      <span className="flex items-center gap-1">
                        <MessageCircle className="w-3 h-3" />
                        {post.commentCount}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </PageContainer>
        </section>
      )}

      {/* Knowledge (WO-O4O-KNOWLEDGE-LIBRARY-V1) */}
      {knowledges.length > 0 && (
        <section className="py-12 bg-gray-50">
          <PageContainer>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary-600" />
                <h2 className="text-xl font-bold text-gray-900">Knowledge</h2>
              </div>
              <Link
                to="/content"
                className="inline-flex items-center text-sm font-medium text-primary-600 hover:text-primary-700"
              >
                더보기
                <ArrowRight className="ml-1 w-4 h-4" />
              </Link>
            </div>
            <div className="space-y-2">
              {knowledges.map(item => (
                <Link
                  key={item.id}
                  to={`/content`}
                  className="flex items-center justify-between p-4 rounded-lg hover:bg-white transition-colors group"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate group-hover:text-primary-600">
                      {item.title}
                    </p>
                    {item.summary && (
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{item.summary}</p>
                    )}
                  </div>
                  <div className="shrink-0 ml-4 flex items-center gap-3 text-xs text-gray-400">
                    {item.attachments && Array.isArray(item.attachments) && item.attachments.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Paperclip className="w-3 h-3" />
                        {item.attachments.length}
                      </span>
                    )}
                    <span>{item.publishedAt ? formatRelativeDate(item.publishedAt) : ''}</span>
                  </div>
                </Link>
              ))}
            </div>
          </PageContainer>
        </section>
      )}

      {/* 최근 포럼 글 */}
      {recentPosts.length > 0 && (
        <section className="py-12 bg-white">
          <PageContainer>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary-600" />
                <h2 className="text-xl font-bold text-gray-900">최근 포럼 글</h2>
              </div>
              <Link
                to="/forum"
                className="inline-flex items-center text-sm font-medium text-primary-600 hover:text-primary-700"
              >
                포럼 보기
                <ArrowRight className="ml-1 w-4 h-4" />
              </Link>
            </div>
            <div className="space-y-2">
              {recentPosts.map(post => (
                <Link
                  key={post.id}
                  to={`/forum/post/${post.slug}`}
                  className="flex items-center justify-between p-4 rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate group-hover:text-primary-600">
                      {post.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {getAuthorName(post)} · {formatRelativeDate(post.publishedAt || post.createdAt)}
                    </p>
                  </div>
                  <div className="shrink-0 ml-4 flex items-center gap-3 text-xs text-gray-400">
                    {post.commentCount > 0 && (
                      <span className="flex items-center gap-1">
                        <MessageCircle className="w-3 h-3" />
                        {post.commentCount}
                      </span>
                    )}
                    {post.likeCount > 0 && (
                      <span className="flex items-center gap-1">
                        <Heart className="w-3 h-3" />
                        {post.likeCount}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </PageContainer>
        </section>
      )}

      {/* 인기 포럼 카테고리 */}
      {popularCategories.length > 0 && (
        <section className="py-12 bg-gray-50">
          <PageContainer>
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="w-5 h-5 text-primary-600" />
              <h2 className="text-xl font-bold text-gray-900">인기 포럼</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {popularCategories.map(cat => (
                <Link
                  key={cat.id}
                  to="/forum"
                  className="p-5 bg-white rounded-xl border border-gray-200 hover:border-primary-300 hover:shadow-sm transition-all group"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{cat.iconUrl || '💬'}</span>
                    <h3 className="text-sm font-semibold text-gray-900 group-hover:text-primary-600">
                      {cat.name}
                    </h3>
                  </div>
                  {cat.description && (
                    <p className="text-xs text-gray-500 mb-3 line-clamp-2">{cat.description}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span>글 {cat.postCount}개</span>
                    {cat.postCount7d > 0 && (
                      <span className="px-1.5 py-0.5 bg-primary-50 text-primary-600 rounded text-[10px] font-medium">
                        +{cat.postCount7d} 이번 주
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </PageContainer>
        </section>
      )}

      {/* 커뮤니티 통계 */}
      {(totalPosts7d > 0 || totalComments7d > 0) && (
        <section className="py-12 bg-white">
          <PageContainer>
            <div className="flex items-center gap-2 mb-6">
              <Layers className="w-5 h-5 text-primary-600" />
              <h2 className="text-xl font-bold text-gray-900">이번 주 활동</h2>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-6 bg-primary-50 rounded-xl text-center">
                <MessageSquare className="w-6 h-6 text-primary-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">{totalPosts7d}</p>
                <p className="text-xs text-gray-500 mt-1">새 글</p>
              </div>
              <div className="p-6 bg-emerald-50 rounded-xl text-center">
                <MessageCircle className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">{totalComments7d}</p>
                <p className="text-xs text-gray-500 mt-1">댓글</p>
              </div>
              <div className="p-6 bg-amber-50 rounded-xl text-center">
                <Users className="w-6 h-6 text-amber-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">{activeForumCount}</p>
                <p className="text-xs text-gray-500 mt-1">활성 포럼</p>
              </div>
            </div>
          </PageContainer>
        </section>
      )}

    </div>
  );
}

// ─── Hub Content Card (WO-O4O-CONTENT-FRONTEND-ACTIVATION-V1) ───

function HubContentCard({ item }: { item: HubContentItemResponse }) {
  const img = item.thumbnailUrl || item.imageUrl || null;
  const hasLink = !!item.linkUrl;

  return (
    <div
      onClick={() => { if (hasLink) window.open(item.linkUrl!, '_blank', 'noopener'); }}
      className={`bg-white rounded-xl border border-gray-200 overflow-hidden transition-shadow group ${
        hasLink ? 'cursor-pointer hover:shadow-md' : 'opacity-80'
      }`}
    >
      {img ? (
        <div className="aspect-video bg-gray-100 overflow-hidden">
          <img
            src={img}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
      ) : (
        <div className="aspect-video bg-gray-50 flex items-center justify-center">
          <FileText className="w-8 h-8 text-gray-200" />
        </div>
      )}
      <div className="p-4">
        <div className="flex items-center gap-1.5 mb-1">
          {item.cmsType && (
            <span className="inline-block px-2 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-500 rounded">
              {item.cmsType}
            </span>
          )}
          {item.isPinned && (
            <span className="inline-block px-2 py-0.5 text-[10px] font-medium bg-primary-50 text-primary-600 rounded">
              추천
            </span>
          )}
        </div>
        <h3 className="text-sm font-semibold text-gray-900 mb-1 line-clamp-2">
          {item.title}
        </h3>
        {item.description && (
          <p className="text-xs text-gray-500 line-clamp-2 mb-2">
            {item.description}
          </p>
        )}
        <p className="text-[10px] text-gray-400">
          {new Date(item.createdAt).toLocaleDateString('ko-KR')}
        </p>
      </div>
    </div>
  );
}
