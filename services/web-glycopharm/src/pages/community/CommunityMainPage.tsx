/**
 * CommunityMainPage — GlycoPharm Community Main Page
 *
 * WO-GLYCOPHARM-COMMUNITY-MAIN-PAGE-V1
 * WO-GLYCOPHARM-COMMUNITY-FEED-DATA-INTEGRATION-V1
 *
 * Route: /community
 * Feed: /api/v1/glycopharm/forum/posts API 연동
 * Sponsors/Ads: communityApi 연동
 *
 * 섹션 순서:
 *  1. Hero (스폰서 포함)
 *  2. Feed (탭 + 정렬 + DataTable)
 *  3. 광고 섹션
 *  4. 콘텐츠 미리보기
 *  5. 디지털 사이니지 미리보기
 *  6. 파트너 로고 슬라이드
 */

import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FileText,
  ChevronRight,
  Play,
  ListMusic,
  ArrowRight,
} from 'lucide-react';
import { DataTable, type Column } from '@o4o/ui';
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
  linkUrl?: string | null;
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
    // Hub content (CMS)
    apiClient.get<{ data: HubContentItem[] }>('/api/v1/hub/contents?serviceKey=glycopharm&sourceDomain=cms&limit=5')
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

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* ─── 1. Hero Section ─── */}
        <section className="mb-10">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left: Title + CTA */}
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-slate-900 leading-snug mb-3">
                약국 운영 경험을 나누고<br />바로 매장에 적용하세요
              </h1>
              <p className="text-sm text-slate-500 mb-5">
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
            </div>

            {/* Right: Sponsor Cards */}
            <div className="flex-1 flex flex-col gap-3">
              {sponsors.length > 0 ? sponsors.slice(0, 3).map((s) => (
                <a
                  key={s.id}
                  href={s.linkUrl ?? undefined}
                  className="block p-3.5 bg-white border border-slate-200 rounded-lg hover:border-primary-300 transition-colors"
                >
                  <p className="text-sm font-medium text-slate-800">{s.name}</p>
                </a>
              )) : (
                <div className="p-3.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-400 text-center">
                  스폰서 정보를 불러오는 중...
                </div>
              )}
            </div>
          </div>

          {/* Stats Bar */}
          <div className="mt-5 text-xs text-slate-400">
            오늘 글 23 &nbsp;|&nbsp; 참여자 58 &nbsp;|&nbsp; 인기: 혈당관리
          </div>
        </section>

        {/* ─── 2. Feed Section ─── */}
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
            />
          </div>
        </section>

        {/* ─── 3. Ads Section ─── */}
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

        {/* ─── 4. Content Preview ─── */}
        <section className="mb-10">
          <h2 className="text-lg font-bold text-slate-800 mb-3">매장에서 바로 쓰는 콘텐츠</h2>
          <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100">
            {contentLoading ? (
              <div className="px-4 py-6 text-center text-xs text-slate-400">콘텐츠를 불러오는 중...</div>
            ) : contentItems.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-slate-400">등록된 콘텐츠가 없습니다.</div>
            ) : (
              contentItems.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors"
                  onClick={() => {
                    if (c.linkUrl) window.open(c.linkUrl, '_blank');
                  }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="text-sm text-slate-700 truncate">{c.title}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                </div>
              ))
            )}
          </div>
          <div className="mt-3 text-center">
            <Link to="/hub/content" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
              더보기
            </Link>
          </div>
        </section>

        {/* ─── 5. Digital Signage Preview ─── */}
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

        {/* ─── 6. Partner Logo Slide ─── */}
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

