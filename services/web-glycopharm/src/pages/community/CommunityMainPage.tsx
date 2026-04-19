/**
 * CommunityMainPage — GlycoPharm Community Main Page
 *
 * WO-GLYCOPHARM-COMMUNITY-MAIN-PAGE-V1
 * WO-GLYCOPHARM-COMMUNITY-FEED-DATA-INTEGRATION-V1
 * WO-O4O-CONTENT-FRONTEND-ACTIVATION-V1: 콘텐츠 카드 그리드 + 추천/최근 섹션
 * WO-GLYCOPHARM-HOME-REBASE-TO-KPA-FRAME-V1: Shared Space Frame 기준 재구성
 *
 * Route: /community
 *
 * 섹션 순서 (Shared Space Frame):
 *  1. Hero / Summary (경영 지원형 환영 + CTA 3개)
 *  2. News / Notices (공지 | 약업신문 탭)
 *  3. Activity (인기 글 3 + 최근 글 5 요약)
 *  4. App Entry (4개 서비스 카드)
 *  5. Content Highlight (최근 + 추천 콘텐츠)
 *  6. Signage Preview (사이니지 미디어 + 플레이리스트)
 *  7. CTA / Guidance (하단 CTA 카드)
 *  8. Utility (광고 + 스폰서 + 파트너 로고)
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Play,
  ListMusic,
  ArrowRight,
  Image as ImageIcon,
  ExternalLink,
  Bell,
  MessageSquare,
  BookOpen,
  Newspaper,
} from 'lucide-react';
import { HUB_PRODUCER_LABELS, type HubProducer } from '@o4o/types/hub-content';
import { apiClient } from '@/services/api';
import { communityApi, type CommunityAd, type CommunitySponsor } from '@/services/communityApi';
import { useAuth } from '@/contexts/AuthContext';

// ─── Types ──────────────────────────────────────────────────

interface ForumPostRaw {
  id: string;
  title: string;
  author?: { name?: string; email?: string } | null;
  category?: { name?: string } | null;
  viewCount: number;
  commentCount: number;
  createdAt: string;
}

interface FeedItem {
  id: string;
  title: string;
  author: string;
  category: string;
  viewCount: number;
  commentCount: number;
  date: string;
}

interface HubContentItem {
  id: string;
  title: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  imageUrl?: string | null;
  linkUrl?: string | null;
  cmsType?: string | null;
  isPinned?: boolean;
  producer?: string;
  createdAt: string;
}

// ─── Hub Signage Types ─────────────────────────────────────

interface HubSignageMedia {
  id: string;
  title: string;
  mediaType?: string;
  thumbnailUrl?: string | null;
}

interface HubSignagePlaylist {
  id: string;
  name: string;
  itemCount?: number;
}

const partnerLogos = [
  { id: '1', name: 'Partner A' },
  { id: '2', name: 'Partner B' },
  { id: '3', name: 'Partner C' },
  { id: '4', name: 'Partner D' },
  { id: '5', name: 'Partner E' },
  { id: '6', name: 'Partner F' },
  { id: '7', name: 'Partner G' },
  { id: '8', name: 'Partner H' },
];

// ─── App Entry Data ──────────────────────────────────────────

const appEntryCards = [
  {
    title: '약사 포럼',
    description: '동료 약사와 운영 노하우를 공유하세요',
    href: '/forum',
    icon: MessageSquare,
  },
  {
    title: '콘텐츠 허브',
    description: '매장 운영에 유용한 콘텐츠를 확인하세요',
    href: '/library/content',
    icon: FileText,
  },
  {
    title: '디지털 사이니지',
    description: '약국 디지털 미디어를 관리하세요',
    href: '/signage',
    icon: Play,
  },
  {
    title: '강좌',
    description: '전문 강좌를 온라인으로 수강하세요',
    href: '/education',
    icon: BookOpen,
  },
];

function formatFeedDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ─── Content Card ───────────────────────────────────────────

function ContentCard({ item }: { item: HubContentItem }) {
  const img = item.thumbnailUrl || item.imageUrl || null;
  const hasLink = !!item.linkUrl;

  return (
    <div
      onClick={() => { if (hasLink) window.open(item.linkUrl!, '_blank', 'noopener'); }}
      className={`bg-white rounded-lg border border-slate-200 overflow-hidden transition-all ${
        hasLink ? 'cursor-pointer hover:shadow-md hover:border-primary-200' : 'opacity-80'
      }`}
    >
      {img ? (
        <div className="aspect-[16/9] bg-slate-100 overflow-hidden">
          <img
            src={img}
            alt={item.title}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
      ) : (
        <div className="aspect-[16/9] bg-slate-50 flex items-center justify-center">
          <ImageIcon className="w-8 h-8 text-slate-200" />
        </div>
      )}
      <div className="p-3">
        <div className="flex items-center gap-1.5 mb-1.5">
          {item.cmsType && (
            <span className="inline-block px-2 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-500 rounded">
              {item.cmsType}
            </span>
          )}
          {item.isPinned && (
            <span className="inline-block px-2 py-0.5 text-[10px] font-medium bg-primary-50 text-primary-600 rounded">
              추천
            </span>
          )}
        </div>
        <h3 className="text-sm font-semibold text-slate-800 line-clamp-2 mb-1">{item.title}</h3>
        {item.description && (
          <p className="text-xs text-slate-500 line-clamp-2 mb-1.5">{item.description}</p>
        )}
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-slate-400">{formatFeedDate(item.createdAt)}</span>
          <div className="flex items-center gap-1">
            {item.producer && (
              <span className="text-[10px] text-slate-400">
                {HUB_PRODUCER_LABELS[item.producer as HubProducer] ?? item.producer}
              </span>
            )}
            {hasLink && <ExternalLink className="w-3 h-3 text-slate-300" />}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────

export default function CommunityMainPage() {
  const { isAuthenticated, user } = useAuth();

  // News tab
  const [newsTab, setNewsTab] = useState<'notices' | 'yakup'>('notices');

  // Feed data (from forum posts API)
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);

  // Sponsors & Ads (from communityApi)
  const [sponsors, setSponsors] = useState<CommunitySponsor[]>([]);
  const [ads, setAds] = useState<CommunityAd[]>([]);

  // Content (from hub content API)
  const [contentItems, setContentItems] = useState<HubContentItem[]>([]);
  const [contentLoading, setContentLoading] = useState(true);

  // Signage (from hub content API — signage domain)
  const [signageMedia, setSignageMedia] = useState<HubSignageMedia[]>([]);
  const [signagePlaylists, setSignagePlaylists] = useState<HubSignagePlaylist[]>([]);
  const [signageLoading, setSignageLoading] = useState(true);

  const loadFeed = useCallback(async () => {
    setFeedLoading(true);
    try {
      const res = await apiClient.get<ForumPostRaw[]>('/api/v1/glycopharm/forum/posts?limit=30');
      if (Array.isArray(res.data)) {
        const items: FeedItem[] = res.data.map((raw) => ({
          id: raw.id,
          title: raw.title || '(제목 없음)',
          author: raw.author?.name || raw.author?.email?.split('@')[0] || '익명',
          category: raw.category?.name || '일반',
          viewCount: raw.viewCount || 0,
          commentCount: raw.commentCount || 0,
          date: raw.createdAt,
        }));
        setFeedItems(items);
      }
    } catch {
      setFeedItems([]);
    } finally {
      setFeedLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFeed();
    communityApi.getSponsors().then((r) => setSponsors(r.data?.sponsors ?? [])).catch(() => {});
    communityApi.getPageAds().then((r) => setAds(r.data?.ads ?? [])).catch(() => {});
    // Hub content (CMS)
    apiClient.get<{ data: HubContentItem[] }>('/api/v1/hub/contents?serviceKey=glycopharm&sourceDomain=cms&limit=50')
      .then((res) => {
        const items = Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
        setContentItems(items);
      })
      .catch(() => setContentItems([]))
      .finally(() => setContentLoading(false));
    // Hub signage (media + playlists)
    Promise.all([
      apiClient.get<{ data: HubSignageMedia[] }>('/api/v1/hub/contents?serviceKey=glycopharm&sourceDomain=signage-media&limit=4')
        .then((res) => {
          const items = Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
          setSignageMedia(items);
        })
        .catch(() => setSignageMedia([])),
      apiClient.get<{ data: HubSignagePlaylist[] }>('/api/v1/hub/contents?serviceKey=glycopharm&sourceDomain=signage-playlist&limit=4')
        .then((res) => {
          const items = Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
          setSignagePlaylists(items);
        })
        .catch(() => setSignagePlaylists([])),
    ]).finally(() => setSignageLoading(false));
  }, [loadFeed]);

  // 공지 (category === '공지')
  const noticeItems = feedItems.filter((i) => i.category === '공지').slice(0, 5);

  // 인기 글 Top 3
  const hotPosts = [...feedItems].sort((a, b) => b.viewCount - a.viewCount).slice(0, 3);

  // 최근 글 5개
  const recentPosts = [...feedItems].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);

  // Split content into recommended (isPinned) and recent
  const recommendedContent = contentItems.filter((c) => c.isPinned).slice(0, 6);
  const recommendedIds = new Set(recommendedContent.map((c) => c.id));
  const recentContent = contentItems.filter((c) => !recommendedIds.has(c.id)).slice(0, 6);

  // Hero greeting
  const greeting = isAuthenticated && user?.name
    ? `${user.name}님, 환영합니다`
    : '약국 경영 지원 서비스에 오신 것을 환영합니다';

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 py-6 flex flex-col gap-8">

        {/* ─── 1. Hero / Summary ─── */}
        <section className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm">
          <h1 className="text-lg font-semibold text-slate-900 mb-1">{greeting}</h1>
          <p className="text-sm text-slate-500 mb-4">
            매장 운영에 필요한 정보와 콘텐츠를 한 곳에서 확인하세요
          </p>
          <div className="flex gap-2 flex-wrap">
            <Link
              to="/forum"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:border-primary-200 hover:text-primary-600 transition-all"
            >
              <MessageSquare className="w-4 h-4" />
              포럼 참여
            </Link>
            <Link
              to="/library/content"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:border-primary-200 hover:text-primary-600 transition-all"
            >
              <FileText className="w-4 h-4" />
              콘텐츠 보기
            </Link>
            <Link
              to="/signage"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:border-primary-200 hover:text-primary-600 transition-all"
            >
              <Play className="w-4 h-4" />
              사이니지 관리
            </Link>
          </div>
        </section>

        {/* ─── 2. News / Notices (탭) ─── */}
        <section>
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setNewsTab('notices')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                newsTab === 'notices'
                  ? 'bg-primary-600 text-white'
                  : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              공지사항
            </button>
            <button
              onClick={() => setNewsTab('yakup')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                newsTab === 'yakup'
                  ? 'bg-primary-600 text-white'
                  : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              약업신문
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl min-h-[200px]">
            {newsTab === 'notices' ? (
              feedLoading ? (
                <div className="px-4 py-8 text-center text-sm text-slate-400">불러오는 중...</div>
              ) : noticeItems.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-sm text-slate-500">아직 등록된 공지가 없습니다.</p>
                  <p className="text-xs text-slate-400 mt-1">새 소식이 등록되면 여기에 표시됩니다.</p>
                </div>
              ) : (
                <>
                  <div className="divide-y divide-slate-100">
                    {noticeItems.map((item) => (
                      <Link
                        key={item.id}
                        to={`/forum/posts/${item.id}`}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
                      >
                        <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-medium bg-primary-50 text-primary-600 rounded">공지</span>
                        <span className="flex-1 text-sm text-slate-700 truncate">{item.title}</span>
                        <span className="text-xs text-slate-400 shrink-0">{formatFeedDate(item.date)}</span>
                      </Link>
                    ))}
                  </div>
                  <div className="px-4 py-2 text-right">
                    <Link to="/forum/posts?category=공지" className="text-xs text-primary-600 hover:text-primary-700 font-medium">
                      전체 보기 →
                    </Link>
                  </div>
                </>
              )
            ) : (
              /* 약업신문 CTA */
              <div className="flex flex-col items-center justify-center py-10 px-4">
                <Newspaper className="w-8 h-8 text-slate-400 mb-3" />
                <p className="text-sm font-medium text-slate-700 mb-3">
                  약업신문에서 업계 소식을 확인하세요
                </p>
                <a
                  href="https://www.yakup.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-semibold text-primary-600 hover:text-primary-700"
                >
                  약업신문 바로가기 →
                </a>
              </div>
            )}
          </div>
        </section>

        {/* ─── 3. Activity (인기 글 + 최근 글) ─── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-slate-800">최근 활동</h2>
            <Link to="/forum/posts" className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium">
              전체보기 <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {feedLoading ? (
            <div className="bg-white rounded-xl border border-slate-200 px-4 py-8 text-center text-sm text-slate-400">
              불러오는 중...
            </div>
          ) : feedItems.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 px-4 py-8 text-center">
              <p className="text-sm text-slate-500 mb-2">아직 게시물이 없습니다.</p>
              <Link
                to="/forum/write"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
              >
                첫 글 작성하기
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {/* 인기 글 Top 3 */}
              {hotPosts.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-2">인기 글</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {hotPosts.map((item, idx) => (
                      <Link
                        key={item.id}
                        to={`/forum/posts/${item.id}`}
                        className="bg-white border border-slate-200 rounded-xl p-4 hover:border-primary-200 hover:shadow-sm transition-all"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className="shrink-0 w-5 h-5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded bg-slate-100 text-slate-500">
                            {item.category}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-slate-800 line-clamp-2 mb-2">{item.title}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-400">{item.author}</span>
                          <span className="text-[10px] text-slate-400">조회 {item.viewCount}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* 최근 글 5개 */}
              {recentPosts.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-2">최근 글</p>
                  <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
                    {recentPosts.map((item) => (
                      <Link
                        key={item.id}
                        to={`/forum/posts/${item.id}`}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
                      >
                        <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-medium rounded bg-slate-100 text-slate-500">
                          {item.category}
                        </span>
                        <span className="flex-1 text-sm text-slate-700 truncate">{item.title}</span>
                        <span className="text-xs text-slate-400 shrink-0">{formatFeedDate(item.date)}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* ─── 4. App Entry (서비스 바로가기) ─── */}
        <section>
          <div className="mb-3">
            <h2 className="text-lg font-bold text-slate-800">서비스 바로가기</h2>
            <p className="text-sm text-slate-500 mt-0.5">각 서비스로 바로 이동하세요</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {appEntryCards.map((card) => {
              const Icon = card.icon;
              return (
                <Link
                  key={card.href}
                  to={card.href}
                  className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-xl hover:border-slate-300 hover:shadow-sm transition-all"
                >
                  <Icon className="w-6 h-6 text-slate-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-medium text-slate-800">{card.title}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{card.description}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300 shrink-0" />
                </Link>
              );
            })}
          </div>
        </section>

        {/* ─── 5. Content Highlight ─── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800">콘텐츠</h2>
            <Link to="/library/content" className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium">
              전체보기 <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {contentLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600" />
            </div>
          ) : contentItems.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-400">등록된 콘텐츠가 없습니다.</p>
            </div>
          ) : (
            <>
              {/* 최근 콘텐츠 */}
              {recentContent.length > 0 && (
                <div className="mb-6">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">최근 콘텐츠</p>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {recentContent.map((item) => (
                      <ContentCard key={item.id} item={item} />
                    ))}
                  </div>
                </div>
              )}

              {/* 추천 콘텐츠 */}
              {recommendedContent.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">추천 콘텐츠</p>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {recommendedContent.map((item) => (
                      <ContentCard key={item.id} item={item} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        {/* ─── 6. Signage Preview ─── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-slate-800">디지털 사이니지</h2>
            <Link to="/signage" className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium">
              사이니지 관리 <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {signageLoading ? (
            <div className="bg-white rounded-lg border border-slate-200 px-4 py-8 text-center text-xs text-slate-400">
              사이니지 정보를 불러오는 중...
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Media */}
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">영상</p>
                <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100">
                  {signageMedia.length === 0 ? (
                    <div className="px-4 py-4 text-center text-xs text-slate-400">등록된 사이니지 미디어가 없습니다.</div>
                  ) : (
                    signageMedia.map((media) => (
                      <div
                        key={media.id}
                        className="flex items-center gap-2 px-4 py-3 hover:bg-slate-50 transition-colors"
                      >
                        <Play className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="text-sm text-slate-700 truncate flex-1">{media.title}</span>
                        <Link
                          to={`/signage?mediaId=${media.id}`}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-primary-600 bg-primary-50 rounded-md hover:bg-primary-100 transition-colors shrink-0"
                        >
                          매장에 적용 <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Playlists */}
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">플레이리스트</p>
                <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100">
                  {signagePlaylists.length === 0 ? (
                    <div className="px-4 py-4 text-center text-xs text-slate-400">플레이리스트가 없습니다.</div>
                  ) : (
                    signagePlaylists.map((p) => (
                      <div key={p.id} className="flex items-center gap-2 px-4 py-3">
                        <ListMusic className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="text-sm text-slate-700 truncate flex-1">{p.name}</span>
                        {p.itemCount != null && (
                          <span className="text-xs text-slate-400 shrink-0">{p.itemCount}개</span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ─── 7. CTA / Guidance ─── */}
        <section>
          <Link
            to="/signage"
            className="flex items-center gap-4 p-5 bg-white border border-slate-100 border-l-[3px] border-l-emerald-500 rounded-xl shadow-sm hover:border-slate-300 hover:shadow-md transition-all"
          >
            <div className="shrink-0 w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
              <Play className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800">매장 운영에 도움이 필요하세요?</p>
              <p className="text-xs text-slate-500 mt-0.5">디지털 사이니지로 약국을 꾸며보세요</p>
            </div>
            <span className="text-xs font-semibold text-emerald-600 shrink-0 whitespace-nowrap">
              사이니지 보기 →
            </span>
          </Link>
        </section>

        {/* ─── 8. Utility ─── */}

        {/* 광고 */}
        {ads.length > 0 && (
          <section>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {ads.map((ad) => (
                <a
                  key={ad.id}
                  href={ad.linkUrl ?? undefined}
                  className="block p-5 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-colors"
                >
                  <p className="text-sm font-semibold text-slate-800 mb-1">{ad.title}</p>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* 스폰서 */}
        {sponsors.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-700">스폰서</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {sponsors.map((sp) => (
                <a
                  key={sp.id}
                  href={sp.linkUrl ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center px-4 py-3 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-colors"
                >
                  {sp.logoUrl ? (
                    <img src={sp.logoUrl} alt={sp.name} className="h-6 object-contain" />
                  ) : (
                    <span className="text-xs font-medium text-slate-500">{sp.name}</span>
                  )}
                </a>
              ))}
            </div>
          </section>
        )}

        {/* 파트너 로고 슬라이드 */}
        <section className="overflow-hidden">
          <div className="relative group">
            <div className="flex animate-marquee group-hover:[animation-play-state:paused]">
              {[...partnerLogos, ...partnerLogos].map((logo, idx) => (
                <div
                  key={`${logo.id}-${idx}`}
                  className="flex items-center justify-center w-28 h-12 mx-3 bg-white border border-slate-200 rounded-lg shrink-0"
                >
                  <span className="text-xs text-slate-400 font-medium">{logo.name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
