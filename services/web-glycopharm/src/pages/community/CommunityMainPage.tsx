/**
 * CommunityMainPage — GlycoPharm Community Main Page
 *
 * WO-GLYCOPHARM-COMMUNITY-MAIN-PAGE-V1
 * WO-GLYCOPHARM-COMMUNITY-FEED-DATA-INTEGRATION-V1
 * WO-O4O-CONTENT-FRONTEND-ACTIVATION-V1: 콘텐츠 카드 그리드 + 추천/최근 섹션
 *
 * Route: /community
 * Feed: /api/v1/glycopharm/forum/posts API 연동
 * Sponsors/Ads: communityApi 연동
 *
 * 섹션 순서:
 *  1. Hero (심플 타이틀 + CTA)
 *  2. 공지사항 (최신 5건, 클릭 이동)
 *  3. KPI 카드 (오늘 글 / 참여자 / 인기 카테고리)
 *  4. 인기 글 카드 (top 3 by viewCount)
 *  5. Feed (탭 + 정렬 + DataTable)
 *  6. 광고 섹션
 *  7. 콘텐츠 (최근 + 추천 카드 그리드)
 *  8. 스폰서
 *  9. 디지털 사이니지 미리보기
 * 10. 파트너 로고 슬라이드
 */

import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FileText,
  Play,
  ListMusic,
  ArrowRight,
  Image as ImageIcon,
  ExternalLink,
  MessageSquare,
  Users,
  Tag,
  Bell,
} from 'lucide-react';
import { DataTable, type Column } from '@o4o/ui';
import { HUB_PRODUCER_LABELS, type HubProducer } from '@o4o/types/hub-content';
import { apiClient } from '@/services/api';
import { communityApi, type CommunityAd, type CommunitySponsor } from '@/services/communityApi';

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

type FeedTab = '전체' | string;

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

// ─── Feed Columns ───────────────────────────────────────────

const feedColumns: Column<Record<string, any>>[] = [
  { key: 'category', title: '카테고리', dataIndex: 'category', width: '90px' },
  {
    key: 'title', title: '제목', dataIndex: 'title',
    sortable: true,
    sorter: (a, b) => String(a._title ?? '').localeCompare(String(b._title ?? '')),
  },
  { key: 'author', title: '작성자', dataIndex: 'author', width: '90px' },
  {
    key: 'views', title: '조회', dataIndex: 'views', width: '60px', align: 'center',
    sortable: true,
    sorter: (a, b) => (a._views ?? 0) - (b._views ?? 0),
  },
  {
    key: 'comments', title: '댓글', dataIndex: 'comments', width: '60px', align: 'center',
    sortable: true,
    sorter: (a, b) => (a._comments ?? 0) - (b._comments ?? 0),
  },
  {
    key: 'date', title: '날짜', dataIndex: 'date', width: '100px',
    sortable: true,
    sorter: (a, b) => String(a._date ?? '').localeCompare(String(b._date ?? '')),
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
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<FeedTab>('전체');
  const [sortBy, setSortBy] = useState<'latest' | 'popular'>('latest');

  // Feed data (from forum posts API)
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedTabs, setFeedTabs] = useState<FeedTab[]>(['전체']);

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

        // Build dynamic tabs from categories
        const cats = new Set(items.map((i) => i.category));
        setFeedTabs(['전체', ...Array.from(cats)]);
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
    // Hub content (CMS) — WO-O4O-CONTENT-FRONTEND-ACTIVATION-V1
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

  const filteredFeed = feedItems
    .filter((item) => activeTab === '전체' || item.category === activeTab)
    .sort((a, b) => {
      if (sortBy === 'popular') return b.viewCount - a.viewCount;
      return b.date.localeCompare(a.date);
    });

  // Split content into recommended (isPinned) and recent
  const recommendedContent = contentItems.filter((c) => c.isPinned).slice(0, 6);
  const recommendedIds = new Set(recommendedContent.map((c) => c.id));
  const recentContent = contentItems.filter((c) => !recommendedIds.has(c.id)).slice(0, 6);

  // KPI 집계 (feedItems 기반)
  const today = new Date().toISOString().slice(0, 10);
  const todayPosts = feedItems.filter((i) => i.date.startsWith(today)).length;
  const uniqueAuthors = new Set(feedItems.map((i) => i.author)).size;
  const topCategory = (() => {
    const counts: Record<string, number> = {};
    feedItems.forEach((i) => { counts[i.category] = (counts[i.category] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '–';
  })();

  // 공지 (category === '공지' or first 3 pinned-style items)
  const noticeItems = feedItems.filter((i) => i.category === '공지').slice(0, 5);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* ─── 1. Hero Section (스폰서 분리) ─── */}
        <section className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 leading-snug mb-2">
            약국 운영 경험을 나누고<br />바로 매장에 적용하세요
          </h1>
          <p className="text-sm text-slate-500 mb-4">
            회원 약사들의 운영 노하우, 제품 경험, 마케팅 전략을 공유하는 공간입니다.
          </p>
          <div className="flex gap-3">
            <Link
              to="/forum/write"
              className="px-5 py-2.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
            >
              글 작성
            </Link>
            <Link
              to="/education"
              className="px-5 py-2.5 text-sm font-medium text-primary-700 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
            >
              강좌 신청
            </Link>
          </div>
        </section>

        {/* ─── 2. 공지 섹션 ─── */}
        {!feedLoading && noticeItems.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-slate-500" />
                <h2 className="text-sm font-semibold text-slate-700">공지사항</h2>
              </div>
              <Link to="/forum/posts?category=공지" className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium">
                전체보기 <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
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
          </section>
        )}

        {/* ─── 3. KPI 카드 블록 ─── */}
        <section className="mb-8">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
              <MessageSquare className="w-5 h-5 mx-auto mb-2 text-primary-500" />
              <p className="text-2xl font-bold text-slate-800">{feedLoading ? '–' : todayPosts}</p>
              <p className="text-xs text-slate-500 mt-0.5">오늘 글</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
              <Users className="w-5 h-5 mx-auto mb-2 text-blue-500" />
              <p className="text-2xl font-bold text-slate-800">{feedLoading ? '–' : uniqueAuthors}</p>
              <p className="text-xs text-slate-500 mt-0.5">참여자</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
              <Tag className="w-5 h-5 mx-auto mb-2 text-emerald-500" />
              <p className="text-lg font-bold text-slate-800 truncate">{feedLoading ? '–' : topCategory}</p>
              <p className="text-xs text-slate-500 mt-0.5">인기 카테고리</p>
            </div>
          </div>
        </section>

        {/* ─── 4. 인기 글 카드 (top 3 by viewCount) ─── */}
        {!feedLoading && filteredFeed.length > 0 && (() => {
          const hotPosts = [...feedItems].sort((a, b) => b.viewCount - a.viewCount).slice(0, 3);
          return (
            <section className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-slate-700">인기 글</h2>
                <Link to="/forum/posts" className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium">
                  전체보기 <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
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
            </section>
          );
        })()}

        {/* ─── 5. Feed Section ─── */}
        <section className="mb-10">
          {/* Tabs */}
          <div className="flex items-center gap-1 border-b border-slate-200 mb-3 overflow-x-auto">
            {feedTabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Sort */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setSortBy('latest')}
              className={`text-xs px-2.5 py-1 rounded-full ${
                sortBy === 'latest' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500'
              }`}
            >
              최신
            </button>
            <button
              onClick={() => setSortBy('popular')}
              className={`text-xs px-2.5 py-1 rounded-full ${
                sortBy === 'popular' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500'
              }`}
            >
              인기
            </button>
          </div>

          {/* Feed Table */}
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <DataTable
              columns={feedColumns}
              loading={feedLoading}
              dataSource={filteredFeed.map((item) => ({
                id: item.id,
                category: (
                  <span className="inline-flex items-center px-1.5 py-0.5 text-[11px] font-medium rounded bg-slate-100 text-slate-600">
                    {item.category}
                  </span>
                ),
                title: <span className="text-sm text-slate-800">{item.title}</span>,
                author: <span className="text-xs text-slate-500">{item.author}</span>,
                views: <span className="text-xs text-slate-400">{item.viewCount}</span>,
                comments: <span className="text-xs text-slate-400">{item.commentCount}</span>,
                date: <span className="text-xs text-slate-400">{formatFeedDate(item.date)}</span>,
                _title: item.title,
                _views: item.viewCount,
                _comments: item.commentCount,
                _date: item.date,
              }))}
              rowKey="id"
              emptyText="게시물이 없습니다."
              onRowClick={(row) => navigate(`/forum/posts/${row.id}`)}
            />
            {!feedLoading && filteredFeed.length === 0 && (
              <div className="py-4 text-center">
                <Link
                  to="/forum/write"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
                >
                  첫 글 작성하기
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* ─── 5. Ads Section ─── */}
        {ads.length > 0 && (
          <section className="mb-10">
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

        {/* ─── 6. Content Section (WO-O4O-CONTENT-FRONTEND-ACTIVATION-V1) ─── */}
        <section className="mb-10">
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

        {/* ─── 7. Sponsors Section ─── */}
        {sponsors.length > 0 && (
          <section className="mb-10">
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

        {/* ─── 8. Digital Signage Preview ─── */}
        <section className="mb-10">
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
                        <button
                          onClick={() => navigate(`/signage?mediaId=${media.id}`)}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-primary-600 bg-primary-50 rounded-md hover:bg-primary-100 transition-colors shrink-0"
                        >
                          매장에 적용 <ArrowRight className="w-3 h-3" />
                        </button>
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

        {/* ─── 9. Partner Logo Slide ─── */}
        <section className="mb-6 overflow-hidden">
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
