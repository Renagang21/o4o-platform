/**
 * HubContentPage — K-Cosmetics 콘텐츠/자료 탐색 (StoreHub 내부)
 *
 * WO-O4O-STOREHUB-STRUCTURE-ALIGNMENT-V1: wrapper page 초기 추가
 * WO-O4O-KCOSMETICS-STORE-HUB-CONTENT-CANONICAL-ALIGNMENT-V1:
 *   GlycoPharm HubContentListPage canonical 패턴 이식.
 *   - ContentHubTemplate (@o4o/shared-space-ui)
 *   - hubContentApi (SERVICE_KEY='k-cosmetics', @/lib/api/hubContent)
 *   - dashboardCopyApi (sourceType='hub_content', @/lib/api/dashboardCopy)
 *   - /library/content 단순 이탈 wrapper 제거
 *
 * /store-hub/content 진입점 — CMS 콘텐츠 목록 탐색 + 내 매장에 복사.
 */

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Image as ImageIcon, Check, Loader2, Download, ExternalLink } from 'lucide-react';
import { ContentHubTemplate, type ContentHubConfig, type ContentHubItem, type ContentHubItemContext } from '@o4o/shared-space-ui';
import { hubContentApi, type HubContentItemResponse } from '@/lib/api/hubContent';
import { dashboardCopyApi } from '@/lib/api/dashboardCopy';
import { useAuth } from '@/contexts/AuthContext';

// ─── Adapter ──────────────────────────────────────────────────────────────────

function apiItemToContentHubItem(item: HubContentItemResponse): ContentHubItem {
  return {
    id: item.id,
    title: item.title,
    summary: item.description,
    thumbnail: item.thumbnailUrl || item.imageUrl,
    href: item.linkUrl || null,
    type: item.cmsType || null,
    date: item.createdAt
      ? new Date(item.createdAt).toLocaleDateString('ko-KR', {
          year: 'numeric', month: 'short', day: 'numeric',
        })
      : null,
    createdBy: item.authorId ?? null,
  };
}

// ─── Content Card (K-Cosmetics layout) ───────────────────────────────────────

function KCosContentCard({ item, ctx }: { item: ContentHubItem; ctx: ContentHubItemContext }) {
  const isCopying = ctx.copyingId === item.id;
  const alreadyCopied = ctx.copiedIds.has(item.id);

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden transition-all hover:shadow-md hover:border-pink-200">
      {item.thumbnail ? (
        <div className="aspect-[16/9] bg-slate-100 overflow-hidden">
          <img
            src={item.thumbnail}
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
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {item.type && (
              <span className="inline-block px-2 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-500 rounded mb-1.5">
                {item.type}
              </span>
            )}
            <h3 className="text-sm font-semibold text-slate-800 line-clamp-2">{item.title}</h3>
            {item.summary && (
              <p className="text-xs text-slate-500 mt-1 line-clamp-2">{item.summary}</p>
            )}
          </div>
          {item.href && <ExternalLink className="w-3.5 h-3.5 text-slate-300 shrink-0 mt-0.5" />}
        </div>

        <div className="flex items-center justify-between mt-2">
          <p className="text-[10px] text-slate-400">{item.date}</p>
          {ctx.onCopy && (
            <button
              onClick={(e) => { e.stopPropagation(); ctx.onCopy!(item); }}
              disabled={alreadyCopied || isCopying}
              className={`inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded transition-colors ${
                alreadyCopied
                  ? 'bg-slate-100 text-slate-400 cursor-default'
                  : isCopying
                    ? 'bg-slate-100 text-slate-400 cursor-wait'
                    : 'bg-pink-50 text-pink-600 hover:bg-pink-100'
              }`}
            >
              {alreadyCopied ? (
                <><Check className="w-3 h-3" /> {ctx.copiedLabel}</>
              ) : isCopying ? (
                <><Loader2 className="w-3 h-3 animate-spin" /> {ctx.copyingLabel}</>
              ) : (
                <><Download className="w-3 h-3" /> {ctx.copyLabel}</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function KCosCardGrid(items: ContentHubItem[], ctx: ContentHubItemContext) {
  if (items.length === 0) {
    return (
      <div className="text-center py-20">
        <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <p className="text-sm text-slate-400">등록된 콘텐츠가 없습니다.</p>
      </div>
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {items.map(item => <KCosContentCard key={item.id} item={item} ctx={ctx} />)}
    </div>
  );
}

// ─── K-Cosmetics Content Hub Config ──────────────────────────────────────────

function useKCosContentHubConfig(userId?: string): ContentHubConfig {
  return useMemo(() => ({
    serviceKey: 'k-cosmetics',

    heroTitle: '매장에서 바로 쓰는 콘텐츠',
    heroDesc: 'K-Cosmetics 매장을 위한 콘텐츠 라이브러리',
    searchPlaceholder: '콘텐츠 검색',

    filters: [
      { key: 'all',       label: '전체' },
      { key: 'notice',    label: '공지' },
      { key: 'guide',     label: '가이드' },
      { key: 'knowledge', label: '지식' },
      { key: 'promo',     label: '프로모션' },
      { key: 'news',      label: '뉴스' },
    ],

    pageLimit: 12,

    fetchItems: async ({ filter, search, page, limit }) => {
      try {
        const data = await hubContentApi.list({
          sourceDomain: 'cms',
          type: filter !== 'all' ? filter : undefined,
          search: search || undefined,
          page,
          limit,
        });
        const list = Array.isArray(data?.data) ? data.data : [];
        return {
          items: list.map(apiItemToContentHubItem),
          total: data?.pagination?.total ?? list.length,
        };
      } catch {
        return { items: [], total: 0 };
      }
    },

    loadCopiedIds: async () => {
      if (!userId) return new Set<string>();
      try {
        const ids = await dashboardCopyApi.getCopiedSourceIds(userId);
        return new Set<string>(ids);
      } catch {
        return new Set<string>();
      }
    },

    onCopy: async (item) => {
      if (!userId) return;
      await dashboardCopyApi.copyAsset({
        sourceType: 'hub_content',
        sourceId: item.id,
        targetDashboardId: userId,
      });
    },

    copyLabel: '내 매장으로',
    copiedLabel: '가져옴',
    copyingLabel: '복사 중',

    renderItems: KCosCardGrid,

    infoLinks: [{ label: '내 콘텐츠 관리', href: '/store-hub/content' }],
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [userId]);
}

// ─── Page Component ───────────────────────────────────────────────────────────

export function HubContentPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  void navigate; // navigate 미사용 경고 방지
  const config = useKCosContentHubConfig(user?.id);
  return <ContentHubTemplate config={config} />;
}

export default HubContentPage;
