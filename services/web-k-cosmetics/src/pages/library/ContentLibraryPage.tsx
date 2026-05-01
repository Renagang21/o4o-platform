/**
 * ContentLibraryPage — K-Cosmetics 콘텐츠 라이브러리
 *
 * WO-O4O-COMMONIZATION-REFINEMENT-V1
 * WO-O4O-CONTENT-LIBRARY-CARD-STANDARD-V1: inline style → Tailwind, hex → theme, Card 적용
 *
 * ContentHubTemplate + k-cosmetics config-adapter.
 * Route: /library/content
 */

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ContentHubTemplate,
  type ContentHubConfig,
  type ContentHubItem,
  type ContentHubItemContext,
} from '@o4o/shared-space-ui';
import { hubContentApi, type HubContentItemResponse } from '../../lib/api/hubContent';
import { dashboardCopyApi } from '../../lib/api/dashboardCopy';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '@o4o/ui';

// ─── Adapter ──────────────────────────────────────────────────────────────────

function apiItemToContentHubItem(item: HubContentItemResponse): ContentHubItem {
  return {
    id: item.id,
    title: item.title,
    summary: item.description,
    thumbnail: item.thumbnailUrl || item.imageUrl,
    href: item.linkUrl,
    type: item.cmsType,
    date: item.createdAt
      ? new Date(item.createdAt).toLocaleDateString('ko-KR', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      : null,
    isPinned: item.isPinned,
  };
}

// ─── Card Grid Renderer ───────────────────────────────────────────────────────

function CardGrid({ items, ctx }: { items: ContentHubItem[]; ctx: ContentHubItemContext }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {items.map((item) => {
        const isCopied = ctx.copiedIds.has(item.id);
        const isCopying = ctx.copyingId === item.id;
        return (
          <Card
            key={item.id}
            onClick={() => item.href && window.open(item.href, '_blank', 'noopener')}
            className={`overflow-hidden ${item.href ? 'cursor-pointer' : 'cursor-default'}`}
          >
            {item.thumbnail ? (
              <div className="w-full h-[140px] bg-slate-50 overflow-hidden">
                <img
                  src={item.thumbnail}
                  alt={item.title}
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
            ) : (
              <div className="w-full h-[140px] bg-slate-50 flex items-center justify-center">
                <span className="text-[32px] text-slate-200">📄</span>
              </div>
            )}
            <div className="px-3.5 pt-2.5 pb-3">
              <div className="flex gap-1 mb-1.5">
                {item.type && <span className="inline-block px-1.5 py-px text-[10px] font-medium bg-slate-100 text-slate-500 rounded">{item.type}</span>}
                {item.isPinned && <span className="inline-block px-1.5 py-px text-[10px] font-medium bg-primary-50 text-primary rounded">추천</span>}
              </div>
              <p className="text-sm font-semibold text-slate-800 mb-1 mt-0 overflow-hidden text-ellipsis line-clamp-2">{item.title}</p>
              {item.summary && <p className="text-xs text-slate-400 mb-1.5 mt-0 overflow-hidden text-ellipsis line-clamp-2">{item.summary}</p>}
              <div className="flex items-center justify-between mt-1">
                <p className="text-[10px] text-slate-300 m-0">{item.date}</p>
                <button
                  onClick={(e) => { e.stopPropagation(); ctx.onCopy(item); }}
                  disabled={isCopied || isCopying}
                  className={`inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-medium rounded border-none cursor-pointer ${
                    isCopied || isCopying
                      ? 'bg-slate-50 text-slate-300 cursor-default'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {isCopied ? ctx.copiedLabel : isCopying ? ctx.copyingLabel : ctx.copyLabel}
                </button>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// ─── Page Component ───────────────────────────────────────────────────────────

export default function ContentLibraryPage() {
  const { user } = useAuth();
  const userId = user?.id;

  const config: ContentHubConfig = useMemo(() => ({
    serviceKey: 'k-cosmetics',
    heroTitle: '콘텐츠 라이브러리',
    heroDesc: 'K-Cosmetics 콘텐츠를 한눈에 확인하세요',
    headerAction: (
      <Link to="/community" className="text-[13px] text-slate-500 no-underline hover:underline">
        ← 커뮤니티
      </Link>
    ),
    searchPlaceholder: '콘텐츠 검색',
    filters: [
      { key: 'all', label: '전체' },
      { key: 'notice', label: '공지' },
      { key: 'guide', label: '가이드' },
      { key: 'knowledge', label: '지식' },
      { key: 'promo', label: '프로모션' },
      { key: 'news', label: '뉴스' },
    ],
    pageLimit: 12,

    fetchItems: async ({ filter, search, page, limit }) => {
      try {
        const res = await hubContentApi.list({
          sourceDomain: 'cms',
          type: filter !== 'all' ? filter : undefined,
          search: search || undefined,
          page,
          limit,
        });
        return {
          items: (res?.data ?? []).map(apiItemToContentHubItem),
          total: res?.pagination?.total ?? 0,
        };
      } catch {
        return { items: [], total: 0 };
      }
    },

    loadCopiedIds: async () => {
      if (!userId) return new Set<string>();
      try {
        const ids = await dashboardCopyApi.getCopiedSourceIds(userId);
        return new Set(ids);
      } catch {
        return new Set<string>();
      }
    },

    onCopy: async (item: ContentHubItem) => {
      if (!userId) return;
      await dashboardCopyApi.copyAsset({
        sourceType: 'hub_content',
        sourceId: item.id,
        targetDashboardId: userId,
      });
    },

    copyLabel: '↓ 내 콘텐츠로',
    copiedLabel: '✓ 가져옴',
    copyingLabel: '복사 중...',

    renderItems: (items: ContentHubItem[], ctx: ContentHubItemContext) => (
      <CardGrid items={items} ctx={ctx} />
    ),

    emptyMessage: '등록된 콘텐츠가 없습니다',
    emptyFilteredMessage: '조건에 맞는 콘텐츠가 없습니다',
  }), [userId]);

  return <ContentHubTemplate config={config} />;
}
